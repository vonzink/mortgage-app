# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Repository shape

A three-app monorepo for MSFG's mortgage origination platform:

- `backend/` — Spring Boot 3.2 / Java 17, Maven, Postgres (RDS) in prod, H2 in PostgreSQL-mode in dev. Flyway-driven schema. Cognito JWT auth. AWS SDK v2 for S3.
- `frontend/` — Create React App (React 18). `react-oidc-context` for Cognito Hosted UI, axios for API calls, react-hook-form for the multi-step 1003.
- `infra/` — AWS CDK v2 (TypeScript). Two stacks per env (prod + dev): `Documents` (S3 + lifecycle + Object Lock + access logging) and `Iam` (EC2 instance role with denied governance bypass).

Living docs live in `docs/` (currently just `UI_DESIGN_REFERENCES.md`). The top-level `README.md`, `LATEST_UPDATES.md`, `CURRENCY_FORMATTING_UPDATE.md`, and `DOCUMENT_RULES_ENGINE_SUMMARY.md` predate the current architecture and describe removed features (AI/docRules, in-memory DB, application versioning). Trust the code, not those files.

## Commands

### Backend (run from `backend/`)

```bash
mvn -q -DskipTests compile                                   # type-check
mvn spring-boot:run -Dspring-boot.run.profiles=dev           # boot dev (H2 in PG mode, port 8081)

# Smoke test the full stack against the deployed dev S3 bucket
AWS_S3_DOCUMENTS_BUCKET=msfg-mortgage-app-documents-dev \
AWS_REGION=us-west-1 \
mvn spring-boot:run -Dspring-boot.run.profiles=dev

# Single test class
mvn test -Dtest=ClassNameHere
```

Backend package layout under `com.yourcompany.mortgage`:
- `controller/` + `dto/` — REST surface
- `service/` — business logic; `LoanAccessGuard` lives in `security/`
- `model/` + `repository/` — JPA entities and Spring Data repos
- `mismo/` + `xml/` — MISMO 3.4 importer (DOM, namespace-agnostic) and exporter (StAX)
- `mapper/` — entity ↔ DTO conversions
- `validation/` — bean-validation extensions
- `security/` — `CognitoJwtConverter`, `CurrentUserService`, `LoanAccessGuard`
- `exception/` — `@ControllerAdvice` global handler
- `config/` — `SecurityConfig`, AWS clients, etc.
- `integration/` — outbound third-party clients

The backend serves on `http://localhost:8081` with context-path `/api` (so health is at `/api/health`). Spring Boot 3.2 is pinned to Java 17 source/target, but the build runs on Java 25 — Lombok must stay ≥ 1.18.42 to avoid the `TypeTag :: UNKNOWN` error.

### Frontend (run from `frontend/`)

```bash
npm install --legacy-peer-deps                               # CRA 5 vs newer TS peer
npm start                                                    # dev server on :3000
npm test                                                     # CRA Jest runner (watch mode by default)
CI=false npm run build                                       # prod build (CI=true treats warnings as errors)
```

Copy `.env.example` to `.env`. The Cognito client ID + domain are real values for the shared user pool `us-west-1_S6iE2uego`.

`pages/` holds route-level views (e.g. `ApplicationDetails.js`, `ApplicationList.js`). `components/` holds reusable UI; `components/forms/` is the multi-step 1003. Add new routes in `App.js` pointing at `pages/`.

### Infra (run from `infra/`)

```bash
npx cdk synth                                                # local-only validation, no AWS calls
npx cdk diff MortgageApp-Dev-Documents                       # diff against deployed dev stack
npx cdk deploy MortgageApp-Dev-Documents MortgageApp-Dev-Iam # deploy dev pair (CDK auto-orders)
npm test                                                     # Jest (CDK assertions)
```

The dev S3 bucket and IAM role are already deployed; never `cdk destroy` (`removalPolicy: RETAIN` and Object Lock are intentional).

## Architecture — the parts that matter

### Canonical data model

