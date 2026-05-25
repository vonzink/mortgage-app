# Per-Folder AI Document Evaluation — Design

**Date:** 2026-05-24
**Status:** Approved for planning
**Scope:** Manual, on-demand AI evaluation of all documents in a single workspace folder, with admin-authored per-folder prompts and provider switching. v1 covers the smallest viable loop.

## Context

The Document Workspace at `/applications/:id` shows a folder tree + file table per loan. Each canonical folder (Income, Borrower Documents, Assets, Credit, Property, Title, Insurance, Disclosures, Conditions, Underwriting, Invoices) corresponds to a row in `folder_templates` (added in V21).

Today the workspace is a static file browser — there's no programmatic analysis of what's been uploaded. We're adding an "Evaluate folder" workflow: admin authors a markdown prompt per folder type; LO clicks Evaluate; backend extracts text from the folder's documents, calls an LLM with the prompt + document text, persists the result, and the workspace renders the AI's analysis in a collapsible card at the top of the folder pane.

**No AI integration exists in the codebase today** (per `CLAUDE.md` — the previous OpenAI service was removed). This spec is greenfield for that subsystem and includes the provider abstraction, secret management, cost guardrails, and audit trail.

## Decisions (from brainstorm)

| # | Decision |
|---|---|
| Q1 | Scope = **manual button, one folder at a time, no auto-trigger**. Covers prompt storage + provider integration + compliance + thin UI. No OCR. |
| Q2 | Providers = **Anthropic (default) + OpenAI + DeepSeek**, with DeepSeek **disabled in prod by default** via env flag. PII/CFPB caveat documented; per-eval audit row records which provider was used. |
| Q3 | Provider switching = **admin UI toggle** in a new `app_settings` row. No restart, no deploy. |
| Q4 | Prompt storage = **`folder_templates.eval_prompt TEXT NULL`**. NULL means no Evaluate button on that folder. Edited inline in the existing FolderTemplatesAdmin page. |
| Q5 | Result UI = **collapsible card at top of folder pane**, latest-only display, history accumulates in DB. |
| Reconcile | Result body = **JSON envelope with markdown content** — `{ status, costUsd, markdown: "..." }`. Frontend renders the markdown field. Keeps prompt-writing free-form. |

## Goals

1. Admin authors a per-folder prompt in markdown, with NULL = no prompt = no Evaluate button.
2. LO clicks Evaluate on a folder → AI returns folder-level analysis (missing items, calculations, cross-file checks).
3. Result is persisted, displayed in-page, and forms an audit trail of every eval (who, when, which provider, cost).
4. Cost is predictable: no eval ever exceeds the per-eval token cap; no eval runs after the monthly budget is consumed.
5. PII routing is transparent: every eval's row records the provider and model that received the data.

## Non-goals (deferred)

- OCR for scanned PDFs. v1 detects and skips them with `needs_ocr` status. Future provider field reserved (`textract`, `llamaparse`).
- Auto-trigger on upload. v1 is manual button only.
- Per-file annotations. v1 is folder-level only.
- Multi-folder batch eval. v1 is one folder at a time.
- Prompt version history / diffs. v1 stores prompt-as-sent in each eval row, which is the de-facto audit record.
- Strict JSON schema for the model output (e.g. `{ missingItems: [...], flags: [...] }`). v1 is free-form markdown inside the JSON envelope; schema can be layered later if downstream gating is needed.
- Streaming responses. v1 is request/response with a spinner.

## §1 — Backend: schema

One new migration `V25__folder_ai_evaluations.sql`.

