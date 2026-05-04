-- ============================================================================
-- V9: MISMO import audit
-- One row per successful import; used by the dashboard's audit panel and the
-- revert UI (Chunk E). The S3 checkpoint key references the original uploaded
-- file (we keep the bytes verbatim so revert is a literal re-upload).
-- ============================================================================

CREATE TABLE mismo_imports (
    id BIGSERIAL PRIMARY KEY,
    loan_application_id BIGINT NOT NULL,
    imported_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    imported_by_user_id INT,
    source_filename VARCHAR(500),
    s3_checkpoint_key VARCHAR(500),                 -- where the original file is parked
    file_created_datetime TIMESTAMP,                -- from the file's <CreatedDatetime>
    fields_changed_count INT NOT NULL DEFAULT 0,
    fields_changed_summary TEXT,                    -- JSON list — readable by the audit UI
    forced BOOLEAN NOT NULL DEFAULT FALSE,          -- true if imported despite drift warning
    FOREIGN KEY (loan_application_id) REFERENCES loan_applications(id) ON DELETE CASCADE,
    FOREIGN KEY (imported_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX idx_mismo_imports_loan ON mismo_imports(loan_application_id);
CREATE INDEX idx_mismo_imports_at   ON mismo_imports(imported_at);
