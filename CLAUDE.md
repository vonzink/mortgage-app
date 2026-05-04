# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

This file describes what is **actually in the code on `main`** — not aspirational
target architecture. If you find a section here that doesn't match the code,
trust the code and update this file.

## Repository shape

- `backend/` — Spring Boot 3.2 / Java 17, Maven. Currently runs on H2 (in-memory) for dev. Flyway-driven schema. Cognito JWT auth. AWS SDK v2 for S3.
- `frontend/` — Create React App (React 18). `react-oidc-context` for Cognito Hosted UI, axios for API calls, react-hook-form for the multi-step 1003.
- `infra/` — AWS CDK v2 (TypeScript). Two stacks for `dev`: `Documents` (S3 documents bucket + access-log bucket + lifecycle + CORS + Object Lock) and `Iam` (EC2 instance role with denied governance bypass). Prod stacks stubbed out, ready to enable.

`README.md`, `LATEST_UPDATES.md`, `CURRENCY_FORMATTING_UPDATE.md`,
`DOCUMENT_RULES_ENGINE_SUMMARY.md` predate everything here. Trust the code.

## Commands

### Backend (run from `backend/`)

```bash
mvn -q -DskipTests compile                                   # type-check
mvn spring-boot:run                                          # boot (H2 in memory, port 8080, context-path /api)
mvn test -Dtest=ClassNameHere                                # single test
```

Backend serves on `http://localhost:8080` with context-path `/api`. Java 17 source/target; Lombok pinned ≥ 1.18.42 to avoid `TypeTag :: UNKNOWN` under newer JDKs.

### Frontend (run from `frontend/`)

```bash
npm install --legacy-peer-deps                               # CRA 5 vs newer TS peer
npm start                                                    # dev server on :3000
CI=false npm run build                                       # prod build
```

Copy `.env.example` to `.env`. The Cognito client ID + domain for the `mortgage-app-web` client are real values for the shared user pool `us-west-1_S6iE2uego`.

### Infra (run from `infra/`)

```bash
npm install
npx cdk synth                                                # local-only validation, no AWS calls
npx cdk diff MortgageApp-Dev-Iam                             # diff IAM stack
npx cdk deploy MortgageApp-Dev-Iam                           # creates MortgageAppBackend-dev role + instance profile
```

The dev documents bucket and logs bucket already exist physically (created Apr 29 2026). Plain `cdk deploy MortgageApp-Dev-Documents` will fail because the names are taken. Use `cdk import` instead — see [`infra/README.md`](infra/README.md) for the pre-flight checklist and import procedure. **Never `cdk destroy`** — `removalPolicy: RETAIN` is set everywhere, and Object Lock makes destruction a compliance event.

## Architecture — what's actually built

### Schema management

All schema changes go through Flyway under [`backend/src/main/resources/db/migration/V*__*.sql`](backend/src/main/resources/db/migration). Migrations are append-only once committed.

Current migrations:

- `V1__init.sql` — loan_applications, properties, borrowers, employment, income_sources, liabilities, reo_properties, residences, declarations, assets, documents (initial), ghl_integration_logs.
- `V2__document_s3_fields.sql` — add doc_uuid, s3_key, safe_filename, content_type, upload_status to documents.
- `V3__document_visibility.sql` — add party_role, added_by_role, uploaded_by_user_id, visibility flags to documents.
- `V4__document_metadata_model.sql` — drop file_path; rename file_name→original_filename, added_by_role→uploaded_by_role, uploaded_at→created_at; add display_name, updated_at, deleted_at.
- `V5__users_and_cognito.sql` — users table; cognito_sub on borrowers.

JPA `ddl-auto` is `update` for now (the long-term goal is `validate` once a `LiabilityOptimized` vs `Liability` collision is resolved — both currently map to the same `liabilities` table).

### Document storage

The Postgres `documents` row is the **source of truth for user-facing identity** (display_name, visibility, audit). S3 only stores the bytes. The frontend never sees the s3 key — `docUuid` is the public handle.

S3 key convention (server-generated, never client-supplied):

```
applications/{applicationId}/{partyRole}/{documentType}/{docUuid}-{safeFilename}
```

Lifecycle is driven by S3 **object tags**, not by key prefixes — keys are immutable. Tags applied at confirm time by [`S3DocumentService.applyLifecycleTags`](backend/src/main/java/com/yourcompany/mortgage/service/S3DocumentService.java): `loan_state`, `sensitivity`, `retention_class`, `source`, `application_id`, `doc_uuid`. The CDK lifecycle rules in [`infra/lib/documents-stack.ts`](infra/lib/documents-stack.ts) match against these tags.

Upload is a 3-step direct-to-S3 flow:

1. `POST /loan-applications/{loanId}/documents/upload-url` — backend validates content-type and extension, creates a `pending` Document row, returns a presigned PUT URL with content-type pinned (so S3 enforces the claimed type).
2. Browser PUTs the file straight to S3.
3. `PUT /loan-applications/{loanId}/documents/{docUuid}/confirm` — backend HEADs the object, validates size against `aws.s3.max-upload-bytes` (default 50 MiB), applies tags, flips status to `uploaded`. Oversized uploads are deleted from S3 and the row marked `failed`.

