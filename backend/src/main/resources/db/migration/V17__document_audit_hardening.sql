-- ============================================================================
-- V17: Document audit hardening
-- Adds missing audit timestamps, soft-delete, file hash, and description to
-- the documents table. Creates the polymorphic audit_log table for tracking
-- document/folder operations.
-- ============================================================================

-- ── Document entity hardening ───────────────────────────────────────────────

ALTER TABLE documents ADD COLUMN created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE documents ADD COLUMN updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE documents ADD COLUMN deleted_at  TIMESTAMP;
ALTER TABLE documents ADD COLUMN file_hash   VARCHAR(64);
ALTER TABLE documents ADD COLUMN description VARCHAR(1000);

-- Backfill created_at from uploaded_at for existing rows
UPDATE documents SET created_at = uploaded_at WHERE uploaded_at IS NOT NULL;

-- ── Audit log ───────────────────────────────────────────────────────────────

CREATE TABLE audit_log (
    id              BIGSERIAL PRIMARY KEY,
    entity_type     VARCHAR(50)  NOT NULL,
    entity_id       BIGINT       NOT NULL,
    action          VARCHAR(50)  NOT NULL,
    user_id         INT,
    user_role       VARCHAR(30),
    loan_id         BIGINT       NOT NULL,
    metadata_json   TEXT,
    ip_address      VARCHAR(45),
    created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_loan_time    ON audit_log(loan_id, created_at);
CREATE INDEX idx_audit_entity       ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_user         ON audit_log(user_id);
CREATE INDEX idx_audit_action       ON audit_log(action);
