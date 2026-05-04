-- ============================================================================
-- V11: Document-workspace folders (Phase 1 of the Dropbox-style workspace).
--
-- Folders are a database concept; S3 keys stay flat. A loan's folder tree is
-- modeled as self-referencing rows: each loan has exactly one root folder
-- (parent_id IS NULL) and any number of sub-folders. The default seed creates
-- 15 standard subfolders defined in the spec.
--
-- A folder belongs to one loan_application. It cannot be reparented across
-- loans (enforced in FolderService). Soft delete is supported via deleted_at;
-- Phase 1 doesn't expose delete in the UI yet.
--
-- NOTE on uniqueness: ideally we'd use partial unique indexes
--   (UNIQUE ... WHERE deleted_at IS NULL)
-- to enforce "one live root per loan" and case-insensitive sibling-name
-- uniqueness. H2 (used in dev) doesn't support partial indexes, and Postgres
-- UNIQUE treats NULLs as distinct so a four-column unique including deleted_at
-- doesn't help either. So uniqueness is enforced in FolderService; the indexes
-- below are read-path only.
-- ============================================================================

CREATE TABLE folders (
    id                     BIGSERIAL    PRIMARY KEY,
    application_id         BIGINT       NOT NULL REFERENCES loan_applications(id) ON DELETE CASCADE,
    parent_id              BIGINT                REFERENCES folders(id) ON DELETE CASCADE,
    display_name           VARCHAR(255) NOT NULL,
    name_normalized        VARCHAR(255) NOT NULL,         -- lower(trim(display_name))
    sort_key               VARCHAR(64),                   -- "01", "02", … for default folders; NULL for user folders
    is_system              BOOLEAN      NOT NULL DEFAULT FALSE,  -- one of the 15 defaults; cannot be deleted
    is_old_loan_archive    BOOLEAN      NOT NULL DEFAULT FALSE,  -- the "15 Old Loan Files" folder
    created_by_user_id     BIGINT,
    created_at             TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at             TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at             TIMESTAMP
);

CREATE INDEX idx_folders_application ON folders (application_id);
CREATE INDEX idx_folders_parent      ON folders (parent_id);
CREATE INDEX idx_folders_app_parent_name ON folders (application_id, parent_id, name_normalized);

-- ============================================================================
-- Documents gain a folder reference. NULL = "at root, unfiled".
-- ============================================================================

ALTER TABLE documents ADD COLUMN folder_id BIGINT REFERENCES folders(id);
CREATE INDEX idx_documents_folder ON documents (folder_id);