```sql
-- One ALTER per statement (H2 PG-mode rejects multi-clause ALTER).

-- 1. Add the prompt column to existing folder_templates.
ALTER TABLE folder_templates ADD COLUMN eval_prompt TEXT;
-- NULL means no Evaluate button surfaces on that folder.

-- 2. Single-row tenant settings (default provider).
CREATE TABLE app_settings (
    id                   SERIAL  PRIMARY KEY,
    llm_default_provider VARCHAR(32) NOT NULL DEFAULT 'anthropic',
    llm_default_model    VARCHAR(64),
    updated_at           TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by_user_id   INTEGER
);
INSERT INTO app_settings (llm_default_provider, llm_default_model)
VALUES ('anthropic', 'claude-sonnet-4-20250514');

-- 3. Per-eval cost-log / audit trail / display source.
CREATE TABLE folder_evaluations (
    id                       BIGSERIAL PRIMARY KEY,
    application_id           BIGINT  NOT NULL REFERENCES loan_applications(id) ON DELETE CASCADE,
    folder_template_id       BIGINT  NOT NULL REFERENCES folder_templates(id),
    provider                 VARCHAR(32)  NOT NULL,    -- 'anthropic' | 'openai' | 'deepseek'
    model                    VARCHAR(64),              -- nullable when provider_called=false
    provider_called          BOOLEAN     NOT NULL,
    prompt_snapshot          TEXT,                     -- exact prompt as it was sent
    document_ids             TEXT,                     -- comma-separated doc ids included
    response_markdown        TEXT,                     -- AI's analysis (the .markdown field)
    status                   VARCHAR(32) NOT NULL,     -- see §4 status taxonomy
    reason                   TEXT,                     -- human-readable status explanation
    estimated_input_tokens   INTEGER,
    actual_input_tokens      INTEGER,
    actual_output_tokens     INTEGER,
    cost_usd                 NUMERIC(10,4) NOT NULL DEFAULT 0,
    page_count               INTEGER,
    parser                   VARCHAR(32),              -- 'pdfbox' | 'textract' | 'llamaparse' | NULL
    scanned_likely           BOOLEAN,
    error_message            TEXT,
    created_by_user_id       INTEGER,
    created_at               TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_folder_evals_app_folder
  ON folder_evaluations(application_id, folder_template_id, created_at DESC);
CREATE INDEX idx_folder_evals_month_cost
  ON folder_evaluations(created_at, cost_usd);  -- powers the monthly-budget sum
```

## §2 — Backend: provider abstraction

```java
package com.msfg.mortgage.service.llm;

public interface LlmProvider {
    String name();                                   // "anthropic" | "openai" | "deepseek"
    String defaultModel();
    LlmResult complete(LlmRequest req);              // synchronous; thread-safe
    BigDecimal estimateCostUsd(int inputTokens, int outputTokens, String model);
}

public record LlmRequest(String system, String user, int maxOutputTokens, String model) {}
public record LlmResult(String content, int inputTokens, int outputTokens) {}
```

Three adapters under `backend/.../service/llm/`:

- `AnthropicProvider` — `POST https://api.anthropic.com/v1/messages` via Java 17 `HttpClient`. Auth header `x-api-key: $ANTHROPIC_API_KEY`. Cost lookup: `claude-sonnet-4 = $3/M input, $15/M output` baked into a constant map.
- `OpenAiProvider` — `POST https://api.openai.com/v1/chat/completions`. Auth header `Authorization: Bearer $OPENAI_API_KEY`. Model default `gpt-4o-mini`. Cost map for the gpt-4o family.
- `DeepSeekProvider` — `POST https://api.deepseek.com/v1/chat/completions`. Auth via `Authorization: Bearer $DEEPSEEK_API_KEY`. Cost map for `deepseek-chat`.

`LlmProviderRegistry` is a `@Service` that holds `Map<String, LlmProvider>` (injected by Spring) and exposes `resolve(String name)`. The `FolderEvaluationService` calls `registry.resolve(settings.getLlmDefaultProvider())` once per eval.

Secrets are env vars on the EC2 host, injected to the Docker container via `docker-compose.yml`. Missing keys cause the provider to throw at construction time only if it's actively selected (lazy validation), so devs without all three keys still boot.

