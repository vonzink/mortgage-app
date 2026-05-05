-- ============================================================================
-- V13: Purchase credits + Loan conditions (Loan Dashboard expansion)
--
-- purchase_credits — money credited toward closing that didn't come from the
--   borrower's own funds. MISMO carries them in DEAL/LOAN/PURCHASE_CREDITS
--   (Earnest Money, Seller Credit, Lender Credit, etc.). Multiple per loan.
--
-- loan_conditions — UW conditions tracked on the Loan Dashboard. One row per
--   condition; status moves Outstanding → Cleared (or Waived). Type buckets
--   them into PriorToDocs / PriorToFunding / AtClosing / PostClose to support
--   the UW workflow.
-- ============================================================================

CREATE TABLE purchase_credits (
    id               BIGSERIAL    PRIMARY KEY,
    application_id   BIGINT       NOT NULL REFERENCES loan_applications(id) ON DELETE CASCADE,
    -- MISMO PurchaseCreditType enum: EarnestMoney | SellerCredit | LenderCredit |
    -- RelocationFunds | EmployerAssistedHousing | LeasePurchaseFund | TradeEquity | ...
    credit_type      VARCHAR(64)  NOT NULL,
    amount           DECIMAL(12,2),
    source           VARCHAR(255),                 -- "Seller", "Lender", "Builder" — free-form
    notes            VARCHAR(500),
    sequence_number  INT,                          -- preserves MISMO ordering
    created_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_purchase_credits_application ON purchase_credits(application_id);

-- Note: table named loan_conditions (not just "conditions") to avoid colliding
-- with the SQL keyword family and to keep the table name self-explanatory.
CREATE TABLE loan_conditions (
    id                  BIGSERIAL     PRIMARY KEY,
    application_id      BIGINT        NOT NULL REFERENCES loan_applications(id) ON DELETE CASCADE,
    condition_text      VARCHAR(2000) NOT NULL,                          -- the actual condition language
    condition_type      VARCHAR(50),                                     -- PriorToDocs | PriorToFunding | AtClosing | PostClose | Other
    status              VARCHAR(20)   NOT NULL DEFAULT 'Outstanding',    -- Outstanding | Cleared | Waived
    assigned_to_user_id BIGINT,
    due_date            DATE,
    cleared_at          TIMESTAMP,
    cleared_by_user_id  BIGINT,
    notes               VARCHAR(2000),
    created_by_user_id  BIGINT,
    created_at          TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_loan_conditions_application ON loan_conditions(application_id);
CREATE INDEX idx_loan_conditions_status ON loan_conditions(application_id, status);
