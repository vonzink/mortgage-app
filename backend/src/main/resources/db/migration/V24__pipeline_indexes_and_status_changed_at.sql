-- ============================================================================
-- V24: Pipeline indexes + status_changed_at denormalization + loan_list_view
--
-- Backs the paged /api/loan-applications list endpoint and the typeahead
-- /api/loan-applications/search endpoint.
--
-- Decisions captured in docs/superpowers/specs/2026-05-22-pipeline-and-search-
-- at-scale-design.md (Q5: 1K–5K horizon → no ratio denorm; one narrow
-- denormalized status_changed_at to avoid joining loan_status_history per row
-- for the default stage-age sort).
-- ============================================================================

-- ---- status_changed_at on loan_applications --------------------------------
-- One ALTER per statement (H2 in PG-mode won't parse multi-clause ALTER).

ALTER TABLE loan_applications ADD COLUMN status_changed_at TIMESTAMP;

-- Backfill from history MAX, falling back to created_date for loans that
-- never transitioned (the original REGISTERED row).
UPDATE loan_applications la
   SET status_changed_at = COALESCE(
     (SELECT MAX(transitioned_at) FROM loan_status_history
       WHERE loan_application_id = la.id),
     la.created_date,
     CURRENT_TIMESTAMP
   );

ALTER TABLE loan_applications ALTER COLUMN status_changed_at SET NOT NULL;

-- ---- Indexes for the paged list query --------------------------------------

-- Default landing query: WHERE status IN (...) ORDER BY created_date DESC.
CREATE INDEX idx_loan_apps_status_created
  ON loan_applications(status, created_date DESC);

-- Stage-age sort: ORDER BY status_changed_at ASC.
CREATE INDEX idx_loan_apps_status_changed_at
  ON loan_applications(status_changed_at);

-- Outstanding-conditions filter — composite (application_id, status) so the
-- planner can do an index-only scan for "any Outstanding conditions for this
-- loan?" without scanning all conditions. (Partial-index `WHERE` clauses
-- aren't portable to H2 PG-mode; the composite is the cross-engine form.)
CREATE INDEX idx_loan_conditions_app_status
  ON loan_conditions(application_id, status);

-- Closing-window filter. Plain index on closing_date — H2 PG-mode rejects
-- partial-index `WHERE` clauses, and the NULL fraction here is small enough
-- that a full index is fine in prod.
CREATE INDEX idx_closing_info_date
  ON closing_information(closing_date);

-- ---- Typeahead: identifier prefix indexes ----------------------------------

CREATE INDEX idx_loan_apps_lp_number     ON loan_applications(lendingpad_loan_number);
CREATE INDEX idx_loan_apps_mers_min      ON loan_applications(mers_min);
CREATE INDEX idx_loan_apps_investor_num  ON loan_applications(investor_loan_number);

-- ---- Typeahead: trigram on borrower name -----------------------------------
-- pg_trgm + GIN are Postgres-only and H2 rejects the syntax outright (not as
-- a no-op). To keep this migration cross-engine, the trigram bits are applied
-- directly to prod RDS as a one-shot after deploy:
--
--   CREATE EXTENSION IF NOT EXISTS pg_trgm;
--   CREATE INDEX idx_borrowers_name_trgm
--     ON borrowers USING GIN (
--       (COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')) gin_trgm_ops
--     );
--
-- The LoanSearchService uses ILIKE %q% which the Postgres planner can lower
-- to the trigram index when present, and which works unindexed in H2 / on a
-- fresh prod DB before the manual step runs. The search degrades gracefully
-- in both directions, so this is safe.

-- ---- loan_list_view --------------------------------------------------------
-- Read-only join used by both the paged list endpoint and the typeahead.
-- Picks the lowest-sequence borrower as the "primary" borrower for display.

CREATE OR REPLACE VIEW loan_list_view AS
SELECT
  la.id,
  la.application_number,
  la.status,
  la.status_changed_at,
  la.created_date,
  la.loan_type,
  la.loan_amount,
  la.property_value,
  la.lendingpad_loan_number,
  la.mers_min,
  la.investor_loan_number,
  la.assigned_lo_id,
  la.assigned_lo_name,
  b.first_name  AS borrower_first_name,
  b.last_name   AS borrower_last_name,
  TRIM(BOTH ' ' FROM COALESCE(b.first_name, '') || ' ' || COALESCE(b.last_name, '')) AS borrower_name,
  p.city         AS property_city,
  p.state        AS property_state,
  ci.closing_date AS est_closing_date
FROM loan_applications la
LEFT JOIN borrowers b ON b.id = (
  SELECT id FROM borrowers
   WHERE application_id = la.id
   ORDER BY COALESCE(sequence_number, 999), id
   LIMIT 1
)
LEFT JOIN properties p ON p.application_id = la.id
LEFT JOIN closing_information ci ON ci.loan_application_id = la.id;
