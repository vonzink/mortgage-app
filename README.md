# Mortgage Application Platform

MSFG's mortgage origination platform — borrower portal, loan officer dashboard,
MISMO 3.4 import/export, and document workspace.

## Repository layout

```
backend/   Spring Boot 3.2 / Java 17 / Maven. Postgres in prod, H2 (PG mode) in dev.
           Cognito JWT auth, Flyway migrations, MISMO importer/exporter, S3 docs.
frontend/  React 18 (CRA). Cognito Hosted UI via react-oidc-context, axios,
           react-hook-form (multi-step 1003).
infra/     AWS CDK v2 (TypeScript). Documents S3 + IAM stacks per env.
docs/      Living design references.
```

## Quick start

```bash
# Frontend
cd frontend && npm install --legacy-peer-deps && npm start    # :3000

# Backend
cd backend && mvn spring-boot:run -Dspring-boot.run.profiles=dev   # :8081, /api

# Infra
cd infra && npx cdk synth
```

Copy `frontend/.env.example` → `frontend/.env` for Cognito config.

## Architecture

See [`CLAUDE.md`](CLAUDE.md) for the canonical guide — auth flow, status
workflow, schema-management rules, S3 layout, MISMO mapping, and which
historical files in this repo predate the current architecture.
