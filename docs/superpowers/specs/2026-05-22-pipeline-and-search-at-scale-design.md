# Pipeline & Search at Scale — Design

**Date:** 2026-05-22
**Status:** Approved for planning
**Scope:** Subsystem A of a four-subsystem post-application overhaul (B = dashboard ratios, C = document workflow, D = admin oversight surface — separate specs).

## Context

The `/applications` page (`frontend/src/pages/ApplicationList.js`) currently fetches every loan with an unpaged `GET /api/loan-applications` and runs filter / search / sort in memory. The repository (`LoanApplicationRepository`) has no `Page<>` methods. This works at the current size (low tens of loans) and will fail well before the 1K-loan mark — at minimum the payload becomes slow to serialize, and the in-memory filter blocks the UI thread.

This spec replaces that surface end-to-end for the 1K–5K loan horizon and adds a global typeahead in the top bar so users can jump to a loan by name or identifier without going through the list.

## Decisions (from brainstorm)

| # | Decision |
|---|---|
| Q1 | Slice = **Pipeline & search at scale** (other three slices are separate specs). |
| Q2 | Interaction model = **both** global typeahead AND a rich pipeline page. |
| Q3 | Typeahead matches: borrower name (fuzzy), application number (prefix), LendingPad / investor / MERS identifiers (prefix). Address / LO name / email deferred. |
| Q4 | Pipeline column default = **Hybrid** (Borrower+Property, Status+day count, Conditions, Amount+LTV, Close, LO). |
| Q5 | Volume horizon = **1K–5K loans**. Single Postgres + indexes + paged endpoint. No ratio denormalization (no `loan_metrics` projection table — LTV computed on the fly from `loanAmount / propertyValue`). One narrow exception: `status_changed_at` is denormalized onto `loan_applications` so the default "stage age" sort doesn't join `loan_status_history` per row. See §1. |
| Q6 | Saved views = **none**, URL params only. Users bookmark URLs. |
| Q7 | `/applications` is **replaced in place** — same URL, same nav slot. |

## Goals

1. The list endpoint returns a page (not the full table) and supports the filter / sort dimensions documented in §1.
2. A typeahead in the top bar finds any loan by borrower name, app number, or any external loan identifier in <200ms P95 at 5K loans.
3. The pipeline page replaces `ApplicationList.js` with a sortable / filterable table whose state lives in the URL, so any view is a bookmark.
4. Admin sees everything; LO / Processor / Borrower remain scoped via the existing `LoanAccessGuard`.

## Non-goals

Explicitly deferred:

- Saved views (personal or team-shared).
- Faceted sidebar with facet counts.
- CSV / XLSX export from the pipeline.
- Bulk row actions (bulk assign LO, bulk advance).
- Configurable column packs per user.
- Real-time updates (no websockets, no polling).
- Subsystems B (dashboard ratios), C (document workflow at scale), D (admin oversight cross-loan dashboard). Each gets its own spec.

## §1 — Backend: paged endpoint + filter contract + indexes

### Endpoints

```
GET /api/loan-applications/search?q={query}&limit=10
   → typeahead. Returns up to 10 lean rows:
     { id, applicationNumber, borrowerName, city, state, status }
   → matches: borrowerName (trigram), applicationNumber (prefix),
     lendingpadLoanNumber / mersMin / investorLoanNumber (prefix).
   → auth: LoanAccessGuard scoping. Admin/Manager/Superuser see all;
     LO/Processor/Borrower scoped to loans they participate in.

GET /api/loan-applications?
       status=UNDERWRITING,CTC      // comma-separated, optional
      &lo={userId}                  // single LO filter
      &conditionsGt=0               // outstanding count > N
      &closingFrom=2026-06-01       // ISO date
      &closingTo=2026-06-30
      &stageAgeGt=5                 // days in current stage
      &loanType=Conventional,FHA
      &amountMin=300000
      &amountMax=2000000
      &sort=stageAge,desc           // default: status,asc then createdDate,desc
      &page=0&size=25
   → paged. Replaces the current unpaged @GetMapping.
   → returns { content: [LoanListRow...], totalElements, totalPages, page, size }
```

### `LoanListRow` DTO

Flat projection shaped for the Hybrid table. Not the entity.

```java
record LoanListRow(
  Long id, String applicationNumber, String status,
  String borrowerName, String city, String state,
  Integer outstandingConditions,     // computed via COUNT subquery
  BigDecimal loanAmount, BigDecimal propertyValue, Double ltvPct,
  LocalDate estClosingDate,
  String assignedLoName,
  LocalDateTime statusChangedAt,     // for stageAge calc on the client
  LocalDateTime createdDate
) {}
```

