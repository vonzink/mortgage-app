-- ============================================================================
-- V11: Document-workspace folders (Phase 1 of the Dropbox-style workspace).
--
-- Folders are a database concept; S3 keys stay flat. A loan's folder tree is
-- modeled as self-referencing rows: each loan has exactly one root folder
-- (parent_id IS NULL) and any number of sub-folders. The default seed creates
-- 15 standard subfolders defined in the spec.
--
-- A folder belongs to one loan_application. It cannot be reparented across
-- loans (enforced in the service layer, not via FK). Soft delete is supported
-- via deleted_at — Phase 1 doesn't expose delete in the UI yet, but the column
-- exists so Phase 2 doesn't need a schema change.
-- ============================================================================

CREATE TABLE folders (
    id                     BIGSERIAL    PRIMARY KEY,
    application_id         BIGINT       NOT NULL REFERENCES loan_applications(id) ON DELETE CASCADE,
    parent_id              BIGINT                REFERENCES folders(id) ON DELETE CASCADE,
    display_name           VARCHAR(255) NOT NULL,
    name_normalized        VARCHAR(255) NOT NULL,         -- lower(trim(display_name)); unique within parent
    sort_key               VARCHAR(64),                   -- "01", "02", … for default folders; NULL for user folders
    is_system              BOOLEAN      NOT NULL DEFAULT FALSE,  -- one of the 15 defaults; cannot be deleted
    is_old_loan_archive    BOOLEAN      NOT NULL DEFAULT FALSE,  -- the "15 Old Loan Files" folder
    created_by_user_id     BIGINT,
    created_at             TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at             TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at             TIMESTAMP
);

-- One root per loan. Enforced as a partial unique index so soft-deleted roots
-- don't block re-seeding.
CREATE UNIQUE INDEX uq_folders_one_root_per_loan
    ON folders (application_id)
    WHERE parent_id IS NULL AND deleted_at IS NULL;

-- Sibling collision check: case-insensitive name uniqueness within a parent.
CREATE UNIQUE INDEX uq_folders_sibling_name
    ON folders (application_id, parent_id, name_normalized)
    WHERE deleted_at IS NULL;

-- Read paths
CREATE INDEX idx_folders_application ON folders (application_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_folders_parent      ON folders (parent_id)      WHERE deleted_at IS NULL;

-- ============================================================================
-- Documents gain a folder reference. NULL means "at the root of the loan's
-- workspace, not yet placed in a subfolder" — Phase 1 leaves existing rows at
-- NULL and the UI shows them at the root. Phase 2's drag-drop lets the LO
-- file them.
-- ============================================================================

ALTER TABLE documents ADD COLUMN folder_id BIGINT REFERENCES folders(id);
CREATE INDEX idx_documents_folder ON documents (folder_id) WHERE deleted_at IS NULL;
