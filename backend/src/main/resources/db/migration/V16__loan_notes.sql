CREATE TABLE loan_notes (
    id            BIGSERIAL    PRIMARY KEY,
    application_id BIGINT      NOT NULL REFERENCES loan_applications(id),
    author_id     BIGINT       REFERENCES users(id),
    author_name   VARCHAR(200),
    content       VARCHAR(2000) NOT NULL,
    created_at    TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_loan_notes_application ON loan_notes(application_id);
