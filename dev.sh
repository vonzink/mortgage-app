#!/usr/bin/env bash
# ============================================================================
# MSFG Mortgage App — Local Dev
#
# Boots the Spring Boot backend (port 8081) and the CRA frontend (port 3000)
# in one terminal. Streams both logs side-by-side, prefixed by source.
# Ctrl+C kills both cleanly.
#
# Usage:
#   ./dev.sh                # both services
#   ./dev.sh --backend-only # just the Spring Boot backend
#   ./dev.sh --frontend-only# just the CRA dev server
#   ./dev.sh --no-wait      # don't wait for backend health before starting frontend
# ============================================================================
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

# ── Colors ──────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
RED='\033[0;31m'
NC='\033[0m'

# ── Flags ───────────────────────────────────────────────────────────────────
START_BACKEND=true
START_FRONTEND=true
WAIT_FOR_HEALTH=true

for arg in "$@"; do
  case $arg in
    --backend-only)  START_FRONTEND=false ;;
    --frontend-only) START_BACKEND=false; WAIT_FOR_HEALTH=false ;;
    --no-wait)       WAIT_FOR_HEALTH=false ;;
    -h|--help)
      sed -n '3,15p' "$0" | sed 's/^# //'
      exit 0
      ;;
    *)
      echo "Unknown option: $arg"
      exit 1
      ;;
  esac
done

# ── PID tracking for clean shutdown ─────────────────────────────────────────
BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
  echo ""
  echo -e "${YELLOW}▸ Shutting down…${NC}"
  # Polite first
  [ -n "$BACKEND_PID" ]  && kill "$BACKEND_PID"  2>/dev/null || true
  [ -n "$FRONTEND_PID" ] && kill "$FRONTEND_PID" 2>/dev/null || true
  # Also kill anything still on the ports — mvn often spawns Java as a grandchild
  # that doesn't get reaped by killing $BACKEND_PID alone.
  lsof -ti:8081 2>/dev/null | xargs -r kill 2>/dev/null || true
  lsof -ti:3000 2>/dev/null | xargs -r kill 2>/dev/null || true
  sleep 1
  lsof -ti:8081 2>/dev/null | xargs -r kill -9 2>/dev/null || true
  lsof -ti:3000 2>/dev/null | xargs -r kill -9 2>/dev/null || true
  echo -e "${GREEN}✓ Bye${NC}"
  exit 0
}
trap cleanup INT TERM

# ── Preflight ───────────────────────────────────────────────────────────────
echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}  MSFG Mortgage App — Dev${NC}"
echo -e "${CYAN}========================================${NC}"

# Required tools
if [ "$START_BACKEND"  = "true" ] && ! command -v mvn >/dev/null 2>&1; then
  echo -e "${RED}✗ mvn not in PATH. Install with: brew install maven${NC}"
  exit 1
fi
if [ "$START_FRONTEND" = "true" ] && ! command -v npm >/dev/null 2>&1; then
  echo -e "${RED}✗ npm not in PATH. Install Node first.${NC}"
  exit 1
fi

# Port availability
check_port() {
  local port="$1"
  local name="$2"
  if lsof -ti:"$port" >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠ Port $port (${name}) already in use.${NC}"
    echo -e "  Kill the process with:  ${CYAN}lsof -ti:${port} | xargs kill${NC}"
    exit 1
  fi
}
[ "$START_BACKEND"  = "true" ] && check_port 8081 backend
[ "$START_FRONTEND" = "true" ] && check_port 3000 frontend

echo ""

# ── Backend ─────────────────────────────────────────────────────────────────
if [ "$START_BACKEND" = "true" ]; then
  echo -e "${YELLOW}▸ Starting backend on :8081…${NC}"
  (
    cd backend
    # -q silences Maven's chatter; Spring Boot's logs still come through.
    mvn -q spring-boot:run -Dspring-boot.run.profiles=dev 2>&1 \
      | sed -u "s/^/$(printf '%b[backend]%b ' "$MAGENTA" "$NC")/"
  ) &
  BACKEND_PID=$!

  if [ "$WAIT_FOR_HEALTH" = "true" ]; then
    echo -e "${YELLOW}▸ Waiting for /api/health…${NC}"
    for i in $(seq 1 60); do
      if curl -fsS http://127.0.0.1:8081/api/health >/dev/null 2>&1; then
        echo -e "${GREEN}✓ Backend ready${NC}"
        break
      fi
      # If the backend process died, bail out
      if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
        echo -e "${RED}✗ Backend process exited. Check the log above.${NC}"
        exit 1
      fi
      sleep 2
      if [ "$i" -eq 60 ]; then
        echo -e "${RED}✗ Backend didn't respond on /api/health within 2 min${NC}"
        cleanup
      fi
    done
  fi
fi

# ── Frontend ────────────────────────────────────────────────────────────────
if [ "$START_FRONTEND" = "true" ]; then
  echo -e "${YELLOW}▸ Starting frontend on :3000…${NC}"
  (
    cd frontend
    # BROWSER=none — don't auto-open a tab; CRA's auto-open trips on macOS sometimes.
    BROWSER=none npm start 2>&1 \
      | sed -u "s/^/$(printf '%b[frontend]%b ' "$CYAN" "$NC")/"
  ) &
  FRONTEND_PID=$!
fi

# ── Banner ──────────────────────────────────────────────────────────────────
sleep 2  # give the frontend log a moment to start streaming first
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Dev environment up${NC}"
[ "$START_BACKEND"  = "true" ] && echo -e "  Backend:  ${CYAN}http://localhost:8081/api${NC}"
[ "$START_FRONTEND" = "true" ] && echo -e "  Frontend: ${CYAN}http://localhost:3000${NC}"
echo -e "${GREEN}  Press Ctrl+C to stop everything${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Block until something dies (Ctrl+C → trap → cleanup → exit)
wait
