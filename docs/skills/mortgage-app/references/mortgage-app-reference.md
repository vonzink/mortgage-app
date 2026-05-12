# MSFG Mortgage App Reference

## Snapshot

Public repo: https://github.com/vonzink/mortgage-app

Local workspace: `/Users/zacharyzink/MSFG/WebProjects/mortgage-app`

Do not add private server SSH targets, private key paths, IP addresses, credentials, or environment values to repo-tracked docs. The repo is public, so deployment access belongs in a private runbook or secret manager.

This is a three-app monorepo:

- `backend/`: Spring Boot 3.2.10, Java 17 source/target, Maven, Spring Security resource server, Flyway, JPA, H2 in PostgreSQL mode for dev, Postgres in prod, AWS SDK v2 for S3.
- `frontend/`: Create React App, React 18, `react-oidc-context`, axios, `react-hook-form`, `react-icons`, document workspace UI, loan dashboard UI.
- `infra/`: AWS CDK v2 TypeScript. Documents stack owns S3 buckets and lifecycle. IAM stack owns the EC2 backend role and guardrails.

Older top-level docs can lag the code. Trust source files, migrations, and this reference first.

## Commands

Backend:

```bash
cd backend
mvn -q -DskipTests compile
mvn test -Dtest=ClassNameHere
mvn spring-boot:run -Dspring-boot.run.profiles=dev
```

Frontend:

```bash
cd frontend
npm install --legacy-peer-deps
npm start
npm test -- --watchAll=false
CI=false npm run build
```

Infra:

```bash
cd infra
npx cdk synth
npm test
```

Backend default URL is `http://localhost:8081/api`; health is `/api/health`. Frontend default API base is `REACT_APP_API_URL` or `http://localhost:8081/api`.

## Current Entry Points

Frontend routes live in `frontend/src/App.js`:

- `/`: public application form entry point.
- `/apply`: protected application form.
- `/applications`: protected loan application list.
- `/applications/:id`: protected application details plus upload log and workspace.
- `/loan/:loanId`: protected LO loan dashboard.
- `/auth/callback`: Cognito redirect landing route.

Frontend service files:

- `frontend/src/services/apiClient.js`: the only axios instance and auth-token attachment point.
- `frontend/src/services/mortgageService.js`: application, MISMO, status, document upload/download, `me` calls.
- `frontend/src/services/workspaceService.js`: folder tree, document filing, move, delete folder, permanent delete.
- `frontend/src/services/dashboardService.js`: dashboard aggregate, loan terms, status, conditions, notes.

Backend controllers:

- `HealthController`: `GET /health`.
- `MeController`: current user and user-scoped loan list.
- `LoanApplicationController`: application CRUD, MISMO import/export, status history.
- `DocumentController`: presigned upload/download, document list/filter, rename/tag patch, move, permanent delete.
- `FolderController`: workspace folder tree, seed defaults, create, rename, soft-delete.
- `LoanDashboardController`: dashboard aggregate, loan terms, conditions, notes.

## Backend Map

Package root: `com.msfg.mortgage`.

- `controller/` and `dto/`: REST surface and request/response DTOs.
- `service/`: business logic. `S3DocumentService`, `LoanApplicationService`, `FolderService` are central.
- `model/` and `repository/`: JPA entities and Spring Data repositories.
- `mismo/` and `mismo/parse/`: MISMO 3.4 importer/exporter and namespace-agnostic parsing helpers.
- `mapper/`: entity/DTO conversions.
- `validation/`: bean-validation extensions.
- `security/`: Cognito JWT conversion, current-user materialization, per-loan access guard.
- `config/`: Spring security, JPA, S3 clients.
- `integration/`: outbound integrations, currently GoHighLevel.
- `exception/`: controller advice and API error types.

## Architecture Invariants

Postgres is the operational store for queries, joins, JPA entities, workflow metadata, assignments, dashboard fields, document visibility, folder state, and audit rows. MISMO XML is the application-data interchange and canonical version substrate for loan application data. S3 stores document files and MISMO artifacts; S3 keys are immutable and lifecycle state belongs in object tags.