**Spec to reread when in doubt:** [docs/UI_DESIGN_REFERENCES.md](docs/UI_DESIGN_REFERENCES.md) for the LO/borrower UI patterns from the UWM EASE source images.

The Postgres database is the **operational store** (fast queries, joins, JPA-mapped). MISMO 3.4 XML files in S3 are the **canonical source of truth** for application data and the version history substrate. System metadata (workflow status, doc visibility flags, Cognito mappings, audit logs) lives only in the DB. **MISMO is not the system; it's the application-data system-of-record.**

The merge rule for MISMO imports is **always overwrite** every field we model — including borrower name and SSN — and audit every import in `mismo_imports`. Drift protection is a UI prompt: if the file's `<CreatedDatetime>` is older than the application's `updatedDate`, the backend returns 409; the frontend confirms and re-submits with `?force=true`.

### Auth flow (Cognito Hosted UI + Spring resource server)

1. Frontend redirects to Cognito Hosted UI (auth-code grant + PKCE).
2. Cognito returns `id_token`, `access_token`, `refresh_token`. **The frontend sends `id_token` (not `access_token`) in the `Authorization` header** — Cognito access tokens omit the `email` claim, but our backend resolves users by email-then-sub. See `frontend/src/services/apiClient.js`.
3. Spring's resource server validates against `cognito-idp.us-west-1.amazonaws.com/us-west-1_S6iE2uego/.well-known/openid-configuration`. Both id and access tokens are signed by the same JWK set, so either works.
4. `CognitoJwtConverter` maps the `cognito:groups` claim → `ROLE_*` Spring authorities. Path-level rules in `SecurityConfig` use those.
5. `CurrentUserService` materializes a local `users` row on first sign-in (looking up by email → cognito_sub, creating if neither exists). Synthesizes a placeholder email from `cognito:username` if the JWT lacks one.
6. **Per-loan ownership** is enforced separately by `@PreAuthorize("@loanAccessGuard.canAccess(#id)")` on controller methods. `LoanAccessGuard` checks: superuser group → assigned LO → borrower-on-loan → agent-on-loan.

### Status workflow

11 stages defined in `LoanStatus` enum: `REGISTERED → APPLICATION → DISCLOSURES_SENT → DISCLOSURES_SIGNED → UNDERWRITING → APPROVED → APPRAISAL → INSURANCE → CTC → DOCS_OUT → FUNDED`, plus terminal `DISPOSITIONED`. The column is `VARCHAR(30)` in Postgres; the enum is the validation gate. `LoanStatus.fromString` accepts legacy values (`DRAFT`/`SUBMITTED`/`PROCESSING`/`DENIED`) and remaps them. `LoanApplicationService.updateApplicationStatus` writes a `loan_status_history` row on every transition; the `transitioned_by_user_id` is null until Phase 3 wires it up.

### Schema management

All schema changes go through Flyway migrations under `backend/src/main/resources/db/migration/V*__*.sql`. Postgres-flavored SQL (`BIGSERIAL`, `BOOLEAN`, separate `CREATE INDEX` after `CREATE TABLE`). The `MODE=PostgreSQL` H2 in dev parses these directly. **Never edit a committed migration** — add a new one. JPA `ddl-auto` is `validate` in both dev and prod; Hibernate compares entities against the post-Flyway schema and fails boot on drift.

Current migrations (next is `V11`):
- `V1` — initial schema
- `V2` — `loan_status_history` audit table
- `V3` — `users` + per-loan assignments (assigned_lo_id, borrower/agent join tables)
- `V4` — document visibility flags (LO-controlled per-doc toggles)
- `V5` — `assets` table (entity existed before the schema did)
- `V6` — `created_at` / `updated_at` audit columns on entities that already declared them
- `V7` — Document S3 fields for the presigned-PUT borrower upload flow
- `V8` — loan identifiers (LP R-number, MERS MIN, etc.)
- `V9` — `mismo_imports` audit table
- `V10` — closing-stage data (1:1 `closing_information` per loan)

