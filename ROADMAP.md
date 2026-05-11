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
- [ ] SHA-256 hash computation in `S3DocumentService.verifyUpload` (deferred — backlog)

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
- [ ] Frontend: upload-form doc type dropdown (currently still defaults to "Other" — backlog)

### Phase 4 — Admin Configuration ✅ (branch `phase-4-admin-config`, not yet merged)
- [x] `AdminDocumentTypeController` — CRUD for doc types (Admin-only)
- [x] V21 migration + `FolderTemplate` entity/repo + `AdminFolderTemplateController`
- [x] `FolderService` reads from DB instead of hardcoded list
- [x] `pages/admin/{AdminHome,DocumentTypesAdmin,FolderTemplatesAdmin}.js` + `useRoles` hook

### Phase 5 — Search & Filtering ✅
- [x] V20 migration: composite indexes on documents
- [x] `GET .../documents/search` endpoint (paginated, multi-filter)
- [x] Frontend: search bar in `WorkspaceTab.jsx`
- [x] Frontend: status filter dropdown
- [ ] Frontend: type / uploader / date-range filters (backlog)

---

## Production Deployment Notes

- **V15 checksum will differ on prod** — needs `flyway repair` after deploy (partial index → composite index fix).
- After V17–V20 land in prod, verify `audit_log` entries are created on a real upload/confirm cycle.

---

## Backlog (not yet scheduled)

- Virus scanning hook on `confirmUpload` (ClamAV / S3 scan integration)
- Bulk operations (accept/reject multiple docs)
- Document versioning (replace file, keep history)
- Email notifications on `NEEDS_BORROWER_ACTION`
- Borrower portal: surface review status + reviewer notes
- Required-document checklist driven by `DocumentType.requiredForMilestones`
- Deprecate legacy `upload_status` field once frontend fully migrated
- Upload-flow doc type dropdown (Phase 3 — currently still defaults to "Other")
- Additional search filters (document type, uploader, date range)
- SHA-256 hash on upload confirm (Phase 1 deferred item)

---

## Verification Checklist (run after each phase lands)

1. `mvn -q -DskipTests compile`
2. `mvn spring-boot:run -Dspring-boot.run.profiles=dev` — confirms H2 migration + startup
3. `mvn test`
4. Manual smoke test via frontend workspace or curl
5. Verify `audit_log` entries created for each document operation
