-- Users table — local mirror of Cognito identities. One row per signed-in user.
-- cognito_sub is the canonical Cognito subject claim (UUID); email may not be unique
-- on Cognito's side but is stored for human-readable lookup and borrower matching.
CREATE TABLE users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    cognito_sub VARCHAR(64) UNIQUE,
    email VARCHAR(255),
    display_name VARCHAR(255),
    primary_role VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_sign_in_at TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);

-- Borrowers gain a Cognito subject column; populated by CurrentUserService when a
-- borrower signs in and their email matches an existing borrower row.
ALTER TABLE borrowers ADD COLUMN cognito_sub VARCHAR(64);
CREATE INDEX idx_borrowers_cognito_sub ON borrowers(cognito_sub);
