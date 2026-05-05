-- ============================================================================
-- V12: Loan Dashboard backing tables
--
-- The application form (URLA) is borrower-filled: name, income, residences,
-- assets, declarations. The Loan Dashboard is the LO's view: terms (rate,
-- amount, amortization), proposed housing expenses, milestones, identifiers.
-- A MISMO import populates many of these fields; the LO edits the rest.
--
-- Two new tables in V12:
--   loan_terms        — 1:1 with loan_applications. The "this loan" row:
--                       base amount, note amount, note rate, amort type/term,
--                       lien priority, application-received date.
--   housing_expenses  — 1:many. One row per expense type per loan
--                       (P&I, RE tax, MI premium, HOA, homeowners insurance, …).
--
-- Future migrations can stack on this: rate locks, milestone dates, fee
-- itemization, etc. For now we keep the surface narrow so the MISMO importer
-- has clear targets and the dashboard has something concrete to render.
-- ============================================================================

CREATE TABLE loan_terms (
    id                          BIGSERIAL    PRIMARY KEY,
    application_id              BIGINT       NOT NULL UNIQUE
                                              REFERENCES loan_applications(id) ON DELETE CASCADE,
    base_loan_amount            DECIMAL(15,2),
    note_amount                 DECIMAL(15,2),
    -- Rate uses 4 decimal places to preserve quoted precision (e.g. 6.3750).
    note_rate_percent           DECIMAL(7,4),
    amortization_type           VARCHAR(50),               -- Fixed | AdjustableRate | …
    amortization_term_months    INT,                        -- 360, 180, 240, …
    lien_priority_type          VARCHAR(50),               -- FirstLien | SecondLien | ThirdLien
    application_received_date   DATE,                      -- per the URLA
    created_at                  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_loan_terms_application ON loan_terms(application_id);

CREATE TABLE housing_expenses (
    id                BIGSERIAL    PRIMARY KEY,
    application_id    BIGINT       NOT NULL REFERENCES loan_applications(id) ON DELETE CASCADE,
    -- MISMO HousingExpenseType enum members (subset, free-form for forward compat):
    --   FirstMortgagePrincipalAndInterest, SecondMortgagePrincipalAndInterest,
    --   RealEstateTax, HomeownersInsurance, HazardInsurance, FloodInsurance,
    --   MIPremium, HomeownersAssociationDuesAndCondominiumFees,
    --   GroundRent, OtherHousingExpense
    expense_type      VARCHAR(64)  NOT NULL,
    timing_type       VARCHAR(20),                          -- Proposed | Present
    payment_amount    DECIMAL(12,2),
    sequence_number   INT,                                  -- preserves MISMO ordering
    created_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_housing_expenses_application ON housing_expenses(application_id);
CREATE INDEX idx_housing_expenses_type ON housing_expenses(application_id, expense_type);
