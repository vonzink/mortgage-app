-- ============================================================================
-- V7: Document S3 fields
-- The borrower-portal flow uploads direct to S3 via presigned URL. We need
-- a stable per-document UUID (used in the S3 key for non-enumerable URLs)
-- and an upload-status column so we can tell pending uploads from confirmed.
-- file_path stores the full S3 key (we keep the column name for backward compat).
-- ============================================================================

ALTER TABLE documents ADD COLUMN doc_uuid VARCHAR(36) UNIQUE;
ALTER TABLE documents ADD COLUMN upload_status VARCHAR(20) NOT NULL DEFAULT 'pending';
ALTER TABLE documents ADD COLUMN safe_filename VARCHAR(255);
ALTER TABLE documents ADD COLUMN content_type VARCHAR(150);
ALTER TABLE documents ADD COLUMN party_role VARCHAR(20);  -- borrower | agent | lo | system

CREATE INDEX idx_documents_doc_uuid       ON documents(doc_uuid);
CREATE INDEX idx_documents_upload_status  ON documents(upload_status);
