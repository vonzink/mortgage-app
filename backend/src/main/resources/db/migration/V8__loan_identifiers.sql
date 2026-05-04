-- ============================================================================
-- V8: Loan identifiers
-- We carry up to four loan numbers per application:
--   * application_number (already exists)  — our internal APP###### value
--   * lendingpad_loan_number              — the R-number assigned by LendingPad
--   * investor_loan_number                — assigned post-sale to the investor
--   * mers_min                            — MERS Mortgage Identification Number
--
-- All are round-tripped via MISMO's LOAN_IDENTIFIERS block on import/export.
-- See MismoExporter / MismoImporter for the type-discriminator mapping.
-- ============================================================================

ALTER TABLE loan_applications ADD COLUMN lendingpad_loan_number VARCHAR(50);
ALTER TABLE loan_applications ADD COLUMN investor_loan_number   VARCHAR(50);
ALTER TABLE loan_applications ADD COLUMN mers_min               VARCHAR(20);

CREATE INDEX idx_lp_loan_number  ON loan_applications(lendingpad_loan_number);
CREATE INDEX idx_inv_loan_number ON loan_applications(investor_loan_number);
