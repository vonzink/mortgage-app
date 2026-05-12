#!/usr/bin/env bash
# ============================================================================
# MSFG Mortgage App Deploy Script
#
# Runs from your laptop. SSHes into the EC2 box, pulls latest from main, builds
# the React bundle with prod env vars baked in, and rebuilds the Spring Boot
# backend container.
#
# Frontend layout: nginx on the EC2 box already points at
# /home/ubuntu/apps/mortgage-app/frontend/build, so a fresh `npm run build`
# replaces the live bundle in place. No separate copy/sync step.
#
# Backend: Spring Boot inside Docker. Flyway runs migrations on container
# start. The V15 migration was edited mid-development (partial-index → composite
# index for H2 compat), so prod's checksum won't match the new file. Use
# `--repair` ONCE to update the stored checksum before normal boot.
# ============================================================================
set -euo pipefail

# ── Config ──────────────────────────────────────────────────────────────────
EC2_HOST="${EC2_HOST:-ubuntu@52.203.186.217}"
EC2_KEY="${EC2_KEY:-/Users/zacharyzink/MSFG/Security/msfg-mortgage-key.pem}"
EC2_PROJECT_DIR="/home/ubuntu/apps/mortgage-app"

# ── Colors ──────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

# ── Flags ───────────────────────────────────────────────────────────────────
DEPLOY_FRONTEND=true
DEPLOY_BACKEND=true
DO_REPAIR=false
DO_VALIDATE=false
TAIL_LOGS=false

