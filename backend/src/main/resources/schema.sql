-- Mortgage Application Database Schema (H2 Compatible)

-- Main application table
CREATE TABLE loan_applications (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    application_number VARCHAR(50) UNIQUE NOT NULL,
    loan_purpose VARCHAR(50), -- Purchase, Refinance, CashOut
    loan_type VARCHAR(50), -- FHA, Conventional, VA, USDA
    loan_amount DECIMAL(12,2),
    property_value DECIMAL(12,2),
    status VARCHAR(30) DEFAULT 'DRAFT', -- DRAFT, SUBMITTED, PROCESSING, APPROVED, DENIED
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ghl_contact_id VARCHAR(100) -- Go High Level contact ID
);

-- Create indexes separately for H2
CREATE INDEX idx_application_number ON loan_applications(application_number);
CREATE INDEX idx_status ON loan_applications(status);

-- Property information
CREATE TABLE properties (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    application_id BIGINT NOT NULL,
    address_line VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(2),
    zip_code VARCHAR(10),
    county VARCHAR(100),
    property_type VARCHAR(50), -- PrimaryResidence, SecondHome, Investment
    property_value DECIMAL(12,2),
    construction_type VARCHAR(50), -- SiteBuilt, Manufactured
    year_built INT,
    units_count INT DEFAULT 1,
    FOREIGN KEY (application_id) REFERENCES loan_applications(id) ON DELETE CASCADE
);

-- Borrowers
CREATE TABLE borrowers (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    application_id BIGINT NOT NULL,
    sequence_number INT,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    ssn VARCHAR(255), -- Encrypted
    birth_date DATE,
    marital_status VARCHAR(30),
    email VARCHAR(100),
    phone VARCHAR(20),
    citizenship_type VARCHAR(50), -- USCitizen, PermanentResident, NonPermanentResident
    dependents_count INT DEFAULT 0,
    current_address_line VARCHAR(255),
    current_city VARCHAR(100),
    current_state VARCHAR(2),
    current_zip_code VARCHAR(10),
    FOREIGN KEY (application_id) REFERENCES loan_applications(id) ON DELETE CASCADE
);

-- Create index for borrowers
CREATE INDEX idx_borrower_application ON borrowers(application_id);

-- Employment records
CREATE TABLE employment (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    borrower_id BIGINT NOT NULL,
    sequence_number INT,
    employer_name VARCHAR(255),
    position VARCHAR(100),
    employer_phone VARCHAR(20),
    employer_address VARCHAR(255),
    employer_city VARCHAR(100),
    employer_state VARCHAR(2),
    employer_zip VARCHAR(10),
    start_date DATE,
    end_date DATE,
    monthly_income DECIMAL(10,2),
    employment_status VARCHAR(30), -- Present, Prior, Current, Previous
    is_present BOOLEAN DEFAULT FALSE,
    self_employed BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (borrower_id) REFERENCES borrowers(id) ON DELETE CASCADE
);

-- Create index for employment
CREATE INDEX idx_employment_borrower ON employment(borrower_id);

-- Income sources (non-employment)
CREATE TABLE income_sources (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    borrower_id BIGINT NOT NULL,
    income_type VARCHAR(50), -- SocialSecurity, Pension, Disability, Other
    monthly_amount DECIMAL(10,2),
    description VARCHAR(255),
    FOREIGN KEY (borrower_id) REFERENCES borrowers(id) ON DELETE CASCADE
);

-- Liabilities
CREATE TABLE liabilities (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    application_id BIGINT NOT NULL,
    borrower_id BIGINT,
    account_number VARCHAR(100),
    creditor_name VARCHAR(255),
    liability_type VARCHAR(50), -- MortgageLoan, Revolving, Installment, Other
    monthly_payment DECIMAL(10,2),
    unpaid_balance DECIMAL(12,2),
    payoff_status BOOLEAN DEFAULT FALSE,
    to_be_paid_off BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (application_id) REFERENCES loan_applications(id) ON DELETE CASCADE,
    FOREIGN KEY (borrower_id) REFERENCES borrowers(id) ON DELETE SET NULL
);

-- Create index for liabilities
CREATE INDEX idx_liability_application ON liabilities(application_id);

-- REO Properties (Real Estate Owned)
CREATE TABLE reo_properties (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    borrower_id BIGINT NOT NULL,
    sequence_number INT NOT NULL,
    address_line VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(2) NOT NULL,
    zip_code VARCHAR(10) NOT NULL,
    property_type VARCHAR(50) NOT NULL, -- PrimaryResidence, SecondHome, Investment
    property_value DECIMAL(15,2) NOT NULL,
    monthly_rental_income DECIMAL(15,2),
    monthly_payment DECIMAL(15,2),
    unpaid_balance DECIMAL(15,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (borrower_id) REFERENCES borrowers(id) ON DELETE CASCADE
);

-- Create index for REO properties
CREATE INDEX idx_reo_borrower ON reo_properties(borrower_id);

-- Borrower addresses/residency
CREATE TABLE residences (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    borrower_id BIGINT NOT NULL,
    address_line VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(2),
    zip_code VARCHAR(10),
    residency_type VARCHAR(30), -- Current, Prior
    residency_basis VARCHAR(30), -- Own, Rent, LivingRentFree
    duration_months INT,
    monthly_rent DECIMAL(10,2),
    FOREIGN KEY (borrower_id) REFERENCES borrowers(id) ON DELETE CASCADE
);

-- Declarations (yes/no questions)
CREATE TABLE declarations (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    borrower_id BIGINT NOT NULL,
    outstanding_judgments BOOLEAN DEFAULT FALSE,
    bankruptcy BOOLEAN DEFAULT FALSE,
    foreclosure BOOLEAN DEFAULT FALSE,
    lawsuit BOOLEAN DEFAULT FALSE,
    loan_foreclosure BOOLEAN DEFAULT FALSE,
    presently_delinquent BOOLEAN DEFAULT FALSE,
    alimony_child_support BOOLEAN DEFAULT FALSE,
    borrowing_down_payment BOOLEAN DEFAULT FALSE,
    comaker_endorser BOOLEAN DEFAULT FALSE,
    us_citizen BOOLEAN DEFAULT TRUE,
    permanent_resident BOOLEAN DEFAULT FALSE,
    intent_to_occupy BOOLEAN DEFAULT TRUE,
    down_payment_gift BOOLEAN DEFAULT FALSE,
    gift_source VARCHAR(255),
    gift_amount DECIMAL(12,2),
    co_signer_obligation BOOLEAN DEFAULT FALSE,
    pending_credit_inquiry BOOLEAN DEFAULT FALSE,
    credit_explanation TEXT,
    employment_gap_explanation TEXT,
    income_verification_consent BOOLEAN DEFAULT TRUE,
    credit_report_consent BOOLEAN DEFAULT TRUE,
    property_insurance_required BOOLEAN DEFAULT TRUE,
    flood_insurance_required BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (borrower_id) REFERENCES borrowers(id) ON DELETE CASCADE
);

-- Documents table
CREATE TABLE documents (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    application_id BIGINT NOT NULL,
    document_type VARCHAR(100) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (application_id) REFERENCES loan_applications(id)
);

-- Go High Level integration logs
CREATE TABLE ghl_integration_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    application_id BIGINT NOT NULL,
    action VARCHAR(100) NOT NULL,
    request_data TEXT,
    response_data TEXT,
    status VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (application_id) REFERENCES loan_applications(id)
);