Most child entities have **relaxed bean-validation annotations** (`@NotNull` / `@NotBlank` removed from many fields) because partial MISMO imports would otherwise fail. Required-field UX lives in the React form (`useDraftAutosave` + `summarizeErrors` on the next-step trigger) — the backend trusts the form and the importer.

### S3 layout (deployed buckets: `msfg-mortgage-app-documents-{dev,prod}` + `-logs` siblings)

Key convention enforced by `S3DocumentService`:

```
applications/{application_id}/{party_role}/{document_type}/{doc_uuid}-{safe_filename}
loans/{loan_id}/{party_role}/{document_type}/{doc_uuid}-{safe_filename}
```

Lifecycle / disposition state lives in **S3 object tags**, not in the key (keys are immutable). Tags drive the lifecycle policies that move objects to STANDARD_IA / GLACIER_IR / GLACIER_DEEP_ARCHIVE based on `loan_state` and `retention_class`. See [`infra/lib/documents-stack.ts`](infra/lib/documents-stack.ts) for the rule set and [`backend/.../S3DocumentService.java`](backend/src/main/java/com/yourcompany/mortgage/service/S3DocumentService.java) for the upload/download flow.

The borrower-portal upload is a 3-step direct-to-S3 flow: client asks for a presigned PUT URL (backend creates a `Document` row with `upload_status='pending'`), client PUTs the file directly to S3, client calls `/confirm` which HEADs the object and applies tags.

### MISMO export/import

`MismoExporter` builds XML via StAX (`MismoXmlWriter` helper). v1 emits application-stage data only — anything closing-stage (escrows, fees, AUS findings, MI, integrated disclosures) flows back from LendingPad on import but is not yet modeled in our DB.

`MismoImporter` walks the DOM via `local-name()` XPath (namespace-agnostic). Filters PARTY elements by `PartyRoleType='Borrower'` to skip the LO/title/agent parties LP also includes. Whole-list replace for residences, employment, income sources, assets, REOs, liabilities, declarations. Per-borrower matching by `SequenceNumber`; creates new borrowers if the file has more parties than the DB. **There is no MISMO XSD in the project** — mapping is hand-derived from a sample file and `LoanIdentifierType` discriminators (`LenderLoan` for the LP R-number, `MERS_MIN`, etc.).

### Frontend conventions worth knowing

- `services/apiClient.js` is the only place that touches the auth token; everything else uses the shared axios instance.
- A `auth:expired` event is dispatched on 401; `App.js`'s `<AuthExpiredListener>` triggers `signinRedirect()`. Form drafts in sessionStorage (via `useDraftAutosave`) survive the round-trip.
- `mismo:imported` event refreshes `ApplicationDetails` after a cog-dropdown upload.
- Down-payment $/% toggle has a separate raw-input state for % mode to prevent fighting react-hook-form's controlled re-renders. `LoanInformationStep.js` is the reference for that pattern.
- SSN/phone masking via the `maskedRegister` helper in `PersonalInfoField.js`. Validation regex matches the masked shape (`xxx-xx-xxxx`, `xxx-xxx-xxxx`).

### Stale files / removed features

- **AI integration was removed.** No OpenAI service, no `/ai-review` endpoints. `DOCUMENT_RULES_ENGINE_SUMMARY.md` and the `frontend/src/utils/docRules/` directory are gone but `LATEST_UPDATES.md` still mentions them.
- **Application versioning was removed.** Edit mode now actually updates the existing record (was previously cloning to a new "version"). `CURRENCY_FORMATTING_UPDATE.md` references the older flow.
- **Two duplicate controllers** existed (`LoanApplicationController` + `…Refactored`) — the refactored one was deleted. If you see references in old branches/notes, only the original remains.
- **In-progress cleanup on `main`:** if `git status` shows uncommitted deletions of `OpenAIService.java`, `AIReviewResult.java`, `frontend/src/utils/docRules/`, `DocumentChecklist.tsx`, `useDocumentChecklist.ts`, the legacy `schema.sql`, or `LoanApplicationServiceRefactored.java`, that's the AI/docRules removal in progress — don't restore them.