## §3 — Backend: document text extraction

```java
public interface DocumentParser {
    ParseResult parse(InputStream pdfStream, String mimeType, String filename);
}

public record ParseResult(
    String text,
    int pageCount,
    String parser,                  // "pdfbox" | "textract" | "llamaparse"
    boolean scannedLikely,
    BigDecimal costUsd              // 0 for pdfbox; non-zero when OCR providers are added
) {}
```

v1 implementation: `PdfBoxParser` (the only `DocumentParser` registered).

Algorithm:
1. PDFBox loads the PDF, counts pages.
2. Extracts text into a single string.
3. Computes `extractedCharsPerPage = totalChars / max(pageCount, 1)`.
4. If `extractedCharsPerPage < APP_MIN_EXTRACTED_CHARS_PER_PAGE` (default 50), sets `scannedLikely=true`.
5. Returns `ParseResult` with `costUsd=0` (PDFBox is free).

The service treats `scannedLikely=true` as an OCR signal. With `APP_OCR_PROVIDER=none` (the v1 default) it returns the `needs_ocr` status without calling the LLM. Future OCR providers (`textract`, `llamaparse`) plug in as additional `DocumentParser` implementations; the abstraction does not need to change.

Non-PDF MIME types (text/plain, text/csv) read directly as UTF-8 with `pageCount=1`. Images and other binary types currently return an empty `ParseResult` with `scannedLikely=true` (same downstream gating).

## §4 — Backend: orchestration service + guardrails

`FolderEvaluationService.evaluate(loanId, folderTemplateId, userId)` enforces the steps in order. **No provider call happens until every check before it passes.**

```
1.  Look up folder_templates row.
    → If eval_prompt IS NULL: throw 400 "no_prompt_for_folder".

2.  Resolve provider = app_settings.llm_default_provider.
    Validate provider is allowed in current Spring profile:
      - prod + provider=='deepseek' + APP_ALLOW_DEEPSEEK_IN_PROD==false
        → persist row {status:'provider_not_allowed', provider_called:false},
          return that row to the caller, do not throw.

3.  List documents in (loan, folder) with status='UPLOADED' and deleted_at IS NULL.
    → If none: persist row {status:'no_documents', provider_called:false}, return.

4.  For each document: download stream from S3, run DocumentParser.parse().
    Aggregate: total page_count, list of (filename, text, scannedLikely).

5.  Enforce APP_MAX_PAGES_PER_EVAL (default 150).
    → If sum(pageCount) > cap:
       persist {status:'too_many_pages', page_count, provider_called:false},
       return.

6.  Detect any scannedLikely=true docs.
    → If any: persist {status:'needs_ocr', page_count, scanned_likely:true,
                       provider_called:false}, return.
    (v1 fail-closed: a single scanned doc blocks the whole folder eval.
     Future: skip just that doc with a note in the prompt input.)

7.  Assemble user prompt:
      "[prompt_snapshot]
       ---
       [DOCUMENTS]
       === Document 1 of N: <filename> (<pageCount> pages) ===
       <text>
       === Document 2 of N: ..."

8.  Estimate input tokens.
    Approximation: ceil(prompt_chars / 4) — the cheap-and-portable rule that
    matches Anthropic/OpenAI within ~10% for English text.
    → If estimate > APP_LLM_PER_EVAL_TOKEN_HARD_CAP (default 100_000):
       persist {status:'too_large', estimated_input_tokens, provider_called:false},
       return.

9.  Monthly budget check (only if APP_LLM_MONTHLY_USD_CAP env var is set).
    monthSpend = SUM(cost_usd) FROM folder_evaluations
                  WHERE created_at >= date_trunc('month', CURRENT_TIMESTAMP).
    → If monthSpend >= cap:
       persist {status:'over_budget', cost_usd:0, provider_called:false,
                reason:"month-to-date $X >= cap $Y"}, return.

10. Call provider.complete(LlmRequest).
    Wrap in try/catch:
    → success: persist {status:'success', provider_called:true,
                        actual_input_tokens, actual_output_tokens, cost_usd,
                        response_markdown:<JSON.markdown field>}.
    → HTTP 429: persist {status:'rate_limited', provider_called:true,
                         error_message, cost_usd:0}.
    → other exception: persist {status:'provider_failed', provider_called:true,
                                error_message, cost_usd:0}.

11. Return the persisted folder_evaluations row.
```

