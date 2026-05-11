-- ============================================================================
-- V19: Structured document types
-- Replaces the free-form document_type string with a managed lookup table.
-- Seeded with common mortgage document types mapped to default folders.
-- ============================================================================

CREATE TABLE document_types (
    id                      BIGSERIAL PRIMARY KEY,
    name                    VARCHAR(100) NOT NULL,
    slug                    VARCHAR(100) NOT NULL UNIQUE,
    default_folder_name     VARCHAR(100),
    required_for_milestones VARCHAR(255),
    allowed_mime_types      VARCHAR(500),
    max_file_size_bytes     BIGINT,
    borrower_visible_default BOOLEAN NOT NULL DEFAULT TRUE,
    is_active               BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order              INT     NOT NULL DEFAULT 0,
    created_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- FK from documents to document_types (nullable for legacy rows)
ALTER TABLE documents ADD COLUMN document_type_id BIGINT;

-- ── Seed common mortgage document types ─────────────────────────────────────

INSERT INTO document_types (name, slug, default_folder_name, allowed_mime_types, max_file_size_bytes, sort_order) VALUES
    ('W-2',                  'w-2',                  '03 Income',            'application/pdf,image/jpeg,image/png', 10485760,  1),
    ('Pay Stub',             'pay-stub',             '03 Income',            'application/pdf,image/jpeg,image/png', 10485760,  2),
    ('Tax Return',           'tax-return',            '03 Income',            'application/pdf',                     52428800,  3),
    ('Bank Statement',       'bank-statement',        '04 Assets',            'application/pdf,image/jpeg,image/png', 20971520,  4),
    ('Investment Statement', 'investment-statement',  '04 Assets',            'application/pdf',                     20971520,  5),
    ('Gift Letter',          'gift-letter',           '04 Assets',            'application/pdf,image/jpeg,image/png', 10485760,  6),
    ('ID / Driver''s License','drivers-license',      '02 Borrower Documents','application/pdf,image/jpeg,image/png', 10485760,  7),
    ('Explanation Letter',   'explanation-letter',    '02 Borrower Documents','application/pdf,image/jpeg,image/png', 10485760,  8),
    ('Credit Report',        'credit-report',         '05 Credit',            'application/pdf',                     20971520,  9),
    ('Purchase Agreement',   'purchase-agreement',    '06 Property',          'application/pdf',                     52428800, 10),
    ('Appraisal',            'appraisal',             '06 Property',          'application/pdf',                     52428800, 11),
    ('Title Report',         'title-report',          '07 Title',             'application/pdf',                     52428800, 12),
    ('Homeowners Insurance', 'homeowners-insurance',  '08 Insurance',         'application/pdf,image/jpeg,image/png', 20971520, 13),
    ('Disclosure',           'disclosure',            '09 Disclosures',       'application/pdf',                     52428800, 14),
    ('Closing Document',     'closing-document',      '12 Closing',           'application/pdf',                     52428800, 15),
    ('Other',                'other',                 NULL,                   NULL,                                  52428800, 99);
