-- ============================================================================
-- V3: Users + per-loan assignments
-- Mirrors the dashboard's pattern (assigned_lo_id INT FK, separate join table
-- for many-to-many relationships).
-- ============================================================================

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    initials VARCHAR(10),
    role VARCHAR(50) DEFAULT 'borrower',           -- borrower, agent, lo, processor, manager, admin
    cognito_sub VARCHAR(255) UNIQUE,
    cognito_group VARCHAR(50),                     -- Mirrors dashboard 002 pattern
    phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_cognito_sub ON users(cognito_sub);

-- Assigned LO is one-to-one with a loan
ALTER TABLE loan_applications ADD COLUMN assigned_lo_id INT NULL;
ALTER TABLE loan_applications ADD COLUMN assigned_lo_name VARCHAR(255) NULL;
ALTER TABLE loan_applications ADD CONSTRAINT fk_loan_assigned_lo
    FOREIGN KEY (assigned_lo_id) REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX idx_loan_assigned_lo ON loan_applications(assigned_lo_id);

-- Link a borrower record to a user account (when the borrower has signed in)
ALTER TABLE borrowers ADD COLUMN user_id INT NULL;
ALTER TABLE borrowers ADD CONSTRAINT fk_borrower_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX idx_borrower_user ON borrowers(user_id);

-- Real estate agents — a loan can have multiple (buyer's agent, listing agent)
CREATE TABLE loan_agents (
    id SERIAL PRIMARY KEY,
    loan_application_id BIGINT NOT NULL,
    user_id INT NOT NULL,
    agent_role VARCHAR(50) NOT NULL DEFAULT 'BuyersAgent',  -- BuyersAgent, ListingAgent, DualAgent
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by INT NULL,                                    -- LO/Admin who attached them
    CONSTRAINT uk_loan_agent UNIQUE (loan_application_id, user_id, agent_role),
    FOREIGN KEY (loan_application_id) REFERENCES loan_applications(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX idx_loan_agents_loan ON loan_agents(loan_application_id);
CREATE INDEX idx_loan_agents_user ON loan_agents(user_id);

-- Backfill the FK on loan_status_history.transitioned_by_user_id (V2 added the column without
-- an FK because users didn't exist yet)
ALTER TABLE loan_status_history ADD CONSTRAINT fk_lsh_user
    FOREIGN KEY (transitioned_by_user_id) REFERENCES users(id) ON DELETE SET NULL;
