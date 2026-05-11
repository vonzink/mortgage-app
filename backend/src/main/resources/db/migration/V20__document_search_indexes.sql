-- ============================================================================
-- V20: Document search indexes
-- Composite indexes for the document search endpoint — status filtering,
-- type filtering, date range queries, and uploader filtering.
-- ============================================================================

CREATE INDEX idx_doc_status       ON documents(application_id, document_status, deleted_at);
CREATE INDEX idx_doc_type_id      ON documents(application_id, document_type_id);
CREATE INDEX idx_doc_uploaded_at  ON documents(application_id, uploaded_at);
CREATE INDEX idx_doc_uploader     ON documents(application_id, uploaded_by_user_id);
