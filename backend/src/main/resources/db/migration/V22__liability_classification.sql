-- ============================================================================
-- V22: Liability classification (Omit / Payoff / Duplicate)
--
-- The form currently has two booleans (payoff_status, to_be_paid_off) that
-- model the same axis poorly. The LO needs to label each liability with
-- ONE of: NULL (use as-is), 'Omit' (don't count in DTI), 'Payoff' (will be
-- paid off at closing), 'Duplicate' (same debt reported twice by bureaus).
--
-- We keep the legacy booleans rather than dropping them so older form
-- submissions (and any reads from prior code paths) keep working. The
-- importer + UI are the source of truth for the new column.
--
-- borrower_id already exists on liabilities (from V1__init) — no FK change
-- needed; the importer will start populating it via xlink routing.
-- ============================================================================

ALTER TABLE liabilities
    ADD COLUMN exclusion_reason VARCHAR(20);

-- Cheap lookup when filtering DTI math by inclusion status. Plain index
-- (not partial) so H2-in-PG-mode dev parses it identically to prod.
CREATE INDEX idx_liabilities_exclusion_reason
    ON liabilities(exclusion_reason);
