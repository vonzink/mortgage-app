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
mvn test                                                     # all tests
mvn test -Dtest=ClassNameHere                                # single test
```

Backend serves on `http://localhost:8080` with context-path `/api`. Java 17 source/target; Lombok pinned ≥ 1.18.42 to avoid `TypeTag :: UNKNOWN` under newer JDKs.

Backend package layout under `com.yourcompany.mortgage`:

- `controller/` + `dto/` — REST surface
- `service/` — business logic
- `model/` + `repository/` — JPA entities and Spring Data repos
- `mismo/` — MISMO 3.4 XML exporter (StAX-based; importer not yet built)
- `validation/` — bean-validation extensions
- `security/` — `CognitoJwtConverter`, `CurrentUserService`, `LoanAccessGuard`
- `exception/` — `@ControllerAdvice` global handler
- `config/` — `SecurityConfig`, `S3Config`, `JpaConfig`
- `integration/` — outbound clients (`GoHighLevelService`, stub `AiReviewService`)

### Frontend (run from `frontend/`)

```bash
npm install --legacy-peer-deps                               # CRA 5 vs newer TS peer
npm start                                                    # dev server on :3000
CI=false npm run build                                       # prod build
```

Copy `.env.example` to `.env`. The Cognito client ID + domain for the `mortgage-app-web` client are real values for the shared user pool `us-west-1_S6iE2uego`.

`pages/` holds route-level views (e.g. `ApplicationDetails.js`, `ApplicationList.js`). `components/` holds reusable UI; `components/forms/` is the multi-step 1003. Add new routes in `App.js` pointing at `pages/`.

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

JPA `ddl-auto` is `update` for now. The `LiabilityOptimized` vs `Liability` collision that previously blocked switching to `validate` was removed in the dead-code purge — flipping to `validate` is now safe but hasn't been done yet.

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

## MISMO export

`MismoExporter` builds XML via StAX (`MismoXmlWriter` helper). Two variants:
`CLOSING` (minimal closing-stage shape) and `FNM` (Fannie-Mae-flavored, with
assets, expanded loan detail, down payments, full borrower DECLARATION,
residences, per-employer addresses).

```
GET /loan-applications/{id}/export/mismo                     # CLOSING (default)
GET /loan-applications/{id}/export/mismo?variant=fnm         # FNM
```

Gated by `@PreAuthorize("@loanAccessGuard.canAccess(#id)")`. Frontend calls
this via `mortgageService.downloadMismoXml(applicationId, variant)` and uses
the `Content-Disposition` header for the filename. **No XSD validation** —
the output is hand-shaped to match what was previously generated client-side
in `urlaExport.js`. If a real LP / Fannie XSD is procured, validation can be
added in `MismoExporter.export` before returning bytes.

The corresponding **MISMO importer** is not yet built. When it lands, see
[`docs/archive/`](docs/archive/) for historical notes on the import flow that
was once described in CLAUDE.md drafts but never implemented.

## Partial / stubbed features

- **AI review** is stubbed. The endpoints (`POST /loan-applications/{id}/ai-review`,
  `POST /loan-applications/ai-review-preview`) exist and the
  `ReviewSubmitStep` UI button works, but `AiReviewService` returns a
  placeholder `AIReviewResult` ("AI review is not yet enabled..."). Replace
  the body of `AiReviewService.evaluateApplication*` with real provider calls
  when re-enabling. The DTO contract (`AIReviewResult`) is stable.
- **Print URLA HTML** lives client-side at `frontend/src/utils/printUrla.js`
  (popup window + browser print). This is intentional — it renders form
  values for transient print, not a saved artifact. Distinct from the MISMO
  XML export (which is server-side).

## Never-built features (don't write code that calls these)

- **MISMO 3.4 importer** — only the exporter is built. No `MismoImporter`
  class, no `mismo:imported` event, no `mismo_imports` audit table.
- **`loan_status_history` table** — referenced in old docs; not yet modeled.
  `LoanApplicationService.updateApplicationStatus` exists but doesn't write
  history rows.
- **Assigned-LO / agent-on-loan ownership checks** — needs `loan_agents` /
  `loan_assignments` join tables. Internal staff get blanket access in the
  meantime via `LoanAccessGuard`.
- **Jasypt SSN encryption** — dependency is in pom.xml and there's a
  `// TODO: Implement SSN encryption` in `LoanApplicationService.java:146`
  but no `@Convert` is applied to `Borrower.ssn` yet.
- **`useDraftAutosave` hook** — referenced by an older CLAUDE.md draft, never
  implemented. Form state is lost on refresh / auth round-trip.
- **`DocumentService` (filesystem)** — replaced by `S3DocumentService`; do
  not re-introduce filesystem storage.
- **MapStruct DTO mappers** — the dependency was removed in the dead-code
  purge. DTO conversions are hand-written in service classes (`toDTO`,
  `convertToDTO`).
