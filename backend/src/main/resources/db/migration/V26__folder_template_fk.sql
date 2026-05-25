-- ============================================================================
-- V26: folders.folder_template_id FK
--
-- The folders table (V11) historically had no link back to folder_templates
-- (V21) — folders were seeded by copying the template's display_name, with
-- name-match used as the implicit join. That's fragile: any rename of a
-- seeded folder breaks downstream queries that group by template (eg the
-- FolderEvaluationService's "documents in this loan + folder" lookup).
--
-- This migration:
--   1. Adds folder_template_id as a nullable FK (user-created folders won't
--      have one — that's fine).
--   2. Backfills the FK for existing folders via a name match on
--      lower(trim(display_name)) <-> lower(trim(folder_templates.display_name)).
--      User-renamed folders silently stay NULL.
--
-- One ALTER per statement (H2 PG-mode quirk).
-- ============================================================================

ALTER TABLE folders ADD COLUMN folder_template_id BIGINT REFERENCES folder_templates(id);

CREATE INDEX idx_folders_template ON folders(folder_template_id);

UPDATE folders f
   SET folder_template_id = (
       SELECT ft.id
         FROM folder_templates ft
        WHERE LOWER(TRIM(ft.display_name)) = LOWER(TRIM(f.display_name))
        LIMIT 1
   )
 WHERE f.is_system = TRUE
   AND f.folder_template_id IS NULL;
