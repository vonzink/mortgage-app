-- ============================================================================
-- V5: Assets table
-- The Asset.java entity existed but was missing from the original schema.sql.
-- ============================================================================

CREATE TABLE assets (
    id BIGSERIAL PRIMARY KEY,
    borrower_id BIGINT NOT NULL,
    asset_type VARCHAR(50) NOT NULL,                 -- Checking, Savings, MoneyMarket, ...
    bank_name VARCHAR(100),
    account_number VARCHAR(50),
    asset_value DECIMAL(15,2) NOT NULL,
    used_for_downpayment BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (borrower_id) REFERENCES borrowers(id) ON DELETE CASCADE
);
CREATE INDEX idx_assets_borrower ON assets(borrower_id);