### Response envelope contract

The provider is instructed (via the prompt system field) to return strict JSON:

```json
{
  "status": "ok",
  "markdown": "## Summary\n\n3 documents reviewed. ...\n\n### Missing items\n- ..."
}
```

`FolderEvaluationService` parses the response and stores only the `markdown` field in `response_markdown`. The outer `status` field exists for forward compatibility (e.g. if a future prompt template returns `{ "status": "needs_clarification", "questions": [...] }`). v1 just stores the markdown and ignores the rest.

If the model returns non-JSON or fails to parse, status = `provider_failed` with `error_message` = `"model returned malformed JSON: <truncated body>"`.

### Status taxonomy (canonical)

| status | provider_called | notes |
|---|---|---|
| `success` | true | normal path |
| `no_documents` | false | nothing to evaluate |
| `too_many_pages` | false | enforces `APP_MAX_PAGES_PER_EVAL` |
| `needs_ocr` | false | scanned PDF detected, OCR disabled |
| `too_large` | false | enforces `APP_LLM_PER_EVAL_TOKEN_HARD_CAP` |
| `over_budget` | false | enforces `APP_LLM_MONTHLY_USD_CAP` |
| `provider_not_allowed` | false | DeepSeek in prod with flag off |
| `parse_failed` | false | PDFBox threw (corrupt PDF) |
| `provider_failed` | true | provider HTTP error / bad JSON |
| `rate_limited` | true | provider 429 |

## §5 — Backend: endpoints

```
POST /api/loan-applications/{loanId}/folders/{folderTemplateId}/evaluate
   → Fires evaluate(...) synchronously; returns the new folder_evaluations row.
   → Synchronous because v1 input is capped at 150 pages / 100k tokens; the
     longest realistic call is ~30s; the LO is waiting on a spinner.
   → Auth: @loanAccessGuard.isInternal() and canAccess(#loanId).

GET  /api/loan-applications/{loanId}/folders/{folderTemplateId}/evaluation
   → Latest folder_evaluations row for the pair, or 404. Used by the
     workspace card to populate on folder open.
   → Auth: canAccess(#loanId).

GET  /api/admin/app-settings
PUT  /api/admin/app-settings
   → @PreAuthorize("hasRole('Admin')")
   → PUT body: { llmDefaultProvider, llmDefaultModel }. Rejects unknown
     provider names. Returns updated row.
```

`FolderEvaluationDTO` is the wire shape — flat mapping of the entity. No nested LoanApplication / FolderTemplate.

## §6 — Frontend: prompt editor in FolderTemplatesAdmin

`frontend/src/pages/admin/FolderTemplatesAdmin.js` already exists (208 lines). Add a "Prompt" tab (or expandable row) per folder template that opens a textarea bound to `eval_prompt`. Save persists via the existing `PUT` endpoint, extended to include the new field.

- Empty / NULL prompt is allowed and is the default — Evaluate button stays hidden.
- Optional preview pane that runs the prompt through a "lint" check (length, model token estimate) — defer to follow-up.

## §7 — Frontend: provider toggle in a new AdminAppSettings page

`frontend/src/pages/admin/AppSettingsAdmin.js` (new). Single screen: provider dropdown (Anthropic / OpenAI / DeepSeek), model text input (with placeholder showing the default), Save button. Routed at `/admin/settings`. Linked from `AdminHome`.

