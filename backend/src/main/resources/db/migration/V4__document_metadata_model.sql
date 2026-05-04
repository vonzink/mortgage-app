-- Tighten the documents metadata model to match the Dropbox-style design.
-- The DB is the source of truth for user-facing identity, visibility, and lifecycle.
-- S3 only knows where the bytes live; the metadata model is intentionally separate.

-- Drop the legacy filesystem column (was used by the pre-S3 DocumentService).
ALTER TABLE documents DROP COLUMN file_path;

-- Rename for clarity. Both H2 and PostgreSQL accept this form.
ALTER TABLE documents RENAME COLUMN file_name TO original_filename;
ALTER TABLE documents RENAME COLUMN added_by_role TO uploaded_by_role;
ALTER TABLE documents RENAME COLUMN uploaded_at TO created_at;

-- Dropbox-like UX: users see a renameable display name; the original filename is preserved
-- for downloads and audit, but display_name is what shows in lists and breadcrumbs.
ALTER TABLE documents ADD COLUMN display_name VARCHAR(255);

-- Standard audit columns. Soft delete uses deleted_at IS NOT NULL as the predicate.
ALTER TABLE documents ADD COLUMN updated_at TIMESTAMP;
ALTER TABLE documents ADD COLUMN deleted_at TIMESTAMP;

CREATE INDEX idx_documents_deleted_at ON documents(deleted_at);
