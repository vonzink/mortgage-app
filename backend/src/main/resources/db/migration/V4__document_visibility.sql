-- ============================================================================
-- V4: Document visibility flags (LO-controlled)
-- LO toggles per document; borrower/agent see filtered lists.
-- ============================================================================

ALTER TABLE documents ADD COLUMN visible_to_borrower BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE documents ADD COLUMN visible_to_agent    BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE documents ADD COLUMN uploaded_by_user_id INT NULL;
ALTER TABLE documents ADD COLUMN added_by_role       VARCHAR(50) NULL;  -- borrower, agent, lo

CREATE INDEX idx_documents_visible_borrower ON documents(visible_to_borrower);

-- (No FK on documents.uploaded_by_user_id — uploads can come from unauthenticated
--  flows in dev, and we'll stamp the user_id when we have it.)