DeepSeek shows a small banner: "DeepSeek is disabled in production by default. Set `APP_ALLOW_DEEPSEEK_IN_PROD=true` to enable."

## §8 — Frontend: result card in the workspace

New component `frontend/src/workspace/FolderEvaluationCard.jsx`. Rendered inside `WorkspaceTab.jsx` at the top of the file-pane, above the file table. Visible only when:

- A folder is selected AND
- That folder's `folder_template.eval_prompt` is non-null (the workspace already fetches folder metadata; the prompt presence is one new field on the response).

Card states:
- **Never evaluated**: collapsed by default, shows "No evaluation yet" + Evaluate button.
- **Loading**: spinner + "Evaluating…" + "this can take 10–30 seconds".
- **Latest result present**: collapsed shows one-line summary `Last evaluated 12m ago — cost $0.04 — Re-evaluate ▾`. Expanded shows the rendered markdown + metadata row (provider, model, tokens, cost, who clicked).
- **Latest result is an error/skip status**: collapsed shows the status in a warn-tone pill (`needs_ocr`, `too_many_pages`, etc.). Expanded shows the `reason` field + Re-evaluate button.

Markdown rendering via `react-markdown` (already in `package.json` for the existing dashboard notes — verify; if not, add).

Service additions in `frontend/src/services/mortgageService.js`:

```js
evaluateFolder: async (loanId, folderTemplateId) => { ... POST ... }
getFolderEvaluation: async (loanId, folderTemplateId) => { ... GET, returns null on 404 ... }
```

## §9 — Configuration

All values configurable via env vars on the EC2 host; defaults below land in `docker-compose.yml` (prod) and `application-dev.yml` (dev).

```
APP_LLM_MONTHLY_USD_CAP=100
APP_LLM_PER_EVAL_TOKEN_HARD_CAP=100000
APP_MAX_PAGES_PER_EVAL=150
APP_MIN_EXTRACTED_CHARS_PER_PAGE=50
APP_OCR_PROVIDER=none
APP_ALLOW_DEEPSEEK_IN_PROD=false

ANTHROPIC_API_KEY=<secret>
OPENAI_API_KEY=<secret>            # optional; provider only usable if set
DEEPSEEK_API_KEY=<secret>          # optional; provider only usable if set + flag enabled in prod
```

Spring binds these via `@Value` on a `LlmConfig @ConfigurationProperties` POJO. Missing optional keys disable the corresponding provider in the registry; the admin UI shows them disabled with a tooltip explaining what env var is missing.

Empty `APP_LLM_MONTHLY_USD_CAP` (or unset) disables budget enforcement.

## §10 — Compliance + audit trail

- Every eval — including skipped ones — writes a `folder_evaluations` row recording **which provider would have received the data** even when `provider_called=false`. That row IS the audit trail.
- The `provider` column is required (not nullable) so the regulator answer to "did borrower X's data go to OpenAI?" is a single SQL query, not a reconstruction.
- `prompt_snapshot` captures the prompt as sent so historic results are reproducible.
- `created_by_user_id` ties every eval to a Cognito identity.
- DeepSeek prod-disable is enforced at the service layer (not just the UI) — even a malicious controller-level request can't sneak data to DeepSeek in prod with the flag off.
- The S3 bucket retains immutable copies of the documents (Object Lock + WORM). The LLM call sends extracted text only — no raw document blobs cross the provider boundary. Combined with the per-eval row, the regulator trail is: bucket → audit row → response markdown.

**Out-of-scope but worth noting**: BAA / DPA negotiation with Anthropic / OpenAI. v1 ships under their standard commercial terms (no training on commercial API data by default for both). Upgrading to BAA is a procurement track, not a code change.

## §11 — Testing

### Backend