MISMO imports use an always-overwrite rule for fields the app models, including borrower names and SSNs. Whole-list child collections are replaced for residences, employments, income sources, assets, REOs, liabilities, declarations, housing expenses, purchase credits, and closing fees. Every import writes a `mismo_imports` audit row. If a file `CreatedDatetime` is older than the loan `updatedDate`, the controller returns `409 drift_detected`; the frontend can retry with `force=true`.

MISMO parsing is DOM + XPath using `local-name()` helpers, not an XSD-bound model. Export uses StAX via `MismoExporter` and `MismoXmlWriter`. Import currently covers URLA/application fields plus dashboard/closing-stage fields that have DB targets: loan terms, housing expenses, purchase credits, closing information, and closing fees.

## Auth And Access

Frontend auth uses Cognito Hosted UI through `react-oidc-context`. `frontend/src/services/apiClient.js` intentionally sends `id_token` first because Cognito access tokens may omit `email`, and the backend materializes local users by email then Cognito sub.

Backend JWT validation is configured by `SecurityConfig` with issuer `https://cognito-idp.us-west-1.amazonaws.com/us-west-1_S6iE2uego` by default. `CognitoJwtConverter` maps `cognito:groups` to Spring authorities.

Path rules are coarse. Per-loan access belongs on controller methods with `@PreAuthorize("@loanAccessGuard.canAccess(#id)")` or `#loanId`. `LoanAccessGuard` allows:

- `Admin` and `Manager` superusers.
- Assigned `LO` or `Processor`.
- Borrowers linked through `borrowers.user_id`.
- Real estate agents linked through `loan_agents.user_id`.

Use `@loanAccessGuard.isInternal()` for LO/Processor/Admin/Manager-only list and search endpoints.

## Status Workflow

`LoanStatus` defines:

`REGISTERED -> APPLICATION -> DISCLOSURES_SENT -> DISCLOSURES_SIGNED -> UNDERWRITING -> APPROVED -> APPRAISAL -> INSURANCE -> CTC -> DOCS_OUT -> FUNDED`

`DISPOSITIONED` is the terminal off-ramp. `fromString` accepts legacy `DRAFT`, `SUBMITTED`, `PROCESSING`, and `DENIED` values. Status writes should flow through `LoanApplicationService.updateApplicationStatus`, which validates the enum and writes `loan_status_history`.

## Schema And Migrations

All schema changes go through Flyway SQL files in `backend/src/main/resources/db/migration`. Do not edit committed migrations. JPA `ddl-auto=validate` is used outside tests, so entity/schema drift fails boot.

Current migrations:

- `V1`: initial application, borrower, employment, income, residence, declaration, property, liability, REO, document, GHL log tables.
- `V2`: `loan_status_history`.
- `V3`: `users`, assigned LO fields, borrower user links, `loan_agents`.
- `V4`: document visibility flags.
- `V5`: `assets`.
- `V6`: audit columns on existing entities.
- `V7`: S3 document fields.
- `V8`: loan identifiers.
- `V9`: `mismo_imports`.
- `V10`: closing information and closing fees.
- `V11`: workspace folders and document `folder_id`.
- `V12`: loan dashboard terms and housing expenses.
- `V13`: purchase credits and loan conditions.
- `V14`: property purchase/project fields and loan down payment.
- `V15`: Delete folder flag and lookup index.
- `V16`: loan notes.

Next migration is `V17__short_description.sql`.

Tests currently use `application-test.properties` with H2 and `ddl-auto=create-drop`, so migration validation is covered by boot/dev compile paths rather than all unit tests.

## Documents And Workspace

`S3DocumentService` owns S3 key, presigned URL, tag, HEAD verification, and delete behavior.

Key convention:

```text
applications/{application_id}/{party_role}/{document_type}/{doc_uuid}-{safe_filename}
loans/{loan_id}/{party_role}/{document_type}/{doc_uuid}-{safe_filename}
```

Tag convention:

```text
loan_state       active | funded | withdrawn | denied | canceled | incomplete
sensitivity      public | internal | confidential | restricted
retention_class  temporary | standard | compliance_archive
source           borrower_portal | dashboard | los_admin | system
application_id   {application_id}
loan_id          {loan_id}
```

Upload flow:

