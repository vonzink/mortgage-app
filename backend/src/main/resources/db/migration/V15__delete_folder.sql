-- ============================================================================
-- V15: Delete folder
--
-- Adds an is_delete_folder flag to folders. Each loan gets exactly one
-- system "Delete" folder seeded alongside the existing 16 defaults. The
-- LO has to drag a document into the Delete folder and then confirm a
-- permanent delete from inside it — there is no other path to remove a
-- document. Hard-deletes both the S3 object and the documents row.
-- ============================================================================

ALTER TABLE folders
    ADD COLUMN is_delete_folder BOOLEAN NOT NULL DEFAULT FALSE;

-- Helps the permanent-delete endpoint resolve "this loan's delete folder"
-- without scanning the tree. Regular index (not partial) for H2 compatibility.
CREATE INDEX idx_folders_delete_per_loan
    ON folders (application_id, is_delete_folder);
