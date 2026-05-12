---
name: mortgage-app
description: Use when working in the MSFG mortgage-app repository, including Spring Boot backend changes, React frontend work, AWS CDK infra, Cognito auth, MISMO import/export, S3 document storage, the loan dashboard, document workspace, Flyway migrations, or architecture reviews.
metadata:
  short-description: MSFG mortgage-app engineering guide
---

# Mortgage App

Use this skill as the first stop for repository-specific engineering context.

## Start

1. Read `references/mortgage-app-reference.md` for the current repo map, invariants, commands, and change playbooks.
2. If the work touches UI layout or borrower/LO interaction patterns, also read `docs/UI_DESIGN_REFERENCES.md` from the repository root.
3. If the work touches schema, also read `backend/src/main/resources/db/migration/README.md` and add the next Flyway migration. Do not edit committed migrations.
4. Prefer live code over older top-level docs when they disagree.

## Guardrails

- Do not commit private server SSH commands, IP addresses, key paths, credentials, `.env` values, AWS secrets, or Cognito secrets into public repo files.
- Keep application data changes aligned with MISMO import/export behavior. Imports overwrite every modeled field and write `mismo_imports` audit rows.
- Keep auth aligned with Cognito Hosted UI: frontend sends the `id_token`; backend maps `cognito:groups` to `ROLE_*`; per-loan access is enforced by `LoanAccessGuard`.
- Keep document storage aligned with the S3 key and tag conventions owned by `S3DocumentService` and `infra/lib/documents-stack.ts`.
- For frontend changes, reuse the route/service/component conventions already in `frontend/src`; avoid adding a second API client.

## Validation

Use the narrowest validation that covers the touched surface:

- Backend type-check: `cd backend && mvn -q -DskipTests compile`
- Backend targeted test: `cd backend && mvn test -Dtest=ClassNameHere`
- Frontend tests: `cd frontend && npm test -- --watchAll=false`
- Frontend build: `cd frontend && CI=false npm run build`
- Infra local synth: `cd infra && npx cdk synth`
