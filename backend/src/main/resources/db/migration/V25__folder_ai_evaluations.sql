-- ============================================================================
-- V25: Folder AI evaluations
-- Adds the per-folder eval prompt column, the tenant settings row (Q6 toggle
-- + default LLM provider), and the per-eval audit/cost-log table.
--
-- One ALTER per statement (H2 PG-mode rejects multi-clause ALTER).
-- ============================================================================

ALTER TABLE folder_templates ADD COLUMN eval_prompt TEXT;
-- NULL means no Evaluate button on that folder.

CREATE TABLE app_settings (
    id                   SERIAL PRIMARY KEY,
    ai_eval_enabled      BOOLEAN     NOT NULL DEFAULT FALSE,
    llm_default_provider VARCHAR(32) NOT NULL DEFAULT 'anthropic',
    llm_default_model    VARCHAR(64),
    updated_at           TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by_user_id   INTEGER
);

INSERT INTO app_settings (ai_eval_enabled, llm_default_provider, llm_default_model)
VALUES (FALSE, 'anthropic', 'claude-sonnet-4-20250514');

CREATE TABLE folder_evaluations (
    id                       BIGSERIAL PRIMARY KEY,
    application_id           BIGINT       NOT NULL REFERENCES loan_applications(id) ON DELETE CASCADE,
    folder_template_id       BIGINT       NOT NULL REFERENCES folder_templates(id),
    provider                 VARCHAR(32)  NOT NULL,
    model                    VARCHAR(64),
    provider_called          BOOLEAN      NOT NULL,
    prompt_snapshot          TEXT,
    document_ids             TEXT,
    response_markdown        TEXT,
    status                   VARCHAR(32)  NOT NULL,
    reason                   TEXT,
    estimated_input_tokens   INTEGER,
    actual_input_tokens      INTEGER,
    actual_output_tokens     INTEGER,
    cost_usd                 NUMERIC(10,4) NOT NULL DEFAULT 0,
    page_count               INTEGER,
    parser                   VARCHAR(32),
    scanned_likely           BOOLEAN,
    error_message            TEXT,
    created_by_user_id       INTEGER,
    created_at               TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_folder_evals_app_folder
  ON folder_evaluations(application_id, folder_template_id, created_at DESC);
CREATE INDEX idx_folder_evals_month_cost
  ON folder_evaluations(created_at, cost_usd);
