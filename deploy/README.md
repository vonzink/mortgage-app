# Deploying to the MSFG EC2 box

Production target: `app.msfgco.com` on the existing Ubuntu EC2 instance that
already runs `msfg-backend` (Node), n8n, RustDesk, and the LendingPad
dashboard. The Spring Boot backend runs in a Docker container; the React
frontend is a static bundle served by the host's existing nginx.

## One-time setup

### 1. Cognito callback URLs

User Pool `us-west-1_S6iE2uego` → **App integration** tab → click the app
client → **Hosted UI** section → **Edit**. Add both:

- **Allowed callback URLs**: `https://app.msfgco.com/auth/callback`
- **Allowed sign-out URLs**: `https://app.msfgco.com/`

Without these, sign-in fails with `redirect_mismatch` after the OAuth
round-trip. Leave the existing `http://localhost:3000/...` entries —
those keep dev working.

### 2. RDS Postgres

If you don't already have a `mortgage_app` database on RDS, create one:

```sql
CREATE DATABASE mortgage_app;
CREATE USER mortgage_app WITH PASSWORD '...';
GRANT ALL PRIVILEGES ON DATABASE mortgage_app TO mortgage_app;
```

The backend's Flyway migrations (V1–V15) run automatically on first boot.
Schema is fully managed by Flyway in prod (`spring.jpa.hibernate.ddl-auto=validate`).

### 3. S3 bucket

The prod docs bucket is `msfg-mortgage-app-documents-prod`. If it isn't deployed yet:

```bash
cd infra
npx cdk deploy MortgageApp-Prod-Documents MortgageApp-Prod-Iam
```

(The dev bucket — `msfg-mortgage-app-documents-dev` — is already deployed.)

### 4. Docker

```bash
# install once on the EC2 box
sudo apt-get update
sudo apt-get install -y docker.io docker-compose-plugin
sudo usermod -aG docker ubuntu
# log out and back in for the group change to take effect
```

## Deploying the app

```bash
# clone (one time)
mkdir -p ~/apps && cd ~/apps
git clone git@github.com:vonzink/mortgage-app.git
cd mortgage-app

# secrets — fill in real values
cp deploy/.env.example deploy/.env
chmod 600 deploy/.env
nano deploy/.env

# build the frontend bundle for nginx
# CRA bakes REACT_APP_* values into the bundle at build time, so these have to
# be exported BEFORE `npm run build` — they don't read deploy/.env.
cd frontend
npm install --legacy-peer-deps
REACT_APP_API_URL=https://app.msfgco.com/api \
REACT_APP_COGNITO_AUTHORITY=https://cognito-idp.us-west-1.amazonaws.com/us-west-1_S6iE2uego \
REACT_APP_COGNITO_REDIRECT_URI=https://app.msfgco.com/auth/callback \
REACT_APP_COGNITO_POST_LOGOUT_REDIRECT_URI=https://app.msfgco.com/ \
REACT_APP_COGNITO_USER_POOL_ID=us-west-1_S6iE2uego \
REACT_APP_COGNITO_CLIENT_ID=34rg0vqoobfv8hhvg8kunkd738 \
REACT_APP_COGNITO_DOMAIN=https://us-west-1s6ie2uego.auth.us-west-1.amazoncognito.com \
npm run build
cd ..

# build + boot the backend container
docker compose up -d --build
docker compose logs -f backend   # wait for "Started ... in N seconds"
```

## Wiring up nginx

```bash
sudo cp deploy/nginx-app.msfgco.com.conf /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/nginx-app.msfgco.com.conf \
           /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# TLS — certbot edits the same file in place
sudo certbot --nginx -d app.msfgco.com
```

DNS: point `app.msfgco.com` (A or CNAME) at the EC2 public IP / Elastic IP.

## Routine deploys

After pushing changes to `main`:

