-- ============================================================================
-- V18: Document status/review workflow
-- Adds a richer document status enum alongside the legacy upload_status,
-- review tracking fields, and an append-only status history table.
-- ============================================================================

-- ── Document status + review fields ─────────────────────────────────────────

ALTER TABLE documents ADD COLUMN document_status  VARCHAR(30) NOT NULL DEFAULT 'PENDING_UPLOAD';
ALTER TABLE documents ADD COLUMN reviewed_by_user_id INT;
ALTER TABLE documents ADD COLUMN reviewer_notes   VARCHAR(2000);
ALTER TABLE documents ADD COLUMN reviewed_at       TIMESTAMP;

-- Migrate existing data from legacy upload_status
UPDATE documents SET document_status = 'UPLOADED'        WHERE upload_status = 'uploaded';
UPDATE documents SET document_status = 'PENDING_UPLOAD'  WHERE upload_status = 'pending';
UPDATE documents SET document_status = 'DELETED_SOFT'    WHERE upload_status = 'deleted';
UPDATE documents SET document_status = 'SCAN_FAILED'     WHERE upload_status = 'failed';

CREATE INDEX idx_documents_status ON documents(application_id, document_status);

-- ── Status history ──────────────────────────────────────────────────────────

CREATE TABLE document_status_history (
    id                      BIGSERIAL PRIMARY KEY,
    document_id             BIGINT      NOT NULL,
    status                  VARCHAR(30) NOT NULL,
    transitioned_at         TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    transitioned_by_user_id INT,
    note                    VARCHAR(1000),
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

CREATE INDEX idx_dsh_document ON document_status_history(document_id, transitioned_at);
