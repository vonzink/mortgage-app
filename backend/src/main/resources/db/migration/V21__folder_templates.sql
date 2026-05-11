-- ============================================================================
-- V21: Folder templates
-- Externalizes the hardcoded default-subfolder list from FolderService into a
-- DB-managed table so Admins can edit the seeded folder set without a deploy.
-- ============================================================================

CREATE TABLE folder_templates (
    id                   BIGSERIAL PRIMARY KEY,
    display_name         VARCHAR(255) NOT NULL UNIQUE,
    sort_key             VARCHAR(64),
    is_old_loan_archive  BOOLEAN NOT NULL DEFAULT FALSE,
    is_delete_folder     BOOLEAN NOT NULL DEFAULT FALSE,
    is_active            BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order           INT     NOT NULL DEFAULT 0,
    created_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ── Seed with the current hardcoded defaults from FolderService ─────────────

INSERT INTO folder_templates (display_name, sort_key, is_old_loan_archive, is_delete_folder, sort_order) VALUES
    ('01 Submission',         '01', FALSE, FALSE,  1),
    ('02 Borrower Documents', '02', FALSE, FALSE,  2),
    ('03 Income',             '03', FALSE, FALSE,  3),
    ('04 Assets',             '04', FALSE, FALSE,  4),
    ('05 Credit',             '05', FALSE, FALSE,  5),
    ('06 Property',           '06', FALSE, FALSE,  6),
    ('07 Title',              '07', FALSE, FALSE,  7),
    ('08 Insurance',          '08', FALSE, FALSE,  8),
    ('09 Disclosures',        '09', FALSE, FALSE,  9),
    ('10 Conditions',         '10', FALSE, FALSE, 10),
    ('11 Underwriting',       '11', FALSE, FALSE, 11),
    ('12 Closing',            '12', FALSE, FALSE, 12),
    ('13 Post Closing',       '13', FALSE, FALSE, 13),
    ('14 Invoices',           '14', FALSE, FALSE, 14),
    ('15 Correspondence',     '15', FALSE, FALSE, 15),
    ('16 Old Loan Files',     '16', TRUE,  FALSE, 16),
    ('17 Delete',             '17', FALSE, TRUE,  17);