### Repository

Replace the current `findAll(...)` callers with `Page<LoanListRow>` driven by a Spring Data `Specification<LoanApplication>` so filters compose. One projection query selects the columns the table needs; the conditions count goes via correlated subquery (still cheap at 1K–5K loans).

### Indexes — single new migration `V24__pipeline_indexes_and_status_changed_at.sql`

Already in place: `application_number`, `status`, `assigned_lo_id` (via `users`), `loan_status_history(application_id, transitioned_at)`.

Add:

```sql
-- composite for status+createdDate (the default landing query)
CREATE INDEX idx_loan_apps_status_created
  ON loan_applications(status, created_date DESC);

-- partial index for the "needs action" filter
CREATE INDEX idx_loan_conditions_app_status
  ON loan_conditions(application_id, status) WHERE status = 'Outstanding';

-- closing-window filter
CREATE INDEX idx_closing_info_date
  ON closing_information(closing_date) WHERE closing_date IS NOT NULL;

-- trigram GIN for typeahead
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_borrowers_name_trgm
  ON borrowers USING GIN ((first_name || ' ' || last_name) gin_trgm_ops);

-- prefix indexes on the loan-identifier columns we typeahead against
CREATE INDEX idx_loan_apps_lp_number    ON loan_applications(lendingpad_loan_number);
CREATE INDEX idx_loan_apps_mers_min     ON loan_applications(mers_min);
CREATE INDEX idx_loan_apps_investor_num ON loan_applications(investor_loan_number);
```

### `status_changed_at` denormalization

Add `status_changed_at TIMESTAMP` to `loan_applications` in V24. Set in
`LoanApplicationService.updateApplicationStatus(...)` in the same code path that
writes `loan_status_history`. Backfill in the migration:

```sql
ALTER TABLE loan_applications ADD COLUMN status_changed_at TIMESTAMP;
UPDATE loan_applications
   SET status_changed_at = COALESCE(
     (SELECT MAX(transitioned_at) FROM loan_status_history
       WHERE loan_application_id = loan_applications.id),
     created_date
   );
ALTER TABLE loan_applications ALTER COLUMN status_changed_at SET NOT NULL;
```

Rationale: joining `loan_status_history` for every list query (and computing
MAX per row) is wasted work when status transitions are infrequent. One
denormalized column maintained on write costs nothing and keeps the list
query a single table scan + index seek.

### H2 dev caveat

`pg_trgm` doesn't exist in H2. The migration's `CREATE EXTENSION IF NOT
EXISTS` is a no-op there; H2 also ignores `USING GIN`. The search service
falls back to `ILIKE %q%` when `pg_trgm` is absent (same code path, just
unindexed). Acceptable since dev DBs are tiny. Multi-statement `ALTER TABLE`
in V24 must follow the V23 rule — one `ALTER TABLE ... ADD COLUMN` per
statement.

### Search-result ranking

`LoanSearchService` issues a single ranked query via `JdbcTemplate` (it's the
only consumer — avoids JPA fetch gymnastics). Ranks:

1. Exact match on `application_number` / `lendingpad_loan_number` / `mers_min` / `investor_loan_number` → rank 1.
2. Prefix match on the same → rank 2.
3. Trigram similarity on borrower name ≥ 0.4 → rank 3, ordered by similarity desc.

```sql
SELECT id, application_number, borrower_name, city, state, status,
       (CASE
          WHEN application_number = :q THEN 1
          WHEN application_number LIKE :q || '%' THEN 2
          ELSE 3
        END) AS rank,
       similarity(:q, borrower_name) AS sim
FROM loan_list_view
WHERE application_number      ILIKE :q || '%'
   OR lendingpad_loan_number  ILIKE :q || '%'
   OR mers_min                ILIKE :q || '%'
   OR investor_loan_number    ILIKE :q || '%'
   OR similarity(:q, borrower_name) > 0.4
ORDER BY rank, sim DESC, application_number
LIMIT :limit;
```

`loan_list_view` is a read-only DB view created in V24 joining
`loan_applications` and the primary borrower's name. Used by both the
paged list endpoint and the typeahead endpoint.

## §2 — Frontend: replace `ApplicationList.js`

### File layout

```
pages/
  ApplicationList.js          page wrapper — fetch, URL state, layout
  loanList/                   new directory (mirrors loanDashboard/)
    PipelineTable.jsx         the table — props: rows, sort, onSort
    PipelineRow.jsx           single row component
    FilterChips.jsx           status/LO/closing/stageAge/loanType/amount controls
    Pager.jsx                 page N of M + page-size select
    useFilterUrlState.js      round-trips filter state ↔ URL search params
```

