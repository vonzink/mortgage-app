-- Document visibility and party-role columns.
-- party_role identifies who uploaded (borrower/agent/lo/system); visibility flags gate listing/download.
-- Phase D will enforce these via @PreAuthorize + LoanAccessGuard.

ALTER TABLE documents ADD COLUMN party_role VARCHAR(20) DEFAULT 'borrower';
ALTER TABLE documents ADD COLUMN added_by_role VARCHAR(20);
ALTER TABLE documents ADD COLUMN uploaded_by_user_id BIGINT;
ALTER TABLE documents ADD COLUMN visible_to_borrower BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE documents ADD COLUMN visible_to_agent BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX idx_documents_party_role ON documents(party_role);
