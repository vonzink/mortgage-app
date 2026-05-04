-- ============================================================================
-- V2: Loan status history
-- Audit trail for every status transition. The current status lives on
-- loan_applications.status; this table records who changed it, when, and any
-- attached note.
-- ============================================================================

CREATE TABLE loan_status_history (
    id BIGSERIAL PRIMARY KEY,
    loan_application_id BIGINT NOT NULL,
    status VARCHAR(30) NOT NULL,                  -- LoanStatus value at time of transition
    transitioned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    transitioned_by_user_id INT NULL,             -- FK to users.id (added in V3); null = system
    note VARCHAR(1000),                            -- Optional LO-entered note explaining the move
    FOREIGN KEY (loan_application_id) REFERENCES loan_applications(id) ON DELETE CASCADE
);

CREATE INDEX idx_lsh_application ON loan_status_history(loan_application_id);
CREATE INDEX idx_lsh_transitioned_at ON loan_status_history(transitioned_at);
