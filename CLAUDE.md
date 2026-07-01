# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository shape

A three-app monorepo for MSFG's mortgage origination platform:

- `backend/` — Spring Boot 3.2 / Java 17, Maven, Postgres (RDS) in prod, H2 in PostgreSQL-mode in dev. Flyway-driven schema. Cognito JWT auth. AWS SDK v2 for S3.
- `frontend/` — React 18 built with Vite 5 (migrated off Create React App). `react-oidc-context` for Cognito Hosted UI, axios for API calls, react-hook-form for the multi-step 1003.
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

Backend package layout under `com.msfg.mortgage`:
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
- `service/llm/` — `LlmProvider` interface + Anthropic/OpenAI/DeepSeek adapters + provider registry
- `service/parser/` — `DocumentParser` interface + PDFBox text extractor

The backend serves on `http://localhost:8081` with context-path `/api` (so health is at `/api/health`). Spring Boot 3.2 is pinned to Java 17 source/target, but the build runs on Java 25 — Lombok must stay ≥ 1.18.42 to avoid the `TypeTag :: UNKNOWN` error.

### Frontend (run from `frontend/`)

```bash
npm install --legacy-peer-deps                               # @types/react 19 vs React 18 peer
npm start                                                    # Vite dev server on :3000 (alias: npm run dev)
npm test                                                     # Vitest run (one-shot); npm run test:watch to watch
npm run build                                                # Vite prod build → dist/
npm run preview                                              # serve the built dist/ locally
```

