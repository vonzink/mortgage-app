-- ============================================================================
-- V27: loan_applications.source_lead_id
--
-- External idempotency key for applications created via the borrower intake
-- endpoint (POST /loan-applications/intake) from the msfg.us apply funnel.
-- UNIQUE so a retried hand-off (or a double-fired client effect) collapses to
-- one application instead of creating duplicates. NULL for all app-created
-- rows. One statement per line (H2 PG-mode quirk).
-- ============================================================================

ALTER TABLE loan_applications ADD COLUMN source_lead_id VARCHAR(100);

CREATE UNIQUE INDEX ux_loan_applications_source_lead_id
    ON loan_applications(source_lead_id);
