-- ============================================================================
-- V10: Closing-stage data (Chunk M)
-- One closing_information row per loan_application (1:1) with all the singleton
-- fields the LO collects/imports between Declarations and Submit. Itemized fees
-- live in closing_fees (1:N).
-- Real-estate agents already have a home in loan_agents (V3); we just wire UI.
-- ============================================================================

CREATE TABLE closing_information (
    loan_application_id BIGINT PRIMARY KEY,

    -- Closing logistics
    closing_date DATE,
    closing_time VARCHAR(20),                -- "11:30 AM EST"
    closing_method VARCHAR(50),              -- Wet | Dry | Hybrid | eClosing
    closing_company_name VARCHAR(255),
    closing_company_phone VARCHAR(20),

    -- Title
    title_company_name VARCHAR(255),
    title_company_phone VARCHAR(20),
    title_company_email VARCHAR(255),
    title_insurance_amount DECIMAL(15,2),

    -- Appraisal
    appraisal_mgmt_company VARCHAR(255),
    appraiser_name VARCHAR(255),
    appraised_value DECIMAL(15,2),
    appraisal_date DATE,
    appraisal_fee DECIMAL(15,2),

    -- Mortgage insurance
    mi_type VARCHAR(30),                     -- BPMI | LPMI | FHA_MIP | VA_FUND_FEE | USDA_GUAR | None
    mi_monthly_amount DECIMAL(10,2),
    mi_upfront_amount DECIMAL(15,2),
    mi_lifetime_indicator BOOLEAN,

    -- Hazard insurance
    hazard_insurance_company VARCHAR(255),
    hazard_insurance_annual_premium DECIMAL(15,2),
    hazard_insurance_escrowed BOOLEAN DEFAULT TRUE,

    -- Seller (purchase only)
    seller_name VARCHAR(255),
    seller_phone VARCHAR(20),
    seller_email VARCHAR(255),
    seller_concession_amount DECIMAL(15,2),

    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (loan_application_id) REFERENCES loan_applications(id) ON DELETE CASCADE
);

CREATE TABLE closing_fees (
    id BIGSERIAL PRIMARY KEY,
    loan_application_id BIGINT NOT NULL,
    sequence_number INT,
    fee_type VARCHAR(100),                   -- free-text per user spec (Origination, Processing, etc.)
    fee_amount DECIMAL(15,2),
    paid_to VARCHAR(255),
    paid_by VARCHAR(50),                     -- Borrower | Seller | Lender | Other
    description VARCHAR(500),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (loan_application_id) REFERENCES loan_applications(id) ON DELETE CASCADE
);
CREATE INDEX idx_closing_fees_loan ON closing_fees(loan_application_id);
