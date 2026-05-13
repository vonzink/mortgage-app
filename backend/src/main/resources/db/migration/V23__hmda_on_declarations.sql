-- ============================================================================
-- V23: HMDA government-monitoring fields on declarations
--
-- HMDA (Home Mortgage Disclosure Act) data is collected per borrower at
-- application and reported to the CFPB. MISMO 3.4 carries it inside
-- PARTY/INDIVIDUAL/GOVERNMENT_MONITORING with HMDA_RACES (1..N),
-- HMDA_ETHNICITIES (1..N), HMDAGenderType, plus refusal indicators.
--
-- Storage decision: comma-separated VARCHAR rather than child tables. HMDA
-- values are short controlled vocab (race ≤6, ethnicity ≤7) and never queried
-- individually — they're displayed and reported as a set. Child tables would
-- multiply schema noise without query benefit.
--
-- application_taken_method belongs to the application, but the form groups it
-- with HMDA in the Declarations step so we colocate the column on declarations.
--
-- One ALTER TABLE per column — H2 (used in dev) does not support multi-clause
-- ALTERs the way Postgres does.
-- ============================================================================

ALTER TABLE declarations ADD COLUMN hmda_race VARCHAR(255);
ALTER TABLE declarations ADD COLUMN hmda_race_refusal BOOLEAN DEFAULT FALSE;
ALTER TABLE declarations ADD COLUMN hmda_ethnicity VARCHAR(255);
ALTER TABLE declarations ADD COLUMN hmda_ethnicity_refusal BOOLEAN DEFAULT FALSE;
ALTER TABLE declarations ADD COLUMN hmda_ethnicity_origin VARCHAR(255);
ALTER TABLE declarations ADD COLUMN hmda_sex VARCHAR(50);
ALTER TABLE declarations ADD COLUMN hmda_sex_refusal BOOLEAN DEFAULT FALSE;
ALTER TABLE declarations ADD COLUMN application_taken_method VARCHAR(50);