### URL state pattern

`useFilterUrlState` is a thin wrapper over `useSearchParams` that exposes a
typed `{ filters, sort, page, size }` object plus setters that update the URL.
Effect: every filter change rewrites the URL; bookmarks restore the exact view.

```
/applications?status=UNDERWRITING&conditionsGt=0&sort=stageAge,desc&page=0
```

### Page layout

```
┌────────────────────────────────────────────────────────────────────┐
│  Pipeline                       [global typeahead]      [+ New]   │ ← TopBar (§3)
├────────────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐           │
│  │ $34.2M   │  │ 47 loans │  │ 6.875%   │  │ 12 needs │           │ ← stat cards (kept)
│  │ pipeline │  │ active   │  │ avg rate │  │ action   │           │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘           │
├────────────────────────────────────────────────────────────────────┤
│  [Status ▼ 2]  [LO ▼ All]  [Has conditions]  [Closing ▼]          │ ← FilterChips
│  [Stage age ▼] [Loan type ▼] [Amount ▼]   [Clear all] (12 results)│
├────────────────────────────────────────────────────────────────────┤
│  Borrower / Property      Status      Cond  Amount / LTV  Close LO│
│  Fortney, Matthew         UNDERWRTG    4    $485K / 78.2%  Jun12 ZZ│
│  Lehi, UT · #APP-1042     day 3                                    │
│  …                                                                 │
├────────────────────────────────────────────────────────────────────┤
│  ◀ Page 1 of 5    [25 per page ▼]    Showing 1–25 of 124          │
└────────────────────────────────────────────────────────────────────┘
```

### Row click behavior

- Whole row click → loan dashboard (`/loan/:id`). Most common destination.
- Right-side icon cluster (visible on row hover): Open 1003, Files, Copy to new. Same icons used in the dashboard hero (`Icon name="doc"`, `Icon name="folder"`).
- No inline status change. That lives in `AdvanceStatusModal` per the dashboard convention.

### Stage age display

`statusChangedAt` ships in the row payload. Client renders **"day N"** under
the status pill (`day 3`, `day 12 ⚠`). Turns copper when N exceeds a
per-status SLA. SLAs are constants in `loanList/stageSlas.js` for v1:

```js
export const STAGE_SLAS = {
  REGISTERED: { warn: 5,  alarm: 10 },
  APPLICATION: { warn: 7, alarm: 14 },
  UNDERWRITING: { warn: 7, alarm: 14 },
  // … one entry per LoanStatus value
};
```

Moves to a config table only if it becomes a real pain point.

### Filter chips

- Each chip is a button that opens a small popover. Selected state rolls back into the chip text (`Status: UW, CTC`).
- "Clear all" is one button, visible when any filter is active.
- Result count next to the chips: `(12 results)`.

### Sorting

- Click a column header → sort toggles (`asc` / `desc` / unset).
- Default: `status` ASC then `createdDate` DESC — groups loans by stage, newest first within stage. Better for a pipeline view than the current `createdDate desc` only.
- Sort state lives in the URL.

### Stat cards

Keep the four existing cards. Two changes:

- "Needs action" computed from `outstandingConditions > 0`. Clicking it applies that filter.
- "Avg rate" moves to the rightmost slot (less load-bearing than count + $ value).

### What gets deleted

- In-memory `useMemo(filtered, …)`, `matchesFilter`, and `search` state in `ApplicationList.js`.
- Card-vs-list view toggle, if it exists. Table only.

## §3 — Frontend: global typeahead in TopBar

### Component

`components/design/LoanSearch.jsx` — controlled input + dropdown panel. Uses
the shared `apiClient`. Self-contained: keyboard nav, debounce, ARIA combobox.

### Behavior

| Interaction | Result |
|---|---|
| Click input, focus, or press `⌘K` / `Ctrl+K` | Opens. |
| Empty state (focused, no query) | Shows 5 most-recently-opened loans from `localStorage`. |
| Type 2+ characters | Debounced (200ms) `GET /search?q=…&limit=10`. |
| `↑` / `↓` | Move highlight. |
| `Enter` | Navigate to `/loan/:id` (dashboard). |
| `Esc` | Close. |
| Rapid retype | In-flight request aborted via `AbortController`. |
| No matches | "No loans match 'smyth' — [Browse all loans →]" link → `/applications?q=smyth`. |

### Result row format