- **`PdfBoxParserTest`** — text-PDF returns extracted text; scanned-image PDF returns `scannedLikely=true` and empty text; corrupted PDF returns `parse_failed`-shaped result.
- **`FolderEvaluationServiceTest`** (full slice, real H2, mocked `LlmProvider`):
  - NULL prompt → 400.
  - No docs → `no_documents`.
  - 200-page PDF (fixture) → `too_many_pages`, no provider call.
  - Scanned PDF → `needs_ocr`, no provider call.
  - 200k-token text fixture → `too_large`, no provider call.
  - Monthly-cap exceeded (seed history rows summing to $100) → `over_budget`.
  - DeepSeek provider + prod profile + flag off → `provider_not_allowed`, persisted row, no provider call.
  - Happy path with mock provider → `success` row with cost_usd from estimator.
  - Provider throws 429 → `rate_limited` row.
  - Provider returns malformed JSON → `provider_failed` row.
- **`LlmProviderRegistryTest`** — resolve('anthropic') returns the right adapter; resolve('unknown') throws; missing API key disables that adapter.
- **`FolderEvaluationControllerTest`** (MockMvc with @WithMockUser):
  - POST evaluate returns the new row.
  - GET evaluation returns latest row or 404.
  - admin/app-settings PUT validates provider name.

### Frontend

- **`FolderEvaluationCard.test.jsx`** — renders empty state, loading state, success state with markdown, each error/skip state with correct pill color and reason text. Re-evaluate button fires the POST.
- **`AppSettingsAdmin.test.jsx`** — provider dropdown saves to the right endpoint; DeepSeek banner present.

## §12 — Rollout

Single PR-style batch onto `main` (per the project's working style — no PR gating). Suggested commit sequence:

1. `feat(db): V25 folder_ai_evaluations + app_settings + folder_templates.eval_prompt`
2. `feat(model): FolderEvaluation entity + app_settings entity`
3. `feat(service): LlmProvider interface + 3 adapters`
4. `feat(service): DocumentParser interface + PdfBoxParser`
5. `feat(service): FolderEvaluationService — orchestration + guardrails`
6. `feat(api): /folders/{id}/evaluate + /evaluation + /admin/app-settings`
7. `feat(admin): prompt editor in FolderTemplatesAdmin`
8. `feat(admin): AppSettingsAdmin page + provider toggle`
9. `feat(workspace): FolderEvaluationCard at top of folder pane`
10. `chore(deploy): env vars + secret wiring on EC2`

### Migration risk

- `V25` adds an `app_settings` row with default `'anthropic'`. Prod won't blow up booting against an empty `ANTHROPIC_API_KEY` because adapters validate lazily — but the first eval click will. Document this in the deploy runbook: set the API key before linking the admin UI.
- PDFBox is a new Java dep (~6 MB). No native code. Adds ~3 seconds to backend image build.

## Open questions

None. All Q1–Q5 + the markdown/JSON reconciliation are locked. Guardrail thresholds are env vars so they can move without spec changes. OCR provider, prompt versioning, and auto-trigger are explicit non-goals for v1.

## Future work (out of scope)

- **OCR for scanned PDFs** — add `AwsTextractParser` implementing `DocumentParser`; switch via `APP_OCR_PROVIDER=textract`. Service flow already has the seam (`needs_ocr` → degrade to OCR-then-eval instead of skip).
- **Auto-trigger on upload** — debounced fire from `/confirm` endpoint with a per-folder cooldown. Builds on the same service, no schema change.
- **Strict JSON output schema** — switch from free-form markdown to `{ summary, missingItems: [...], flags: [...] }` if downstream actions (e.g. "block status advance to CTC when flags > 0") need programmatic gating.
- **Prompt version history** — sibling `folder_template_prompt_history` table with rollback. Only needed if a bad prompt edit costs more than re-typing the previous version.
- **Per-eval provider override** — LO dropdown in the result card to pick a non-default provider for one run.
- **Token-cost dashboard** — sum cost_usd by user / loan / folder over the month. The data is already in the table; just needs a UI.