1. Frontend calls `POST /loan-applications/{loanId}/documents/upload-url`.
2. Backend creates a `documents` row with `upload_status='pending'` and returns a presigned PUT URL.
3. Browser PUTs the file directly to S3 with the matching `Content-Type`.
4. Frontend calls `PUT /loan-applications/{loanId}/documents/{docUuid}/confirm`.
5. Backend HEADs S3, records file size, flips status to `uploaded`, and applies tags.

Workspace folders are DB-only tree nodes. S3 keys do not change when documents are moved, renamed, or reclassified. `FolderService` seeds a root folder plus 17 default subfolders, including `16 Old Loan Files` and `17 Delete`. Permanent document deletion is only allowed after a document is moved into the loan's Delete folder; S3 delete happens before the DB row is removed so failed object-lock/network deletes leave the DB row intact.

## Frontend Conventions

Use `apiClient` for all backend calls. Do not create another axios instance or attach auth headers in components.

Protected routes should wrap pages in `RequireAuth`. The 401 flow dispatches `auth:expired`; `App.js` sends the user back through Cognito while sessionStorage form drafts survive.

Route-level pages live in `frontend/src/pages`. Reusable controls live in `frontend/src/components`. The URLA form steps live in `frontend/src/components/forms`. Shared field helpers live in `frontend/src/components/form-fields`, `frontend/src/hooks`, and `frontend/src/utils`.

The multi-step form uses `react-hook-form`, `useDraftAutosave`, and validation summarization on next-step triggers. Keep required-field UX in the frontend unless the backend has a true domain invariant. Many backend child entities intentionally allow partial MISMO imports.

For controlled masked or transformed inputs, follow existing patterns:

- SSN and phone masking: `PersonalInfoField.js`.
- Down payment dollar/percent raw state: `LoanInformationStep.js`.
- Currency input display: `CurrencyInput.js`.

Some older pages such as `HomePage.js` and `Dashboard.js` contain mock/demo content and are not wired in `App.js`. Do not treat them as canonical without checking routes.

## Infra And Deployment-Sensitive Work

`infra/lib/documents-stack.ts` creates:

- `msfg-mortgage-app-documents-{env}` with versioning, Object Lock, lifecycle rules, tight CORS, and server access logging.
- `msfg-mortgage-app-documents-{env}-logs` for access logs.

`infra/lib/iam-stack.ts` creates the EC2 backend instance role with S3 object access, Object Lock guardrails, Cognito admin actions, SES send permissions, SSM, and CloudWatch agent policies. CDK stacks use `RemovalPolicy.RETAIN`; do not destroy document buckets.

Deployment host details are private operational context. Keep them outside this public repo.

## Change Playbooks

Backend endpoint:

1. Add controller method with coarse role and `LoanAccessGuard` method security.
2. Keep business rules in services unless the controller is strictly response shaping.
3. Add/update DTOs rather than exposing new entity internals by accident.
4. Add targeted tests where the behavior has validation, security, parsing, or mapping risk.

Schema/entity:

1. Add a new `V17+` Flyway migration.
2. Update the JPA entity and repository.
3. Ensure H2 PostgreSQL mode can parse the SQL.
4. Run backend compile or boot with the dev profile when possible.

MISMO mapping:

1. Use namespace-agnostic helpers in `mismo/parse`.
2. Preserve always-overwrite semantics and whole-list replacement where established.
3. Add fields to importer and exporter only when the DB has a clear target.
4. Update or add MISMO tests using samples under `backend/src/test/resources/mismo`.

Frontend feature:

1. Add service methods first.
2. Keep route pages in `pages/`, reusable pieces in `components/` or feature folders.
3. Reuse existing CSS variables and button/form classes unless a component has a local stylesheet pattern.
4. Verify auth redirects and sessionStorage drafts if the workflow crosses protected routes.

Document/workspace change:

1. Keep S3 keys immutable.
2. Move files by changing `documents.folder_id`.
3. Rename files by changing display `fileName`, not key or `safeFilename`.
4. Preserve Delete folder as the only permanent-delete path.

Infra change:

1. Prefer `npx cdk synth` for local validation.
2. Do not relax bucket public-access, Object Lock, lifecycle, or governance-bypass guardrails without explicit intent.
3. Avoid AWS calls unless the user asks for a deployed diff or deploy.
