# Mortgage App — Roadmap

Living document tracking the document management hardening initiative and what comes next. Check items off as they land. New work goes under **Backlog** until promoted to a numbered phase.

**Working directory:** `/Users/zacharyzink/MSFG/WebProjects/mortgage-app`
**Branch strategy:** one feature branch per phase (`phase-4-admin-config`, `frontend-doc-mgmt`, etc.), squash-merge to `main`.

---

## Initiative: Document Management Hardening

Goal: take document handling from "MVP upload + folders" to production-grade with audit, review workflow, classification, and search.

### Phase 1 — Audit + Entity Hardening + Service Extraction ✅
- [x] V17 migration: `created_at`, `updated_at`, `deleted_at`, `file_hash`, `description` + `audit_log` table
- [x] `AuditLog` entity, repository, `AuditService`
- [x] `DocumentService` extracted from 458-line `DocumentController` (now ~120 lines)
- [x] `DocumentRepository` filters `deleted_at IS NULL`
- [x] `AuditLogController`: `GET /loan-applications/{loanId}/audit-log`, `.../documents/{docUuid}/history`
- [x] Frontend `services/auditService.js`
- [x] Frontend `workspace/DocumentHistory.jsx` modal
- [x] Frontend: "History" action in `FileTable.jsx` row menu
- [x] Frontend: description field in `EditDocumentModal.jsx`
- [x] SHA-256 hash computation in `S3DocumentService` (computed on confirmUpload, stored on `file_hash`, included in audit metadata)

### Phase 2 — Document Status / Review Workflow ✅
- [x] V18 migration: `document_status`, `reviewer_*` columns, `document_status_history` table
- [x] `DocumentStatus` enum (10 states, validated transitions)
- [x] `DocumentStatusHistory` entity + repository
- [x] Endpoints: `PUT /{docUuid}/status`, `POST /accept`, `POST /reject`, `POST /request-revision`, `GET /status-history`
- [x] Frontend: status badge column in `FileTable.jsx`
- [x] Frontend: `workspace/DocumentReviewPanel.jsx` slide-out
- [x] Frontend: status filter dropdown in `WorkspaceTab.jsx`
- [x] Frontend: review/transition actions wired in `services/workspaceService.js`

### Phase 3 — Document Type Classification ✅
- [x] V19 migration: `document_types` table + `document_type_id` on documents
- [x] 16 mortgage doc types seeded (W-2, Pay Stub, Bank Statement, …)
- [x] `DocumentType` entity, repository, `DocumentTypeController`
- [x] Upload validation: MIME type + file size against `DocumentType` rules
- [x] Auto-route uploads to `defaultFolderName`
- [x] Frontend: tag picker in `EditDocumentModal` reads from `/document-types` (free-text fallback)
- [x] Frontend: `UploadTypeModal` — LO picks doc type before files go up (replaces hardcoded "Other")

### Phase 4 — Admin Configuration ✅
- [x] `AdminDocumentTypeController` — CRUD for doc types (Admin-only, `/admin/document-types`)
- [x] V21 migration: `folder_templates` table (externalizes hardcoded folder list)
- [x] `FolderTemplate` entity + repository
- [x] `AdminFolderTemplateController` — CRUD for folder templates (`/admin/folder-templates`)
- [x] `FolderService` reads from DB instead of hardcoded list
- [x] `pages/admin/AdminHome.js` + `DocumentTypesAdmin.js` + `FolderTemplatesAdmin.js`
- [x] `hooks/useRoles.js` — frontend role detection from Cognito groups
- [x] Admin link in `Header.js` (gated on `isAdmin`)

### Phase 5 — Search & Filtering ✅
- [x] V20 migration: composite indexes on documents
- [x] `GET .../documents/search` endpoint (paginated, multi-filter)
- [x] Frontend: search bar in `WorkspaceTab.jsx`
- [x] Frontend: status filter dropdown
- [x] Frontend: document-type filter dropdown
- [x] Frontend: party-role filter (Borrower / Agent / LO / System)
- [x] Backend: `partyRole` query param on `/documents/search`
- [ ] Frontend: date-range filter (backlog)

### Phase 6 — Bulk Review ✅
- [x] Backend: `POST /documents/bulk-review` — single decision (ACCEPTED / REJECTED / NEEDS_BORROWER_ACTION) applied to N docs, per-doc failures collected not aborted
- [x] `DocumentService.bulkReview` reuses single-doc review path so audit + status-history stay consistent
- [x] Frontend: bulk-action bar in `WorkspaceTab` toolbar (Accept / Request revision / Reject)
- [x] Frontend: prompt for required notes on reject / revision

---

## Production Deployment Notes

- **V15 checksum will differ on prod** — needs `flyway repair` after deploy (partial index → composite index fix).
- After V17–V20 land in prod, verify `audit_log` entries are created on a real upload/confirm cycle.

---

## Backlog (not yet scheduled)

- Virus scanning hook on `confirmUpload` (ClamAV / S3 scan integration)
- Document versioning (replace file, keep history)
- Email notifications on `NEEDS_BORROWER_ACTION`
- Borrower portal: surface review status + reviewer notes
- Required-document checklist driven by `DocumentType.requiredForMilestones`
- Deprecate legacy `upload_status` field once frontend fully migrated
- Date-range filter on `/documents/search`
- Loan-participant `uploadedBy` user picker (currently filtered by party role)

---

## Verification Checklist (run after each phase lands)

1. `mvn -q -DskipTests compile`
2. `mvn spring-boot:run -Dspring-boot.run.profiles=dev` — confirms H2 migration + startup
3. `mvn test`
4. Manual smoke test via frontend workspace or curl
5. Verify `audit_log` entries created for each document operation
