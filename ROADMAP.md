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
- [ ] Frontend `services/auditService.js`
- [ ] Frontend `workspace/DocumentHistory.jsx` modal
- [ ] Frontend: "History" action in `FileTable.jsx` row menu
- [ ] Frontend: description field in `EditDocumentModal.jsx`
- [ ] SHA-256 hash computation in `S3DocumentService.verifyUpload`

### Phase 2 — Document Status / Review Workflow ✅ (backend)
- [x] V18 migration: `document_status`, `reviewer_*` columns, `document_status_history` table
- [x] `DocumentStatus` enum (10 states, validated transitions)
- [x] `DocumentStatusHistory` entity + repository
- [x] Endpoints: `PUT /{docUuid}/status`, `POST /accept`, `POST /reject`, `POST /request-revision`, `GET /status-history`
- [ ] Frontend: status badge column in `FileTable.jsx`
- [ ] Frontend: `workspace/DocumentReviewPanel.jsx` slide-out
- [ ] Frontend: status filter dropdown in `WorkspaceTab.jsx`
- [ ] Frontend: wire review actions in `services/workspaceService.js`

### Phase 3 — Document Type Classification ✅ (backend)
- [x] V19 migration: `document_types` table + `document_type_id` on documents
- [x] 16 mortgage doc types seeded (W-2, Pay Stub, Bank Statement, …)
- [x] `DocumentType` entity, repository, `DocumentTypeController`
- [x] Upload validation: MIME type + file size against `DocumentType` rules
- [x] Auto-route uploads to `defaultFolderName`
- [ ] Frontend: replace free-text doc type input with dropdown from `/document-types`
- [ ] Frontend: show type badge in `FileTable.jsx`

### Phase 4 — Admin Configuration ✅
- [x] `AdminDocumentTypeController` — CRUD for doc types (Admin-only, `/admin/document-types`)
- [x] V21 migration: `folder_templates` table (externalizes hardcoded folder list)
- [x] `FolderTemplate` entity + repository
- [x] `AdminFolderTemplateController` — CRUD for folder templates (`/admin/folder-templates`)
- [x] `FolderService` reads from DB instead of hardcoded list
- [x] `pages/admin/AdminHome.js` + `DocumentTypesAdmin.js` + `FolderTemplatesAdmin.js`
- [x] `hooks/useRoles.js` — frontend role detection from Cognito groups
- [x] Admin link in `Header.js` (gated on `isAdmin`)

### Phase 5 — Search & Filtering ✅ (backend)
- [x] V20 migration: composite indexes on documents
- [x] `GET .../documents/search` endpoint (paginated, multi-filter)
- [ ] Frontend: search bar in `WorkspaceTab.jsx`
- [ ] Frontend: filter dropdowns (status, type, uploader, date range)

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

---

## Verification Checklist (run after each phase lands)

1. `mvn -q -DskipTests compile`
2. `mvn spring-boot:run -Dspring-boot.run.profiles=dev` — confirms H2 migration + startup
3. `mvn test`
4. Manual smoke test via frontend workspace or curl
5. Verify `audit_log` entries created for each document operation