```bash
cd ~/apps/mortgage-app
git pull
# frontend (same env vars as initial deploy — CRA bakes them in at build time)
cd frontend && \
  REACT_APP_API_URL=https://app.msfgco.com/api \
  REACT_APP_COGNITO_AUTHORITY=https://cognito-idp.us-west-1.amazonaws.com/us-west-1_S6iE2uego \
  REACT_APP_COGNITO_REDIRECT_URI=https://app.msfgco.com/auth/callback \
  REACT_APP_COGNITO_POST_LOGOUT_REDIRECT_URI=https://app.msfgco.com/ \
  REACT_APP_COGNITO_USER_POOL_ID=us-west-1_S6iE2uego \
  REACT_APP_COGNITO_CLIENT_ID=34rg0vqoobfv8hhvg8kunkd738 \
  REACT_APP_COGNITO_DOMAIN=https://us-west-1s6ie2uego.auth.us-west-1.amazoncognito.com \
  npm run build && cd ..
# backend container
docker compose up -d --build
```

Backend rebuilds use Docker's layer cache — only re-runs Maven if `pom.xml`
or `src/` changed. First build is ~3–5 minutes; subsequent builds when only
code changes are ~30–60 seconds.

## Health + logs

```bash
curl http://127.0.0.1:8081/api/health        # local (container)
curl https://app.msfgco.com/api/health        # via nginx + TLS

docker compose logs -f backend                # tail backend logs
docker compose ps                              # container state + healthcheck status
sudo tail -f /var/log/nginx/app.msfgco.com.access.log
```

## Rotating secrets

Anything in `deploy/.env` is read fresh by the container only on
`docker compose up -d` — `restart` reuses the old environment. Always use
`up -d` after editing `.env`.

### Database password (`DB_PASSWORD`)

```bash
# 1. Connect to RDS as the master user
psql -h msfg-webhook-postgres-public.cghqooasg1vk.us-east-1.rds.amazonaws.com \
     -U postgres -d postgres

# At the postgres=> prompt:
#   ALTER USER mortgage_app WITH PASSWORD 'NewPassword2026';
#   \q

# 2. Update deploy/.env on the server
nano ~/apps/mortgage-app/deploy/.env
# Change DB_PASSWORD=… to the new value, save (Ctrl+O, Enter, Ctrl+X)

# 3. Recreate the container (NOT restart — that reuses old env)
cd ~/apps/mortgage-app
docker compose up -d

# 4. Verify
docker compose logs --tail=40 backend
# Look for: "Started MortgageApplication in N seconds"
```

If the container won't boot after the swap and the logs say
`password authentication failed for user "mortgage_app"`, the value in
`.env` doesn't match what's on RDS. Use the same psql command from
step 1 to test the new password directly:

```bash
PGPASSWORD='NewPassword2026' psql \
  -h msfg-webhook-postgres-public.cghqooasg1vk.us-east-1.rds.amazonaws.com \
  -U mortgage_app -d mortgage_app -c '\conninfo'
```

If `psql` succeeds but the container fails, the `.env` value has a hidden
character (trailing whitespace, smart quote). Re-edit and re-do step 3.

### Encryption key (`APP_ENCRYPTION_KEY`)

Currently unused (no column-level crypto wired up yet), but if you rotate
it, anything that was encrypted with the old key becomes unrecoverable.
Don't rotate unless you know nothing in the database was encrypted with
the current key.

```bash
openssl rand -base64 32  # generate the new key
# Paste into deploy/.env, then:
docker compose up -d
```

### AWS credentials

Don't put AWS keys in `.env`. The EC2 instance role (`msfg-dashboard-ec2-role`)
already has an inline policy granting access to the prod S3 bucket. The
container reads role credentials automatically via the EC2 metadata
service — no rotation needed on the app side.

## Rollback

```bash
cd ~/apps/mortgage-app
git log --oneline -10            # find the last-good commit
git checkout <hash>
docker compose up -d --build
# (frontend rebuild only if the SHA changed frontend/)
```

For container-only rollback without code changes, tag the image when you
deploy:

```bash
docker tag mortgage-app-backend:latest mortgage-app-backend:$(git rev-parse --short HEAD)
```

Then `docker compose` against the older tag if something breaks.

## What's NOT in scope here

- ECS/Fargate/App Runner — single-EC2 + docker-compose is enough for this
  traffic profile. Migrate later if it grows.
- CloudFront for the frontend — nginx serves the static bundle fine for now.
  Add CloudFront + S3 hosting only if global latency starts to matter.
- CI/CD — manual `git pull && docker compose up -d --build` on the box for
  now. A GitHub Actions workflow that pushes to ECR + SSHs to roll the
  service is a follow-up if deploy frequency picks up.