Other endpoints:

- `GET /loan-applications/{loanId}/documents` — list non-deleted, ordered by documentType + createdAt.
- `GET /loan-applications/{loanId}/documents/{docUuid}/download-url` — presigned GET with `Content-Disposition: attachment; filename="{originalFilename}"`.
- `PATCH /loan-applications/{loanId}/documents/{docUuid}` — Dropbox-style rename of `displayName`. Original filename and s3 key stay immutable.
- `DELETE /loan-applications/{loanId}/documents/{docUuid}` — soft delete: sets `deleted_at`, best-effort S3 delete (Object Lock-aware — refusal is fine, the row hides regardless).

Validation rules in [`DocumentUploadValidator`](backend/src/main/java/com/yourcompany/mortgage/service/DocumentUploadValidator.java):

- Content-type allow-list: PDF, common images (PNG/JPEG/HEIC/HEIF/TIFF/WebP), text/plain, text/csv, Word/Excel formats.
- Filename extension deny-list: exe, bat, cmd, com, scr, msi, vbs, js, jar, sh, html, svg, xhtml, etc.
- Size cap: `aws.s3.max-upload-bytes` (default 50 MiB).
- Party role allow-list: `{borrower, agent, lo, system}` — anything else falls back to `borrower`.

### Auth flow (Cognito Hosted UI + Spring resource server)

1. Frontend redirects to Cognito Hosted UI (auth-code grant + PKCE) via `react-oidc-context`.
2. Cognito returns `id_token`, `access_token`, `refresh_token`. **The frontend sends `id_token` in the `Authorization` header** — Cognito access tokens omit the `email` claim, but `CurrentUserService` resolves users by email-then-sub. Both tokens are signed by the same JWK set, so signature validation works either way. See [`frontend/src/services/apiClient.js`](frontend/src/services/apiClient.js).
3. Spring's resource server validates against `cognito-idp.us-west-1.amazonaws.com/us-west-1_S6iE2uego/.well-known/openid-configuration`.
4. [`CognitoJwtConverter`](backend/src/main/java/com/yourcompany/mortgage/security/CognitoJwtConverter.java) maps the `cognito:groups` claim → `ROLE_*` Spring authorities.
5. [`CurrentUserService`](backend/src/main/java/com/yourcompany/mortgage/security/CurrentUserService.java) materializes a local `users` row on first sign-in (looks up by `cognito_sub` then `email`, creating if neither matches), and back-fills `borrowers.cognito_sub` when a borrower's email matches.
6. **Per-loan ownership** is enforced by `@PreAuthorize("@loanAccessGuard.canAccess(#loanId)")` on document endpoints. [`LoanAccessGuard`](backend/src/main/java/com/yourcompany/mortgage/security/LoanAccessGuard.java) ruleset: internal staff (Admin, Manager, LO, Processor) get blanket access; Borrower role only when their Cognito email matches a borrower-on-loan; everything else is denied. Assigned-LO and agent-on-loan checks need `loan_agents` / `loan_assignments` join tables that aren't modeled yet — internal staff are blanket-allowed in the meantime.

Cognito groups in this user pool: `Admin`, `Manager`, `LO`, `Processor`, `External`, `Borrower`, `RealEstateAgent`. The mortgage-app-web app client (`34rg0vqoobfv8hhvg8kunkd738`) has callbacks for `localhost:3000/auth/callback` and `apply.msfgco.com/auth/callback`.

### Frontend networking

- [`services/apiClient.js`](frontend/src/services/apiClient.js) is the only axios instance that attaches the auth token. Reads the OIDC user from sessionStorage, sends `id_token` (falls back to `access_token`), dispatches `auth:expired` on 401.
- The direct-to-S3 PUT uses **bare axios** so the backend's Authorization header doesn't poison the presigned signature.
- `App.js`'s `<AuthExpiredListener>` listens for `auth:expired` and triggers a fresh `signinRedirect()`.
- `RequireAuth` gates `/applications`, `/applications/:id`, `/apply`. If `REACT_APP_COGNITO_CLIENT_ID` or `_DOMAIN` is missing, it shows a clear setup message instead of looping into a broken redirect.

## Removed/never-built features (don't write code that calls these)

- **AI / OpenAI integration** — earlier commits added it; it was removed before Phase A. No `/ai-review` endpoints exist on the current backend.
- **MISMO 3.4 import/export** — described in old CLAUDE.md drafts as if implemented, but never actually built. No `MismoImporter` / `MismoExporter` / `MismoXmlWriter` classes exist.
- **`loan_status_history` table** — referenced in old docs; not yet modeled.
- **MapStruct DTO mappers** — dependency is in pom.xml but no generated mappers are wired up; conversions are still hand-written.
- **Jasypt SSN encryption** — dependency is in pom.xml but no `@Convert` is applied to SSN fields.
- **`DocumentService` (filesystem)** — replaced by `S3DocumentService` in Phase B; do not re-introduce filesystem storage.