Build tool is **Vite 5 + Vitest 2** (migrated off Create React App / `react-scripts`).
Env vars still use the `REACT_APP_*` names — `vite.config.js` bakes a `process.env`
shim (like CRA's DefinePlugin) so `process.env.REACT_APP_*` reads work at runtime,
and `envPrefix` also exposes them on `import.meta.env`. JSX in `.js` files keeps
compiling via a scoped esbuild `jsx` loader. Tests run under Vitest (jsdom) with a
`jest`→`vi` codemod already applied.

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

### Deploying to production

Run from the repo root:

```bash
./deploy.sh                 # full: build frontend bundle + rebuild backend container
./deploy.sh --frontend-only # rebuild + rsync React bundle; nginx serves it directly
./deploy.sh --backend-only  # docker compose build + restart backend; Flyway runs on boot
./deploy.sh --repair        # backend rebuild with Flyway repair (drift recovery)
./deploy.sh --logs          # tail container logs after restart
```

Prod is a single EC2 host at `52.203.186.217` (`ssh -i ~/MSFG/Security/msfg-mortgage-key.pem ubuntu@52.203.186.217`). RDS Postgres + S3 (us-west-1). nginx serves the React bundle and reverse-proxies `/api` → Spring container on `:8081`. Canonical prod host is `app.msfgco.com`.

**If you see prod 502s + Flyway checksum mismatch** in the backend logs: `./deploy.sh --repair --backend-only --logs`. Don't diagnose — the runbook at `.claude/memory/project_flyway_drift_runbook.md` covers it.

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

11 stages defined in `LoanStatus` enum: `REGISTERED → APPLICATION → DISCLOSURES_SENT → DISCLOSURES_SIGNED → UNDERWRITING → APPROVED → APPRAISAL → INSURANCE → CTC → DOCS_OUT → FUNDED`, plus terminal `DISPOSITIONED`. The column is `VARCHAR(30)` in Postgres; the enum is the validation gate. `LoanStatus.fromString` accepts legacy values (`DRAFT`/`SUBMITTED`/`PROCESSING`/`DENIED`) and remaps them. `LoanApplicationService.updateApplicationStatus(id, status, transitionedAt)` writes a `loan_status_history` row on every transition; the `transitioned_by_user_id` is null until Phase 3 wires it up. The `PATCH /api/loan-applications/{id}/status` endpoint accepts an optional `transitionedAt` query param (ISO date or datetime) so the LO can backdate a milestone.

### Server-side clone

`POST /api/loan-applications/{id}/clone` deep-copies an application (property + all borrowers with employment/income/residences/declaration/assets/REO + liabilities) into a new row with `status=REGISTERED`. Does **not** copy: `applicationNumber`, `lendingpadLoanNumber`, MERS MIN, borrower SSNs, or document records. Backs the "Copy to new" action on the apps list.

### Schema management

All schema changes go through Flyway migrations under `backend/src/main/resources/db/migration/V*__*.sql`. Postgres-flavored SQL (`BIGSERIAL`, `BOOLEAN`, separate `CREATE INDEX` after `CREATE TABLE`). The `MODE=PostgreSQL` H2 in dev parses these directly. **Never edit a committed migration** — add a new one. JPA `ddl-auto` is `validate` in both dev and prod; Hibernate compares entities against the post-Flyway schema and fails boot on drift.

Current migrations: V1 through V26. Run `ls backend/src/main/resources/db/migration/` for the live head. Highlights you'll hit:

- `V1` — initial schema
- `V2` — `loan_status_history` audit table
- `V3` — `users` + per-loan assignments (assigned_lo_id, borrower/agent join tables)
- `V4` — document visibility flags (LO-controlled per-doc toggles)
- `V5–V10` — assets, audit timestamps, S3 doc fields, identifiers, `mismo_imports`, closing data
- `V22` — liability classification (`exclusion_reason`, `to_be_paid_off`, `payoff_status`) + `borrower_id` FK on `liabilities`
- `V23` — HMDA fields on `declarations` (race/ethnicity/sex stored as comma-separated MISMO codes; refusal booleans; `application_taken_method`)
- `V24` — pipeline indexes + `status_changed_at` denormalization + `loan_list_view` (backs paged list + typeahead)
- `V25` — folder AI evaluations: `eval_prompt` on `folder_templates`, `app_settings` singleton, `folder_evaluations` audit/cost table
- `V26` — `folders.folder_template_id` FK (replaces fragile name-match between folders and templates)

**H2 quirk**: `MODE=PostgreSQL` H2 won't parse multi-clause `ALTER TABLE`. Write one `ALTER TABLE … ADD COLUMN` per statement (V23 is the reference).

Most child entities have **relaxed bean-validation annotations** (`@NotNull` / `@NotBlank` removed from many fields) because partial MISMO imports would otherwise fail. Required-field UX lives in the React form (`useDraftAutosave` + `summarizeErrors` on the next-step trigger) — the backend trusts the form and the importer.

### Serializing JPA entities

`backend/.../config/JacksonConfig.java` registers `Hibernate6Module` with `FORCE_LAZY_LOADING=false` so lazy proxies serialize as `null` instead of throwing `No serializer found for ByteBuddyInterceptor`. This became required when V22 added `Liability.borrower` (@ManyToOne lazy) — once a Borrower is loaded as a proxy via Liability, the same instance shows up inside `LoanApplication.borrowers` via the session cache, and `GET /api/loan-applications` 500s.

**Rule of thumb**: prefer returning DTOs (see `mapper/LoanApplicationMapper`). If you must return an entity, Hibernate6Module covers you but the shape of what reaches the client depends on what's been fetch-joined.

### S3 layout (deployed buckets: `msfg-mortgage-app-documents-{dev,prod}` + `-logs` siblings)

Key convention enforced by `S3DocumentService`:

```
applications/{application_id}/{party_role}/{document_type}/{doc_uuid}-{safe_filename}
loans/{loan_id}/{party_role}/{document_type}/{doc_uuid}-{safe_filename}
```

Lifecycle / disposition state lives in **S3 object tags**, not in the key (keys are immutable). Tags drive the lifecycle policies that move objects to STANDARD_IA / GLACIER_IR / GLACIER_DEEP_ARCHIVE based on `loan_state` and `retention_class`. See [`infra/lib/documents-stack.ts`](infra/lib/documents-stack.ts) for the rule set and [`backend/.../S3DocumentService.java`](backend/src/main/java/com/msfg/mortgage/service/S3DocumentService.java) for the upload/download flow.

The borrower-portal upload is a 3-step direct-to-S3 flow: client asks for a presigned PUT URL (backend creates a `Document` row with `upload_status='pending'`), client PUTs the file directly to S3, client calls `/confirm` which HEADs the object and applies tags.

**CORS allowlist on prod bucket**: `app.msfgco.com` (canonical), `apply.msfgco.com`, `dashboard.msfgco.com`. Updating origins requires editing **both** `infra/lib/documents-stack.ts` *and* applying live via `aws s3api put-bucket-cors` — `cdk deploy` alone doesn't re-push CORS to an existing bucket promptly enough for active users. Symptom of a stale allowlist: `TypeError: Failed to fetch` on `uploadFileToS3`.

There are 4 prod-and-dev S3 buckets total (`msfg-mortgage-app-documents-{prod,dev}` + `-logs` siblings). **Do not propose consolidating them** — Object Lock + WORM retention are bucket-level (CFPB / Reg Z), lifecycle rules and encryption are bucket-scoped, and dev/prod isolation is load-bearing. See `.claude/memory/feedback_keep_4_s3_buckets.md`.

### MISMO export/import

`MismoExporter` builds XML via StAX (`MismoXmlWriter` helper). v1 emits application-stage data only — anything closing-stage (escrows, fees, AUS findings, MI, integrated disclosures) flows back from LendingPad on import but is not yet modeled in our DB.

`MismoImporter` orchestrates; `BorrowerSectionImporter`, `MismoCoerce`, `MismoNodes`, and `LinkContext` handle their slices. Walks the DOM via `local-name()` XPath (namespace-agnostic). Filters PARTY elements by `PartyRoleType ∈ {Borrower, Cosigner, CoBorrower}` to skip the LO/title/agent parties LP also includes.

**xlink routing for assets/liabilities/REOs**: ASSET/LIABILITY → RELATIONSHIPS `arc` → ROLE label → PARTY → borrower. Use `LinkContext.arcsByFrom` + `LinkContext.elementsByLabel`. Match borrowers by **`ROLE.SequenceNumber`** — the PARTY-level SequenceNumber is often absent or wrong.

Whole-list replace for residences/employment/income/assets/REOs/liabilities/declarations. Per-borrower matching by `SequenceNumber`; creates new borrowers if the file has more parties than the DB. **Name xpath is scoped to `INDIVIDUAL/NAME`** — `.//FirstName` would otherwise match ALIAS firstNames first.

**There is no MISMO XSD in the project** — mapping is hand-derived from a sample file and `LoanIdentifierType` discriminators (`LenderLoan` for the LP R-number, `MERS_MIN`, etc.). Drift-protection guards: skip REOs whose ADDRESS is fully null, clamp negative `OwnedPropertyRentalIncomeNetAmount` to zero.

### Frontend conventions worth knowing

- `services/apiClient.js` is the only place that touches the auth token; everything else uses the shared axios instance.
- A `auth:expired` event is dispatched on 401; `App.js`'s `<AuthExpiredListener>` triggers `signinRedirect()`. Form drafts in sessionStorage (via `useDraftAutosave`) survive the round-trip.
- `mismo:imported` event refreshes `ApplicationDetails` after a cog-dropdown upload.
- Down-payment $/% toggle has a separate raw-input state for % mode to prevent fighting react-hook-form's controlled re-renders. `LoanInformationStep.js` is the reference for that pattern.
- SSN/phone masking via the `maskedRegister` helper in `PersonalInfoField.js`. Validation regex matches the masked shape (`xxx-xx-xxxx`, `xxx-xxx-xxxx`).

#### Loan Dashboard chrome (`/loans/:id`)

- `<DashCard variant="workflow">` (Conditions, Notes, Status Timeline) gets a copper left accent and sits at the top of the grid; default reference cards (Loan Terms, Property, Borrower, …) sit below. Don't mix the two — workflow cards are where the LO acts, reference cards are read-only facts.
- **Loan Identifiers** (LendingPad R-number, MERS MIN, Investor #) render inline in the hero subline, not in their own card. The `identifiers` prop on `DashboardHero` drives this.
- **Key Dates** card replaced the old Identifiers card — shows milestone dates (application received, disclosures sent/signed, closing, funded) from status history + operational dates (created, last updated, days in stage).
- **Status transitions go through `<AdvanceStatusModal>`**, never an inline dropdown. The modal sequences two writes: `PATCH /status?status=…&transitionedAt=…` (backdate supported) followed by an optional dashboard note tagged `[FROM → TO on DATE] …`. The status endpoint has no `note` field — the tagged note is how we keep transition context in the audit surface.
- Hero-level actions live only in `DashboardChrome.jsx`'s `<DashboardHero>`. Adding one means adding a prop, not sprinkling buttons into the page body. Current hero props: `onAllLoans`, `onExportMismo`, `onViewApplication` ("Open 1003"), `onOpenDocuments` ("Files"), `onAdvanceStatus`, `identifiers`, plus `outstandingCount` for the inline pill next to the status pill.

### Per-folder AI document evaluation

The old OpenAI `/ai-review` integration was removed, but a new **per-folder AI evaluation** system exists (V25+). Architecture:

- `FolderEvaluationService` orchestrates an 11-step guardrail flow: check toggle → validate folder has `evalPrompt` → parse docs (PDFBox) → call LLM → log cost → persist result.
- `service/llm/` — `LlmProvider` interface with `AnthropicProvider`, `OpenAiProvider`, `DeepSeekProvider` implementations. `LlmProviderRegistry` resolves the active provider from `app_settings`. `LlmCostTable` tracks token costs.
- `service/parser/` — `DocumentParser` interface + `PdfBoxParser` (PDFBox 3.0.3) for text extraction.
- **Global toggle**: `app_settings.ai_eval_enabled` (default `false`). Admin flips it in `/admin/app-settings` (`AppSettingsAdmin.js`). When off, eval endpoints return 403.
- **Per-folder prompt**: `folder_templates.eval_prompt` (nullable). Folders without a prompt don't show an Evaluate button. Admin edits in `FolderTemplatesAdmin.js`.
- Frontend: `FolderEvaluationCard` renders at the top of the folder pane in the document workspace.

### Pipeline page

The pipeline (`ApplicationList.js`) has a `FilterChips` component with a two-tier layout: **primary row** (Status, Loan type, Amount range — always visible) and **secondary row** (outstanding conditions, closing date range, stage age — behind a "More filters" toggle). All filter state lives in URL params via `useFilterUrlState` so any view is a bookmark.

### Stale files / removed features

- **The old AI doc-rules integration was removed.** `DOCUMENT_RULES_ENGINE_SUMMARY.md` and the `frontend/src/utils/docRules/` directory are gone but `LATEST_UPDATES.md` still mentions them. The **new** AI integration is the per-folder evaluation system described above — completely different architecture.
- **Application versioning was removed.** Edit mode now actually updates the existing record (was previously cloning to a new "version"). `CURRENCY_FORMATTING_UPDATE.md` references the older flow.
- **Two duplicate controllers** existed (`LoanApplicationController` + `…Refactored`) — the refactored one was deleted. If you see references in old branches/notes, only the original remains.