usage() {
  cat <<EOF
Usage: ./deploy.sh [OPTIONS]

  (no flags)        Full deploy: frontend bundle + backend container
  --frontend-only   Rebuild the frontend bundle only
  --backend-only    Rebuild + restart the backend container only
  --repair          Run \`flyway repair\` BEFORE bringing the backend up.
                    Use this once after deploying a migration whose file
                    was edited (e.g. the V15 partial-index fix). Mounts
                    the local migrations dir so checksums are recomputed
                    against the new file contents.
  --validate        Read-only — runs \`flyway validate\` and shows which
                    migration is failing. Doesn't change anything. Use
                    this BEFORE --repair to confirm what's wrong.
  --logs            After deploying, tail the backend logs.
  -h, --help        Show this help.
EOF
}

for arg in "$@"; do
  case $arg in
    --frontend-only) DEPLOY_FRONTEND=true;  DEPLOY_BACKEND=false ;;
    --backend-only)  DEPLOY_FRONTEND=false; DEPLOY_BACKEND=true  ;;
    --repair)        DO_REPAIR=true                              ;;
    --validate)      DO_VALIDATE=true; DEPLOY_FRONTEND=false; DEPLOY_BACKEND=false ;;
    --logs)          TAIL_LOGS=true                              ;;
    -h|--help)       usage; exit 0                               ;;
    *)               echo "Unknown option: $arg"; usage; exit 1  ;;
  esac
done

echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}  MSFG Mortgage App Deploy${NC}"
echo -e "${CYAN}========================================${NC}"
echo -e "  Target:  ${EC2_HOST}"
echo -e "  Dir:     ${EC2_PROJECT_DIR}"
echo ""

# ── SSH preflight ──────────────────────────────────────────────────────────
if [ ! -f "$EC2_KEY" ]; then
  echo -e "${RED}✗ SSH key not found: $EC2_KEY${NC}"
  echo "  Set EC2_KEY=<path> in the environment if it lives elsewhere."
  exit 1
fi

echo -e "${YELLOW}▸ SSH preflight…${NC}"
if ! ssh -i "$EC2_KEY" -o ConnectTimeout=5 -o StrictHostKeyChecking=accept-new \
        "$EC2_HOST" 'true' 2>/dev/null; then
  echo -e "${RED}✗ SSH connection failed${NC}"
  exit 1
fi
echo -e "${GREEN}✓ SSH OK${NC}"
echo ""

# ── Run the deploy on the remote box ───────────────────────────────────────
# Pass flags as positional args to `bash -s` (SSH doesn't forward env vars
# without server-side AcceptEnv). The heredoc body picks them up as $1..$5.
ssh -i "$EC2_KEY" "$EC2_HOST" bash -s -- \
  "$DEPLOY_FRONTEND" "$DEPLOY_BACKEND" "$DO_REPAIR" "$DO_VALIDATE" "$TAIL_LOGS" "$EC2_PROJECT_DIR" <<'REMOTE'
set -euo pipefail

DEPLOY_FRONTEND="$1"
DEPLOY_BACKEND="$2"
DO_REPAIR="$3"
DO_VALIDATE="$4"
TAIL_LOGS="$5"
PROJECT_DIR="$6"

# Frontend env vars baked into the CRA bundle at build time. Hardcoded here
# rather than passed from the laptop — they never change between deploys.
FRONTEND_ENV='
  REACT_APP_API_URL=https://app.msfgco.com/api
  REACT_APP_COGNITO_AUTHORITY=https://cognito-idp.us-west-1.amazonaws.com/us-west-1_S6iE2uego
  REACT_APP_COGNITO_REDIRECT_URI=https://app.msfgco.com/auth/callback
  REACT_APP_COGNITO_POST_LOGOUT_REDIRECT_URI=https://app.msfgco.com/
  REACT_APP_COGNITO_USER_POOL_ID=us-west-1_S6iE2uego
  REACT_APP_COGNITO_CLIENT_ID=34rg0vqoobfv8hhvg8kunkd738
  REACT_APP_COGNITO_DOMAIN=https://us-west-1s6ie2uego.auth.us-west-1.amazoncognito.com
'

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

cd "$PROJECT_DIR"

echo -e "${YELLOW}▸ Pulling latest from origin/main…${NC}"
git pull --ff-only origin main
echo -e "${GREEN}✓ Code up to date${NC}"
echo ""

# ── Frontend ─────────────────────────────────────────────────────────────
if [ "$DEPLOY_FRONTEND" = "true" ]; then
  echo -e "${YELLOW}▸ Installing frontend deps (if needed)…${NC}"
  cd frontend
  # --legacy-peer-deps because react-icons + react 18 have a known peer warning;
  # not a real conflict.
  npm install --legacy-peer-deps --no-audit --no-fund
  echo -e "${GREEN}✓ Deps OK${NC}"

  echo -e "${YELLOW}▸ Building React bundle with prod env vars…${NC}"
  # Source the env block; CRA bakes these in at build time.
  eval "export $(echo "$FRONTEND_ENV" | xargs)"
  npm run build
  echo -e "${GREEN}✓ Build complete (nginx already points at frontend/build)${NC}"
  cd "$PROJECT_DIR"
  echo ""
fi

# ── Flyway validate (read-only — show what's wrong before repairing) ───
# Helpful when Spring Boot fails to start with "Migrations have failed
# validation" and you want to know WHICH migration is the problem.
if [ "$DO_VALIDATE" = "true" ]; then
  echo -e "${YELLOW}▸ Running flyway validate (read-only)…${NC}"
  if [ ! -f deploy/.env ]; then
    echo -e "${RED}✗ deploy/.env not found — cannot connect to DB${NC}"
    exit 1
  fi
  # shellcheck disable=SC1091
  set -a; source deploy/.env; set +a

  # Mount the local migrations dir into /flyway/sql so Flyway can compute
  # checksums against the actual files (otherwise it only inspects the
  # schema_history table and can't detect file edits).
  docker run --rm --network host \
    -v "${PROJECT_DIR}/backend/src/main/resources/db/migration:/flyway/sql" \
    flyway/flyway:11 \
    -url="jdbc:postgresql://${DB_HOST}:${DB_PORT}/${DB_NAME}" \
    -user="${DB_USERNAME}" \
    -password="${DB_PASSWORD}" \
    -outOfOrder=true \
    validate || true   # exit 1 from validate is informational; keep going
  echo ""
  exit 0
fi

# ── Flyway repair (optional, run before bringing backend up) ────────────
if [ "$DO_REPAIR" = "true" ]; then
  echo -e "${YELLOW}▸ Running flyway repair against prod DB…${NC}"
  if [ ! -f deploy/.env ]; then
    echo -e "${RED}✗ deploy/.env not found — cannot repair without DB creds${NC}"
    exit 1
  fi
  # shellcheck disable=SC1091
  set -a; source deploy/.env; set +a

  # IMPORTANT: mount the local migrations dir so Flyway sees the current
  # file contents. Without this volume mount, `repair` can only clean
  # FAILED migration entries from schema_history — it CANNOT update
  # checksums to match edited files. That's the bug from the first run.
  docker run --rm --network host \
    -v "${PROJECT_DIR}/backend/src/main/resources/db/migration:/flyway/sql" \
    flyway/flyway:11 \
    -url="jdbc:postgresql://${DB_HOST}:${DB_PORT}/${DB_NAME}" \
    -user="${DB_USERNAME}" \
    -password="${DB_PASSWORD}" \
    -outOfOrder=true \
    repair
  echo -e "${GREEN}✓ Flyway checksums repaired${NC}"
  echo ""
fi

# ── Backend ──────────────────────────────────────────────────────────────
if [ "$DEPLOY_BACKEND" = "true" ]; then
  echo -e "${YELLOW}▸ Rebuilding + restarting backend container…${NC}"
  docker compose up -d --build
  echo -e "${GREEN}✓ Backend container is up${NC}"
  echo ""

  # Give Spring Boot a moment to start, then check health
  echo -e "${YELLOW}▸ Waiting for backend health…${NC}"
  for i in {1..30}; do
    if curl -fsS http://127.0.0.1:8081/api/health >/dev/null 2>&1; then
      echo -e "${GREEN}✓ /api/health responding${NC}"
      break
    fi
    sleep 2
    if [ "$i" -eq 30 ]; then
      echo -e "${RED}✗ Health check timed out — check logs:${NC}"
      echo "    docker compose logs --tail=60 backend"
      exit 1
    fi
  done
  echo ""
fi

if [ "$TAIL_LOGS" = "true" ]; then
  echo -e "${YELLOW}▸ Tailing backend logs (Ctrl+C to detach)…${NC}"
  docker compose logs -f --tail=20 backend
fi
REMOTE

echo ""
echo -e "${CYAN}========================================${NC}"
if [ "$DO_VALIDATE" = true ]; then
  echo -e "${GREEN}  Validation complete — see output above${NC}"
else
  echo -e "${GREEN}  Deploy complete!${NC}"
  [ "$DEPLOY_FRONTEND" = true ] && echo -e "  Frontend: ${GREEN}✓${NC} React bundle rebuilt"
  [ "$DO_REPAIR"       = true ] && echo -e "  Flyway:   ${GREEN}✓${NC} checksums repaired"
  [ "$DEPLOY_BACKEND"  = true ] && echo -e "  Backend:  ${GREEN}✓${NC} container restarted"
fi
echo -e "${CYAN}========================================${NC}"
echo ""
echo "  → https://app.msfgco.com"