```
Fortney, Matthew                              UNDERWRITING
Lehi, UT · #APP-1042 · LP R-008797
```

- Borrower name primary.
- Address + identifiers secondary, dim.
- Status pill right-aligned.
- Matched substring highlighted with `<mark>`.

### Recent-loans cache

`localStorage['msfg.recentLoans']` = array of
`{ id, applicationNumber, borrowerName, openedAt }` capped at 10. Pushed
whenever the loan dashboard or workspace loads. Survives tab close, scoped
per browser (so it's per-user implicitly via Cognito-bound device).

### Accessibility

- Input: `role="combobox"`, `aria-controls="loan-search-results"`, `aria-expanded`, `aria-activedescendant`.
- Results list: `role="listbox"`. Each row: `role="option"`.
- Focus ring on input must remain visible (do not strip for rounded styling).
- Live region announces "10 results for smyth" after each query settles.

## §4 — Testing, rollout, what doesn't change

### Backend tests

- **`LoanApplicationRepositoryTest`** (Spring Data slice, H2)
  - Each filter dimension composes correctly via Specification.
  - Empty filters → returns all loans paged.
  - `Page` metadata accurate.
  - Sort by `stageAge`, `createdDate`, `loanAmount` returns correct order.
- **`LoanSearchServiceTest`** (Spring slice, H2)
  - Exact `applicationNumber` ranks first.
  - Prefix match on `lendingpadLoanNumber` returns the row.
  - Fuzzy borrower name works in H2 via `ILIKE %q%` fallback.
  - LO-scoped user sees only their loans; Admin sees all.
- **`LoanApplicationControllerTest`** (MockMvc)
  - `/search?q=` returns the shape the frontend expects.
  - `/?status=…&page=0&size=25` returns the paged shape and respects `LoanAccessGuard`.

### Frontend tests

- **`PipelineTable.test.jsx`** — renders fixture rows, sort-click toggles, row-click navigates to dashboard, hover icons fire correct nav.
- **`FilterChips.test.jsx`** — opening a chip → selecting → URL `searchParams` updated.
- **`useFilterUrlState.test.js`** — URL → state → URL is lossless; defaults applied when params absent.
- **`LoanSearch.test.jsx`** — typeahead debounces (mock timers), `↑/↓/Enter/Esc` keyboard works, `⌘K` opens it, recent-loans empty state from `localStorage`, axios abort on rapid retype.

### What does NOT change

- `LoanDashboardPage` (`/loan/:id`).
- Workspace at `/applications/:id` (document workspace).
- `MismoImporter`, the form, the apps' clone endpoint.
- Borrower / agent portals — they continue to call `/me/loans` (unchanged), not the new admin list endpoint.

### Rollout — one PR per phase

| Phase | Scope | Notes |
|---|---|---|
| 1 | V24 migration + paged endpoint + typeahead endpoint | Backend only. Old `findAll` route stays until Phase 3 so the existing frontend keeps working. |
| 2 | Global typeahead in TopBar | Frontend only. Hits the Phase 1 endpoint. |
| 3 | Replace `ApplicationList.js` with Hybrid pipeline | Frontend mostly. Old `findAll` route deleted at the end. |
| 4 | *(stretch, optional)* historical-loan `status_changed_at` backfill polish | V24 already backfills in the migration; this phase is only if we discover edge cases. |

### Migration risk

- V24 backfills `status_changed_at` in the migration itself. At 1K–5K rows the backfill is instant.
- Removing the old unpaged `GET /api/loan-applications` is breaking for any external consumer. No known external consumer — the frontend is the only client. If that changes, we add a `Deprecation` header before deleting.

## Open questions

None. All Q1–Q7 decisions captured. Stage-age SLA values are constants for
v1 (`UW > 7d warn, > 14d alarm`); revisit if real usage shows they need
per-loan-type tuning.

## Future work (not in this spec)

- **Subsystem B — Dashboard ratios & KPIs:** DTI / CLTV / HCLTV / FICO / reserves / DSCR on the loan dashboard. Mostly compute + UI. `DashboardKpis` already accepts `dti` and `fico` props — needs the upstream pipeline to populate them.
- **Subsystem C — Document workflow at scale:** required-doc checklist per loan type, condition ↔ document linkage, bulk upload UX. Largest of the four.
- **Subsystem D — Admin oversight surface:** cross-loan rollup (today's queue, conditions due, files needing review, SLA breaches). Requires Subsystem A's paged endpoint as a prerequisite.
- **Saved views**, **CSV / XLSX export**, **bulk row actions** — natural follow-ups once usage patterns are real.
