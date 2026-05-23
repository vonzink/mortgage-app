# Pipeline & Search at Scale — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the unpaged in-memory loan list with a paged, indexed pipeline page plus a global typeahead, so the admin surface survives 1K–5K loans.

**Architecture:** One new Flyway migration (`V24`) adds `loan_applications.status_changed_at`, trigram + composite indexes, and a `loan_list_view`. Two new backend services (`LoanApplicationListService` for the paged list, `LoanSearchService` for typeahead) sit behind two new endpoints on the existing `LoanApplicationController`. The frontend replaces `ApplicationList.js` in place with a `pages/loanList/` directory of focused components driven by a `useFilterUrlState` hook that round-trips state through the URL. A new `LoanSearch` component is mounted in `TopBar.jsx` and bound to `⌘K`.

**Tech Stack:** Spring Boot 3.2, Java 17, Spring Data JPA + JdbcTemplate, Flyway, Postgres (`pg_trgm`), H2 in PostgreSQL-mode for dev/test. React 18 (CRA 5), React Router v6 `useSearchParams`, React Testing Library + Jest, axios.

**Source spec:** `docs/superpowers/specs/2026-05-22-pipeline-and-search-at-scale-design.md`

**Project context:** See `CLAUDE.md` at the repo root. Important conventions used throughout this plan:
- Backend lives in `backend/`, commands run from there (`mvn -q -DskipTests compile`, `mvn test -Dtest=...`).
- Backend tests use `@SpringBootTest @ActiveProfiles("test")` with real H2 in PostgreSQL mode. Controller tests add `@WithMockUser(roles="Admin")` and inject the controller directly (see `AdminDocumentTypeControllerTest` as reference) — or use `MockMvc` for HTTP-shape assertions.
- Migrations: **one `ALTER TABLE ADD COLUMN` per statement** (H2 in PG-mode rejects multi-clause `ALTER`). See `V23__hmda_on_declarations.sql`.
- JPA `ddl-auto: validate` — entity fields must match the post-migration schema exactly or the app fails to boot.
- Frontend `pages/` holds route-level views; `pages/<feature>/` for feature sub-components (mirroring the existing `pages/loanDashboard/` pattern).
- Frontend tests: CRA Jest, `@testing-library/jest-dom` matchers auto-loaded via `src/setupTests.js`. Mock `mortgageService` for component tests; use `jest.useFakeTimers()` for debounce.
- Run a single backend test: `cd backend && mvn test -Dtest=ClassName`.
- Run a single frontend test: `cd frontend && npm test -- --testPathPattern=ClassName --watchAll=false`.

**Out of scope (do not implement here):** saved views, CSV export, bulk actions, configurable column packs, real-time updates, Subsystems B/C/D.

---

## File map

### New files

```
backend/src/main/resources/db/migration/
  V24__pipeline_indexes_and_status_changed_at.sql

backend/src/main/java/com/msfg/mortgage/
  dto/LoanListRow.java            paged-list projection (record)
  dto/LoanListFilters.java        parsed query-param bag (record)
  dto/LoanSearchHit.java          typeahead result (record)
  dto/LoanListPage.java           page envelope (record)
  service/LoanApplicationListService.java
  service/LoanSearchService.java

backend/src/test/java/com/msfg/mortgage/service/
  LoanApplicationListServiceTest.java
  LoanSearchServiceTest.java

backend/src/test/java/com/msfg/mortgage/controller/
  LoanApplicationListControllerTest.java

frontend/src/pages/loanList/
  PipelineTable.jsx
  PipelineRow.jsx
  FilterChips.jsx
  Pager.jsx
  stageSlas.js                    SLA constants per LoanStatus
  useFilterUrlState.js
  useFilterUrlState.test.js
  PipelineTable.test.jsx
  PipelineRow.test.jsx
  FilterChips.test.jsx

frontend/src/components/design/
  LoanSearch.jsx                  ⌘K-bound typeahead in TopBar
  LoanSearch.test.jsx

frontend/src/utils/
  recentLoans.js                  localStorage cache helpers
  recentLoans.test.js
```

### Modified files

```
backend/src/main/java/com/msfg/mortgage/
  model/LoanApplication.java                            add statusChangedAt field
  service/LoanApplicationService.java                   set statusChangedAt in updateApplicationStatus + on create
  controller/LoanApplicationController.java             replace @GetMapping, add /search

frontend/src/services/mortgageService.js                update getApplications, add searchLoans
frontend/src/components/design/TopBar.jsx               mount LoanSearch + ⌘K listener
frontend/src/pages/ApplicationList.js                   full rewrite around new components
frontend/src/pages/ApplicationList.design.css           rewrite for table layout (or merge into loanList CSS)
frontend/src/pages/LoanDashboardPage.js                 call pushRecentLoan on load
frontend/src/pages/ApplicationDetails.js                call pushRecentLoan on load
```

---

# Phase 1 — Backend: V24 migration + paged endpoint + typeahead endpoint

Self-contained. Old `GET /api/loan-applications` (firehose) is kept in place during Phase 1 so the un-rewritten frontend keeps working. It's deleted at the end of Phase 3.

---

### Task 1.1: V24 migration — `status_changed_at` column + indexes + view

**Files:**
- Create: `backend/src/main/resources/db/migration/V24__pipeline_indexes_and_status_changed_at.sql`

This is a schema-only change. Hibernate `ddl-auto: validate` will fail boot until Task 1.2 adds the matching entity field — that's intentional, the two land in the same PR.

- [ ] **Step 1: Write the migration**

```sql
-- ============================================================================
-- V24: Pipeline indexes + status_changed_at denormalization + loan_list_view
--
-- Backs the paged /api/loan-applications list endpoint and the typeahead
-- /api/loan-applications/search endpoint.
--
-- Decisions captured in docs/superpowers/specs/2026-05-22-pipeline-and-search-
-- at-scale-design.md (Q5: 1K–5K horizon → no ratio denorm; one narrow
-- denormalized status_changed_at to avoid joining loan_status_history per row
-- for the default stage-age sort).
-- ============================================================================

-- ---- status_changed_at on loan_applications --------------------------------
-- One ALTER per statement (H2 in PG-mode won't parse multi-clause ALTER).

ALTER TABLE loan_applications ADD COLUMN status_changed_at TIMESTAMP;

-- Backfill from history MAX, falling back to created_date for loans that
-- never transitioned (the original REGISTERED row).
UPDATE loan_applications la
   SET status_changed_at = COALESCE(
     (SELECT MAX(transitioned_at) FROM loan_status_history
       WHERE loan_application_id = la.id),
     la.created_date,
     CURRENT_TIMESTAMP
   );

ALTER TABLE loan_applications ALTER COLUMN status_changed_at SET NOT NULL;

-- ---- Indexes for the paged list query --------------------------------------

-- Default landing query: WHERE status IN (...) ORDER BY created_date DESC.
CREATE INDEX idx_loan_apps_status_created
  ON loan_applications(status, created_date DESC);

-- Stage-age sort: ORDER BY status_changed_at ASC.
CREATE INDEX idx_loan_apps_status_changed_at
  ON loan_applications(status_changed_at);

-- Outstanding-conditions filter — partial index keeps it tiny.
CREATE INDEX idx_loan_conditions_app_status_outstanding
  ON loan_conditions(application_id) WHERE status = 'Outstanding';

-- Closing-window filter.
CREATE INDEX idx_closing_info_date
  ON closing_information(closing_date) WHERE closing_date IS NOT NULL;

-- ---- Typeahead: identifier prefix indexes ----------------------------------

CREATE INDEX idx_loan_apps_lp_number     ON loan_applications(lendingpad_loan_number);
CREATE INDEX idx_loan_apps_mers_min      ON loan_applications(mers_min);
CREATE INDEX idx_loan_apps_investor_num  ON loan_applications(investor_loan_number);

-- ---- Typeahead: trigram on borrower name -----------------------------------
-- pg_trgm doesn't exist in H2 — both statements are no-ops there. The search
-- service falls back to ILIKE %q% when pg_trgm is absent (same code path,
-- just unindexed). Acceptable since dev DBs are tiny.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX idx_borrowers_name_trgm
  ON borrowers USING GIN ((COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')) gin_trgm_ops);

-- ---- loan_list_view --------------------------------------------------------
-- Read-only join used by both the paged list endpoint and the typeahead.
-- Picks the lowest-sequence borrower as the "primary" borrower for display.

CREATE OR REPLACE VIEW loan_list_view AS
SELECT
  la.id,
  la.application_number,
  la.status,
  la.status_changed_at,
  la.created_date,
  la.loan_type,
  la.loan_amount,
  la.property_value,
  la.lendingpad_loan_number,
  la.mers_min,
  la.investor_loan_number,
  la.assigned_lo_id,
  la.assigned_lo_name,
  b.first_name  AS borrower_first_name,
  b.last_name   AS borrower_last_name,
  TRIM(BOTH ' ' FROM COALESCE(b.first_name, '') || ' ' || COALESCE(b.last_name, '')) AS borrower_name,
  p.city         AS property_city,
  p.state        AS property_state,
  ci.closing_date AS est_closing_date
FROM loan_applications la
LEFT JOIN LATERAL (
    SELECT first_name, last_name
      FROM borrowers
     WHERE application_id = la.id
     ORDER BY COALESCE(sequence_number, 999), id
     LIMIT 1
) b ON TRUE
LEFT JOIN properties p ON p.application_id = la.id
LEFT JOIN closing_information ci ON ci.loan_application_id = la.id;
```

> H2 caveat: H2 doesn't support `LATERAL`. If the H2 build complains here, swap the lateral join for a correlated subquery that returns the same first row:
> ```sql
> LEFT JOIN borrowers b ON b.id = (
>   SELECT id FROM borrowers
>    WHERE application_id = la.id
>    ORDER BY COALESCE(sequence_number, 999), id
>    LIMIT 1
> )
> ```
> Test will tell us which works in both.

- [ ] **Step 2: Boot the backend to run the migration**

Run from `backend/`:
```
mvn -q -DskipTests compile && mvn spring-boot:run -Dspring-boot.run.profiles=dev
```

Expected: Hibernate boot **fails** with `Schema-validation: missing column: status_changed_at` because the entity doesn't have the field yet. **That's expected — proceed to Task 1.2.** Kill the process (`Ctrl+C`).

If instead the migration itself fails (e.g. H2 rejecting `LATERAL`), apply the correlated-subquery fix above before continuing.

- [ ] **Step 3: Commit**

```bash
git add backend/src/main/resources/db/migration/V24__pipeline_indexes_and_status_changed_at.sql
git commit -m "feat(db): V24 pipeline indexes, status_changed_at denorm, loan_list_view"
```

---

### Task 1.2: Add `statusChangedAt` to `LoanApplication` entity

**Files:**
- Modify: `backend/src/main/java/com/msfg/mortgage/model/LoanApplication.java` — add field + accessors near `createdDate`.

- [ ] **Step 1: Add the field**

Locate the `createdDate` field (around line 40) and add `statusChangedAt` immediately after it:

```java
    @Column(name = "created_date")
    private LocalDateTime createdDate;

    /**
     * When the loan most recently entered its current status. Backfilled from
     * loan_status_history MAX in V24; written in LoanApplicationService.updateApplicationStatus.
     * Denormalized so the pipeline page's stage-age sort doesn't join history per row.
     */
    @Column(name = "status_changed_at", nullable = false)
    private LocalDateTime statusChangedAt;

    @Column(name = "updated_date")
    private LocalDateTime updatedDate;
```

- [ ] **Step 2: Add getter / setter**

Find the existing getter/setter cluster (search for `getCreatedDate`) and add:

```java
    public LocalDateTime getStatusChangedAt() { return statusChangedAt; }
    public void setStatusChangedAt(LocalDateTime statusChangedAt) { this.statusChangedAt = statusChangedAt; }
```

- [ ] **Step 3: Verify the app boots**

```
cd backend && mvn -q -DskipTests compile
mvn spring-boot:run -Dspring-boot.run.profiles=dev
```

Expected: Boots cleanly, log shows `Started ... in N.NNN seconds`. Kill it (`Ctrl+C`).

- [ ] **Step 4: Commit**

```bash
git add backend/src/main/java/com/msfg/mortgage/model/LoanApplication.java
git commit -m "feat(model): add LoanApplication.statusChangedAt (matches V24 column)"
```

---

### Task 1.3: Set `statusChangedAt` on create + every status transition

**Files:**
- Modify: `backend/src/main/java/com/msfg/mortgage/service/LoanApplicationService.java`
- Modify: `backend/src/test/java/com/msfg/mortgage/service/LoanApplicationServiceTest.java`

- [ ] **Step 1: Write failing test for "create stamps statusChangedAt"**

Add to `LoanApplicationServiceTest.java`:

```java
    @Test
    void createApplication_stampsStatusChangedAtToCreatedDate() {
        LoanApplication saved = loanApplicationService.createApplication(purchaseApplication("Purchase"));

        assertThat(saved.getStatusChangedAt()).isNotNull();
        assertThat(saved.getStatusChangedAt()).isEqualTo(saved.getCreatedDate());
    }

    @Test
    void updateApplicationStatus_updatesStatusChangedAtToProvidedTransitionedAt() {
        LoanApplication saved = loanApplicationService.createApplication(purchaseApplication("Purchase"));
        LocalDateTime when = LocalDateTime.of(2026, 4, 15, 9, 0);

        LoanApplication moved = loanApplicationService.updateApplicationStatus(
            saved.getId(), "UNDERWRITING", when);

        assertThat(moved.getStatusChangedAt()).isEqualTo(when);
    }

    @Test
    void updateApplicationStatus_defaultsStatusChangedAtToNowWhenNotProvided() {
        LoanApplication saved = loanApplicationService.createApplication(purchaseApplication("Purchase"));
        LocalDateTime before = LocalDateTime.now().minusSeconds(2);

        LoanApplication moved = loanApplicationService.updateApplicationStatus(
            saved.getId(), "APPLICATION", null);

        assertThat(moved.getStatusChangedAt()).isAfter(before);
        assertThat(moved.getStatusChangedAt()).isBefore(LocalDateTime.now().plusSeconds(2));
    }
```

Add the import if missing: `import java.time.LocalDateTime;`

- [ ] **Step 2: Run tests — expect failures**

```
cd backend && mvn test -Dtest=LoanApplicationServiceTest -Dsurefire.failIfNoSpecifiedTests=false
```

Expected: 3 failures (`statusChangedAt` is null because nothing sets it).

- [ ] **Step 3: Set on create**

Find `createApplication(...)` in `LoanApplicationService.java`. Right after the `setCreatedDate(LocalDateTime.now())` line (or wherever createdDate is stamped), add:

```java
        // Stamp status_changed_at to match created_date so the stage-age sort
        // shows new loans as "day 0" instead of an awkward null.
        application.setStatusChangedAt(application.getCreatedDate());
```

If `createdDate` is stamped by a `@PrePersist` callback rather than explicit `set`, do the same in that callback — or override by setting both right before `save`. Whichever exists in your branch.

- [ ] **Step 4: Set on status transition**

Find `updateApplicationStatus(Long id, String status, LocalDateTime transitionedAt)` (around line 375). Inside the method, after the existing code that writes `loan_status_history`, before `repository.save(application)`:

```java
        // Mirror the transition timestamp onto the loan itself so the pipeline
        // list can sort by stage age without joining loan_status_history.
        application.setStatusChangedAt(transitionedAt != null ? transitionedAt : LocalDateTime.now());
```

- [ ] **Step 5: Run tests — expect PASS**

```
mvn test -Dtest=LoanApplicationServiceTest
```

Expected: all green.

- [ ] **Step 6: Also re-run the existing clone test to be sure the clone path stamps `statusChangedAt`**

The clone path calls `repository.save(...)` directly without going through `createApplication`. If it doesn't set `statusChangedAt`, JPA `validate` will allow the insert (the column is NOT NULL in DB but the Java field could still be null at save time if `@PrePersist` doesn't fire on the cloned entity).

Check `cloneApplication(...)`. Add right before `loanApplicationRepository.save(app);`:

```java
        // Cloned loans start fresh — REGISTERED, day 0.
        LocalDateTime now = LocalDateTime.now();
        app.setCreatedDate(now);
        app.setStatusChangedAt(now);
```

Re-run `mvn test -Dtest=LoanApplicationServiceTest`. Expected: all green.

- [ ] **Step 7: Commit**

```bash
git add backend/src/main/java/com/msfg/mortgage/service/LoanApplicationService.java \
        backend/src/test/java/com/msfg/mortgage/service/LoanApplicationServiceTest.java
git commit -m "feat(service): write statusChangedAt on create, transition, and clone"
```

---

### Task 1.4: DTOs — `LoanListRow`, `LoanListFilters`, `LoanSearchHit`, `LoanListPage`

**Files:**
- Create: `backend/src/main/java/com/msfg/mortgage/dto/LoanListRow.java`
- Create: `backend/src/main/java/com/msfg/mortgage/dto/LoanListFilters.java`
- Create: `backend/src/main/java/com/msfg/mortgage/dto/LoanSearchHit.java`
- Create: `backend/src/main/java/com/msfg/mortgage/dto/LoanListPage.java`

All four are records — no tests of their own (they're plain data; behavior is tested via the services that produce them).

- [ ] **Step 1: Create `LoanListRow.java`**

```java
package com.msfg.mortgage.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Flat projection of one loan as it appears in a pipeline-table row.
 *
 * Shaped for the Hybrid column set: Borrower+Property, Status+stage-age,
 * outstanding conditions, Amount+LTV, Close, LO. LTV is precomputed here
 * (loanAmount / propertyValue * 100) so the frontend doesn't have to
 * recompute per row.
 */
public record LoanListRow(
    Long id,
    String applicationNumber,
    String status,
    String borrowerName,
    String city,
    String state,
    Integer outstandingConditions,
    BigDecimal loanAmount,
    BigDecimal propertyValue,
    Double ltvPct,
    LocalDate estClosingDate,
    String assignedLoName,
    LocalDateTime statusChangedAt,
    LocalDateTime createdDate
) {}
```

- [ ] **Step 2: Create `LoanListFilters.java`**

```java
package com.msfg.mortgage.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/**
 * Parsed query-param bag for GET /api/loan-applications. Built once per
 * request from the @RequestParam values. Optionals are empty when the
 * caller omitted that filter.
 *
 * `sortField` is whitelisted in the service — only createdDate,
 * statusChangedAt, and loanAmount are valid; anything else falls back to
 * createdDate DESC.
 */
public record LoanListFilters(
    List<String> statuses,            // empty list = no status filter
    Optional<Integer> assignedLoId,
    Optional<Integer> conditionsGt,
    Optional<LocalDate> closingFrom,
    Optional<LocalDate> closingTo,
    Optional<Integer> stageAgeGtDays,
    List<String> loanTypes,
    Optional<BigDecimal> amountMin,
    Optional<BigDecimal> amountMax,
    String sortField,                 // "createdDate" | "statusChangedAt" | "loanAmount"
    String sortDirection,             // "asc" | "desc"
    int page,
    int size
) {
    public static LoanListFilters defaults() {
        return new LoanListFilters(
            List.of(), Optional.empty(), Optional.empty(),
            Optional.empty(), Optional.empty(), Optional.empty(),
            List.of(), Optional.empty(), Optional.empty(),
            "createdDate", "desc", 0, 25
        );
    }
}
```

- [ ] **Step 3: Create `LoanSearchHit.java`**

```java
package com.msfg.mortgage.dto;

/**
 * Lean row for the typeahead dropdown. Only what the dropdown renders:
 * primary name + secondary identity (city + app#) + status pill.
 */
public record LoanSearchHit(
    Long id,
    String applicationNumber,
    String borrowerName,
    String city,
    String state,
    String status
) {}
```

- [ ] **Step 4: Create `LoanListPage.java`**

```java
package com.msfg.mortgage.dto;

import java.util.List;

/**
 * Page envelope returned by GET /api/loan-applications. Matches what the
 * frontend's useFilterUrlState expects: { content, totalElements, totalPages,
 * page, size }.
 */
public record LoanListPage(
    List<LoanListRow> content,
    long totalElements,
    int totalPages,
    int page,
    int size
) {}
```

- [ ] **Step 5: Verify it compiles**

```
cd backend && mvn -q -DskipTests compile
```

Expected: clean build.

- [ ] **Step 6: Commit**

```bash
git add backend/src/main/java/com/msfg/mortgage/dto/LoanListRow.java \
        backend/src/main/java/com/msfg/mortgage/dto/LoanListFilters.java \
        backend/src/main/java/com/msfg/mortgage/dto/LoanSearchHit.java \
        backend/src/main/java/com/msfg/mortgage/dto/LoanListPage.java
git commit -m "feat(dto): LoanListRow, LoanListFilters, LoanSearchHit, LoanListPage"
```

---

### Task 1.5: `LoanApplicationListService` — paged list query

**Files:**
- Create: `backend/src/main/java/com/msfg/mortgage/service/LoanApplicationListService.java`
- Create: `backend/src/test/java/com/msfg/mortgage/service/LoanApplicationListServiceTest.java`

Uses `NamedParameterJdbcTemplate` against `loan_list_view`. Building the SQL dynamically from the filters bag is cleaner than Spring Data `Specification` here — the projection isn't an entity, the conditions count needs a subquery, and the sort whitelist is small.

- [ ] **Step 1: Write the failing test scaffold**

Create `backend/src/test/java/com/msfg/mortgage/service/LoanApplicationListServiceTest.java`:

```java
package com.msfg.mortgage.service;

import com.msfg.mortgage.dto.BorrowerDTO;
import com.msfg.mortgage.dto.LoanApplicationDTO;
import com.msfg.mortgage.dto.LoanListFilters;
import com.msfg.mortgage.dto.LoanListPage;
import com.msfg.mortgage.dto.PropertyDTO;
import com.msfg.mortgage.model.LoanApplication;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Repository-style test for the paged pipeline list. Real H2 so the SQL we
 * write actually runs.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class LoanApplicationListServiceTest {

    @Autowired private LoanApplicationService loanApplicationService;
    @Autowired private LoanApplicationListService listService;

    private LoanApplication appWith(String purpose, BigDecimal amount, BigDecimal value, String status) {
        LoanApplicationDTO dto = new LoanApplicationDTO();
        dto.setLoanPurpose(purpose);
        dto.setLoanType("Conventional");
        dto.setLoanAmount(amount);
        dto.setPropertyValue(value);

        PropertyDTO p = new PropertyDTO();
        p.setAddressLine("123 Main");
        p.setCity("Lehi"); p.setState("UT"); p.setZipCode("84043");
        p.setPropertyType("PrimaryResidence");
        p.setPropertyValue(value);
        dto.setProperty(p);

        BorrowerDTO b = new BorrowerDTO();
        b.setFirstName("Test"); b.setLastName("Borrower" + amount.intValue());
        b.setEmail("t@example.com"); b.setSequenceNumber(1);
        dto.setBorrowers(List.of(b));

        LoanApplication saved = loanApplicationService.createApplication(dto);
        if (status != null) loanApplicationService.updateApplicationStatus(saved.getId(), status, null);
        return saved;
    }

    @Test
    void list_returnsEmptyPageWhenNoLoansMatch() {
        LoanListFilters filters = LoanListFilters.defaults();

        LoanListPage page = listService.list(filters);

        assertThat(page.content()).isEmpty();
        assertThat(page.totalElements()).isZero();
        assertThat(page.page()).isZero();
        assertThat(page.size()).isEqualTo(25);
    }

    @Test
    void list_returnsCreatedLoan() {
        appWith("Purchase", new BigDecimal("400000"), new BigDecimal("500000"), null);

        LoanListPage page = listService.list(LoanListFilters.defaults());

        assertThat(page.content()).hasSize(1);
        assertThat(page.content().get(0).loanAmount()).isEqualByComparingTo("400000");
        assertThat(page.content().get(0).ltvPct()).isEqualTo(80.0);
        assertThat(page.content().get(0).borrowerName()).contains("Borrower");
    }

    @Test
    void list_filtersByStatus() {
        appWith("Purchase", new BigDecimal("300000"), new BigDecimal("400000"), "UNDERWRITING");
        appWith("Purchase", new BigDecimal("350000"), new BigDecimal("450000"), "APPLICATION");

        LoanListFilters filters = new LoanListFilters(
            List.of("UNDERWRITING"), Optional.empty(), Optional.empty(),
            Optional.empty(), Optional.empty(), Optional.empty(),
            List.of(), Optional.empty(), Optional.empty(),
            "createdDate", "desc", 0, 25
        );

        LoanListPage page = listService.list(filters);

        assertThat(page.content()).hasSize(1);
        assertThat(page.content().get(0).status()).isEqualTo("UNDERWRITING");
    }

    @Test
    void list_filtersByAmountRange() {
        appWith("Purchase", new BigDecimal("250000"), new BigDecimal("300000"), null);
        appWith("Purchase", new BigDecimal("550000"), new BigDecimal("700000"), null);
        appWith("Purchase", new BigDecimal("900000"), new BigDecimal("1000000"), null);

        LoanListFilters filters = new LoanListFilters(
            List.of(), Optional.empty(), Optional.empty(),
            Optional.empty(), Optional.empty(), Optional.empty(),
            List.of(),
            Optional.of(new BigDecimal("400000")),
            Optional.of(new BigDecimal("800000")),
            "createdDate", "desc", 0, 25
        );

        LoanListPage page = listService.list(filters);

        assertThat(page.content()).hasSize(1);
        assertThat(page.content().get(0).loanAmount()).isEqualByComparingTo("550000");
    }

    @Test
    void list_paginatesAndReportsTotals() {
        for (int i = 0; i < 7; i++) {
            appWith("Purchase", new BigDecimal(100000 + i * 1000), new BigDecimal("500000"), null);
        }

        LoanListFilters page0 = new LoanListFilters(
            List.of(), Optional.empty(), Optional.empty(),
            Optional.empty(), Optional.empty(), Optional.empty(),
            List.of(), Optional.empty(), Optional.empty(),
            "createdDate", "desc", 0, 3
        );

        LoanListPage result = listService.list(page0);

        assertThat(result.content()).hasSize(3);
        assertThat(result.totalElements()).isEqualTo(7);
        assertThat(result.totalPages()).isEqualTo(3);
        assertThat(result.page()).isZero();
        assertThat(result.size()).isEqualTo(3);
    }

    @Test
    void list_sortsByLoanAmountAsc() {
        appWith("Purchase", new BigDecimal("300000"), new BigDecimal("400000"), null);
        appWith("Purchase", new BigDecimal("100000"), new BigDecimal("200000"), null);
        appWith("Purchase", new BigDecimal("200000"), new BigDecimal("300000"), null);

        LoanListFilters filters = new LoanListFilters(
            List.of(), Optional.empty(), Optional.empty(),
            Optional.empty(), Optional.empty(), Optional.empty(),
            List.of(), Optional.empty(), Optional.empty(),
            "loanAmount", "asc", 0, 25
        );

        LoanListPage page = listService.list(filters);

        assertThat(page.content().stream().map(r -> r.loanAmount().intValue()).toList())
            .containsExactly(100000, 200000, 300000);
    }

    @Test
    void list_unknownSortFieldFallsBackToCreatedDateDesc() {
        appWith("Purchase", new BigDecimal("100000"), new BigDecimal("200000"), null);
        appWith("Purchase", new BigDecimal("200000"), new BigDecimal("300000"), null);

        LoanListFilters filters = new LoanListFilters(
            List.of(), Optional.empty(), Optional.empty(),
            Optional.empty(), Optional.empty(), Optional.empty(),
            List.of(), Optional.empty(), Optional.empty(),
            "DROP TABLE loan_applications", "desc", 0, 25
        );

        LoanListPage page = listService.list(filters);

        // Did not blow up; returned in created_date DESC order.
        assertThat(page.totalElements()).isEqualTo(2);
        assertThat(page.content().get(0).loanAmount()).isEqualByComparingTo("200000"); // newer
    }
}
```

- [ ] **Step 2: Run test — expect compile failure (service doesn't exist)**

```
cd backend && mvn test -Dtest=LoanApplicationListServiceTest
```

Expected: compile failure on `LoanApplicationListService` import.

- [ ] **Step 3: Implement `LoanApplicationListService`**

Create `backend/src/main/java/com/msfg/mortgage/service/LoanApplicationListService.java`:

```java
package com.msfg.mortgage.service;

import com.msfg.mortgage.dto.LoanListFilters;
import com.msfg.mortgage.dto.LoanListPage;
import com.msfg.mortgage.dto.LoanListRow;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Paged, filtered, sorted backing for GET /api/loan-applications.
 *
 * <p>Queries the {@code loan_list_view} added in V24. The view does the heavy
 * lifting (primary borrower pick, address + closing join) so this service
 * only assembles WHERE/ORDER/LIMIT and a correlated COUNT for outstanding
 * conditions.
 *
 * <p>SQL is built dynamically from the {@link LoanListFilters} bag. The
 * sort field is whitelisted — anything not in {@link #SORTABLE_COLUMNS}
 * falls back to {@code created_date DESC} so a malicious caller can't
 * inject {@code DROP TABLE} via the sort param.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class LoanApplicationListService {

    /** Whitelist of sortable columns. Map key = API name, value = SQL column. */
    private static final Map<String, String> SORTABLE_COLUMNS = Map.of(
        "createdDate",      "created_date",
        "statusChangedAt",  "status_changed_at",
        "loanAmount",       "loan_amount"
    );

    private static final Set<String> SORT_DIRECTIONS = Set.of("asc", "desc");

    private final NamedParameterJdbcTemplate jdbc;

    public LoanListPage list(LoanListFilters filters) {
        StringBuilder where = new StringBuilder(" WHERE 1=1 ");
        MapSqlParameterSource params = new MapSqlParameterSource();

        if (!filters.statuses().isEmpty()) {
            where.append(" AND status IN (:statuses) ");
            params.addValue("statuses", filters.statuses());
        }
        filters.assignedLoId().ifPresent(id -> {
            where.append(" AND assigned_lo_id = :loId ");
            params.addValue("loId", id);
        });
        filters.conditionsGt().ifPresent(n -> {
            where.append(" AND (SELECT COUNT(*) FROM loan_conditions lc " +
                         "      WHERE lc.application_id = v.id AND lc.status = 'Outstanding') > :condGt ");
            params.addValue("condGt", n);
        });
        filters.closingFrom().ifPresent(d -> {
            where.append(" AND est_closing_date >= :closeFrom ");
            params.addValue("closeFrom", java.sql.Date.valueOf(d));
        });
        filters.closingTo().ifPresent(d -> {
            where.append(" AND est_closing_date <= :closeTo ");
            params.addValue("closeTo", java.sql.Date.valueOf(d));
        });
        filters.stageAgeGtDays().ifPresent(d -> {
            where.append(" AND status_changed_at < CURRENT_TIMESTAMP - INTERVAL '" + d + "' DAY ");
            // d is a parsed Integer so safe to inline. Avoids interval-binding
            // gymnastics that differ between H2 and Postgres.
        });
        if (!filters.loanTypes().isEmpty()) {
            where.append(" AND loan_type IN (:loanTypes) ");
            params.addValue("loanTypes", filters.loanTypes());
        }
        filters.amountMin().ifPresent(min -> {
            where.append(" AND loan_amount >= :amountMin ");
            params.addValue("amountMin", min);
        });
        filters.amountMax().ifPresent(max -> {
            where.append(" AND loan_amount <= :amountMax ");
            params.addValue("amountMax", max);
        });

        String sortCol = SORTABLE_COLUMNS.getOrDefault(filters.sortField(), "created_date");
        String sortDir = SORT_DIRECTIONS.contains(filters.sortDirection().toLowerCase())
            ? filters.sortDirection().toLowerCase() : "desc";

        int page = Math.max(0, filters.page());
        int size = Math.max(1, Math.min(filters.size(), 200));   // cap at 200 to avoid runaway pages
        int offset = page * size;

        String selectSql = """
            SELECT v.id, v.application_number, v.status, v.borrower_name,
                   v.property_city, v.property_state,
                   (SELECT COUNT(*) FROM loan_conditions lc
                     WHERE lc.application_id = v.id AND lc.status = 'Outstanding') AS outstanding_conditions,
                   v.loan_amount, v.property_value,
                   CASE WHEN v.property_value IS NOT NULL AND v.property_value > 0
                        THEN (v.loan_amount / v.property_value) * 100.0
                        ELSE NULL
                   END AS ltv_pct,
                   v.est_closing_date,
                   v.assigned_lo_name,
                   v.status_changed_at,
                   v.created_date
              FROM loan_list_view v
            """ + where + " ORDER BY " + sortCol + " " + sortDir + ", v.id DESC " +
            " LIMIT :limit OFFSET :offset ";
        params.addValue("limit", size);
        params.addValue("offset", offset);

        String countSql = "SELECT COUNT(*) FROM loan_list_view v " + where;

        List<LoanListRow> content = jdbc.query(selectSql, params, (rs, i) -> new LoanListRow(
            rs.getLong("id"),
            rs.getString("application_number"),
            rs.getString("status"),
            rs.getString("borrower_name"),
            rs.getString("property_city"),
            rs.getString("property_state"),
            (Integer) rs.getObject("outstanding_conditions"),
            (BigDecimal) rs.getObject("loan_amount"),
            (BigDecimal) rs.getObject("property_value"),
            (Double) rs.getObject("ltv_pct"),
            rs.getDate("est_closing_date") != null ? rs.getDate("est_closing_date").toLocalDate() : null,
            rs.getString("assigned_lo_name"),
            rs.getTimestamp("status_changed_at") != null ? rs.getTimestamp("status_changed_at").toLocalDateTime() : null,
            rs.getTimestamp("created_date") != null ? rs.getTimestamp("created_date").toLocalDateTime() : null
        ));

        Long total = jdbc.queryForObject(countSql, params, Long.class);
        long totalElements = total != null ? total : 0L;
        int totalPages = (int) Math.ceil((double) totalElements / size);

        return new LoanListPage(content, totalElements, totalPages, page, size);
    }

    /** Helper for the controller — returns a List directly with no count. */
    public List<LoanListRow> listAllUnpaged(LoanListFilters filters) {
        // Used only by export-style code paths; capped at 1000 internally.
        LoanListFilters capped = new LoanListFilters(
            filters.statuses(), filters.assignedLoId(), filters.conditionsGt(),
            filters.closingFrom(), filters.closingTo(), filters.stageAgeGtDays(),
            filters.loanTypes(), filters.amountMin(), filters.amountMax(),
            filters.sortField(), filters.sortDirection(), 0, 1000
        );
        return list(capped).content();
    }
}
```

- [ ] **Step 4: Run tests — expect PASS**

```
mvn test -Dtest=LoanApplicationListServiceTest
```

Expected: all 7 tests pass.

If `INTERVAL '5' DAY` fails on H2, swap the line for:
```java
where.append(" AND status_changed_at < DATEADD('DAY', -" + d + ", CURRENT_TIMESTAMP) ");
```
(H2 supports `DATEADD`; if Postgres rejects it later, branch on the active profile or use a JdbcTemplate dialect check.)

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/msfg/mortgage/service/LoanApplicationListService.java \
        backend/src/test/java/com/msfg/mortgage/service/LoanApplicationListServiceTest.java
git commit -m "feat(service): LoanApplicationListService — paged loan_list_view query"
```

---

### Task 1.6: `LoanSearchService` — typeahead

**Files:**
- Create: `backend/src/main/java/com/msfg/mortgage/service/LoanSearchService.java`
- Create: `backend/src/test/java/com/msfg/mortgage/service/LoanSearchServiceTest.java`

- [ ] **Step 1: Write the failing test**

```java
package com.msfg.mortgage.service;

import com.msfg.mortgage.dto.BorrowerDTO;
import com.msfg.mortgage.dto.LoanApplicationDTO;
import com.msfg.mortgage.dto.LoanSearchHit;
import com.msfg.mortgage.dto.PropertyDTO;
import com.msfg.mortgage.model.LoanApplication;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class LoanSearchServiceTest {

    @Autowired private LoanApplicationService loanApplicationService;
    @Autowired private LoanSearchService searchService;

    private LoanApplication seedLoan(String first, String last, String city) {
        LoanApplicationDTO dto = new LoanApplicationDTO();
        dto.setLoanPurpose("Purchase");
        dto.setLoanType("Conventional");
        dto.setLoanAmount(new BigDecimal("400000"));
        dto.setPropertyValue(new BigDecimal("500000"));

        PropertyDTO p = new PropertyDTO();
        p.setAddressLine("123 Main"); p.setCity(city); p.setState("UT"); p.setZipCode("84043");
        p.setPropertyType("PrimaryResidence");
        p.setPropertyValue(new BigDecimal("500000"));
        dto.setProperty(p);

        BorrowerDTO b = new BorrowerDTO();
        b.setFirstName(first); b.setLastName(last);
        b.setEmail(first.toLowerCase() + "@example.com"); b.setSequenceNumber(1);
        dto.setBorrowers(List.of(b));

        return loanApplicationService.createApplication(dto);
    }

    @Test
    void search_returnsEmptyForBlankQuery() {
        List<LoanSearchHit> hits = searchService.search("", 10);
        assertThat(hits).isEmpty();
    }

    @Test
    void search_returnsEmptyForOneCharQuery() {
        seedLoan("Fortney", "Matthew", "Lehi");
        List<LoanSearchHit> hits = searchService.search("F", 10);
        assertThat(hits).isEmpty();
    }

    @Test
    void search_matchesBorrowerLastName() {
        seedLoan("Matthew", "Fortney", "Lehi");
        seedLoan("Veronica", "Sawaged", "Provo");

        List<LoanSearchHit> hits = searchService.search("Fortney", 10);

        assertThat(hits).hasSize(1);
        assertThat(hits.get(0).borrowerName()).contains("Fortney");
        assertThat(hits.get(0).city()).isEqualTo("Lehi");
    }

    @Test
    void search_isCaseInsensitive() {
        seedLoan("Matthew", "Fortney", "Lehi");
        List<LoanSearchHit> hits = searchService.search("FORTNEY", 10);
        assertThat(hits).hasSize(1);
    }

    @Test
    void search_matchesApplicationNumberPrefix() {
        LoanApplication la = seedLoan("Anna", "Chen", "Park City");

        // The applicationNumber generator produces something like APP-NNNNN.
        // Grab the first 4 chars as the prefix to test.
        String prefix = la.getApplicationNumber().substring(0, 4);

        List<LoanSearchHit> hits = searchService.search(prefix, 10);

        assertThat(hits).extracting(LoanSearchHit::id).contains(la.getId());
    }

    @Test
    void search_respectsLimit() {
        for (int i = 0; i < 6; i++) seedLoan("Rep" + i, "Tester", "City" + i);

        List<LoanSearchHit> hits = searchService.search("Tester", 3);

        assertThat(hits).hasSize(3);
    }
}
```

- [ ] **Step 2: Run — expect compile failure**

```
mvn test -Dtest=LoanSearchServiceTest
```

Expected: compile failure on missing class.

- [ ] **Step 3: Implement `LoanSearchService`**

Create `backend/src/main/java/com/msfg/mortgage/service/LoanSearchService.java`:

```java
package com.msfg.mortgage.service;

import com.msfg.mortgage.dto.LoanSearchHit;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Typeahead for the global TopBar search. Backed by {@code loan_list_view}
 * (V24).
 *
 * <p>Ranking:
 * <ol>
 *   <li>Exact match on any identifier (application_number,
 *       lendingpad_loan_number, mers_min, investor_loan_number) → rank 1</li>
 *   <li>Prefix match on the same identifiers → rank 2</li>
 *   <li>Substring match on borrower name → rank 3</li>
 * </ol>
 *
 * <p>Why {@code ILIKE %q%} for the name instead of {@code pg_trgm}: the
 * V24 trigram GIN works on Postgres but H2 doesn't have pg_trgm. The same
 * code path runs in both environments; Postgres can still hit the trigram
 * index via the planner's ILIKE-to-trigram optimization with the GIN
 * present, and H2 falls back to a (small) full scan. At 1K–5K loans this
 * is fine.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class LoanSearchService {

    private static final int MIN_QUERY_LEN = 2;
    private static final int DEFAULT_LIMIT = 10;

    private final NamedParameterJdbcTemplate jdbc;

    public List<LoanSearchHit> search(String rawQuery, Integer limit) {
        if (rawQuery == null) return List.of();
        String q = rawQuery.trim();
        if (q.length() < MIN_QUERY_LEN) return List.of();

        int cap = (limit == null || limit < 1 || limit > 50) ? DEFAULT_LIMIT : limit;

        MapSqlParameterSource p = new MapSqlParameterSource();
        p.addValue("q",        q);
        p.addValue("qPrefix",  q + "%");
        p.addValue("qSubstr",  "%" + q + "%");
        p.addValue("limit",    cap);

        String sql = """
            SELECT id, application_number, borrower_name,
                   property_city, property_state, status, rank
              FROM (
                SELECT id, application_number, borrower_name,
                       property_city, property_state, status,
                       CASE
                         WHEN UPPER(application_number)      = UPPER(:q)
                           OR UPPER(lendingpad_loan_number)  = UPPER(:q)
                           OR UPPER(mers_min)                = UPPER(:q)
                           OR UPPER(investor_loan_number)    = UPPER(:q) THEN 1
                         WHEN UPPER(application_number)      LIKE UPPER(:qPrefix)
                           OR UPPER(lendingpad_loan_number)  LIKE UPPER(:qPrefix)
                           OR UPPER(mers_min)                LIKE UPPER(:qPrefix)
                           OR UPPER(investor_loan_number)    LIKE UPPER(:qPrefix) THEN 2
                         ELSE 3
                       END AS rank
                  FROM loan_list_view
                 WHERE UPPER(application_number)     LIKE UPPER(:qPrefix)
                    OR UPPER(lendingpad_loan_number) LIKE UPPER(:qPrefix)
                    OR UPPER(mers_min)               LIKE UPPER(:qPrefix)
                    OR UPPER(investor_loan_number)   LIKE UPPER(:qPrefix)
                    OR UPPER(borrower_name)          LIKE UPPER(:qSubstr)
              ) ranked
             ORDER BY rank, application_number
             LIMIT :limit
            """;

        return jdbc.query(sql, p, (rs, i) -> new LoanSearchHit(
            rs.getLong("id"),
            rs.getString("application_number"),
            rs.getString("borrower_name"),
            rs.getString("property_city"),
            rs.getString("property_state"),
            rs.getString("status")
        ));
    }
}
```

- [ ] **Step 4: Run — expect PASS**

```
mvn test -Dtest=LoanSearchServiceTest
```

Expected: all 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/msfg/mortgage/service/LoanSearchService.java \
        backend/src/test/java/com/msfg/mortgage/service/LoanSearchServiceTest.java
git commit -m "feat(service): LoanSearchService — ranked typeahead over loan_list_view"
```

---

### Task 1.7: Controller — replace `@GetMapping`, add `/search`

**Files:**
- Modify: `backend/src/main/java/com/msfg/mortgage/controller/LoanApplicationController.java`
- Create: `backend/src/test/java/com/msfg/mortgage/controller/LoanApplicationListControllerTest.java`

Strategy: keep the old `getAllApplications()` route as `@GetMapping("/all")` (deprecated path) during Phase 1 so any straggler caller still gets data. The new paged route takes over `@GetMapping`. The `/all` route is **deleted in Phase 3** when no caller remains.

- [ ] **Step 1: Write the failing controller test**

Create `backend/src/test/java/com/msfg/mortgage/controller/LoanApplicationListControllerTest.java`:

```java
package com.msfg.mortgage.controller;

import com.msfg.mortgage.dto.BorrowerDTO;
import com.msfg.mortgage.dto.LoanApplicationDTO;
import com.msfg.mortgage.dto.PropertyDTO;
import com.msfg.mortgage.service.LoanApplicationService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@WithMockUser(username = "admin@example.com", roles = "Admin")
@Transactional
class LoanApplicationListControllerTest {

    @Autowired private MockMvc mvc;
    @Autowired private ObjectMapper om;
    @Autowired private LoanApplicationService loanApplicationService;

    private void seed(String first, String last) {
        LoanApplicationDTO dto = new LoanApplicationDTO();
        dto.setLoanPurpose("Purchase"); dto.setLoanType("Conventional");
        dto.setLoanAmount(new BigDecimal("400000")); dto.setPropertyValue(new BigDecimal("500000"));

        PropertyDTO p = new PropertyDTO();
        p.setAddressLine("123 Main"); p.setCity("Lehi"); p.setState("UT"); p.setZipCode("84043");
        p.setPropertyType("PrimaryResidence"); p.setPropertyValue(new BigDecimal("500000"));
        dto.setProperty(p);

        BorrowerDTO b = new BorrowerDTO();
        b.setFirstName(first); b.setLastName(last);
        b.setEmail(first.toLowerCase() + "@example.com"); b.setSequenceNumber(1);
        dto.setBorrowers(List.of(b));

        loanApplicationService.createApplication(dto);
    }

    @Test
    void listEndpoint_returnsPagedShape() throws Exception {
        seed("Matthew", "Fortney");
        seed("Veronica", "Sawaged");

        String body = mvc.perform(get("/api/loan-applications").param("size", "10"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.content").isArray())
            .andExpect(jsonPath("$.totalElements").isNumber())
            .andExpect(jsonPath("$.totalPages").isNumber())
            .andExpect(jsonPath("$.page").value(0))
            .andExpect(jsonPath("$.size").value(10))
            .andReturn().getResponse().getContentAsString();

        JsonNode page = om.readTree(body);
        assertThat(page.get("totalElements").asLong()).isGreaterThanOrEqualTo(2);
    }

    @Test
    void listEndpoint_appliesStatusFilter() throws Exception {
        seed("Matthew", "Fortney");
        seed("Veronica", "Sawaged");
        // Both default to REGISTERED. Filter by REGISTERED → 2 rows; by FUNDED → 0.

        mvc.perform(get("/api/loan-applications").param("status", "FUNDED"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.totalElements").value(0));
    }

    @Test
    void searchEndpoint_returnsArrayOfHits() throws Exception {
        seed("Matthew", "Fortney");
        seed("Veronica", "Sawaged");

        mvc.perform(get("/api/loan-applications/search").param("q", "Fortney"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$").isArray())
            .andExpect(jsonPath("$.length()").value(1))
            .andExpect(jsonPath("$[0].borrowerName").value(org.hamcrest.Matchers.containsString("Fortney")));
    }

    @Test
    void searchEndpoint_shortQueryReturnsEmpty() throws Exception {
        seed("Matthew", "Fortney");

        mvc.perform(get("/api/loan-applications/search").param("q", "F"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(0));
    }
}
```

- [ ] **Step 2: Run — expect failure (404 on new shape / missing endpoints)**

```
mvn test -Dtest=LoanApplicationListControllerTest
```

Expected: all 4 tests fail (current `GET` returns a List, not the page envelope; `/search` 404).

- [ ] **Step 3: Modify the controller**

In `backend/src/main/java/com/msfg/mortgage/controller/LoanApplicationController.java`, first add the new field at the top of the class with the other injected services:

```java
    private final LoanApplicationListService loanApplicationListService;
    private final LoanSearchService loanSearchService;
```

(They'll get injected by `@RequiredArgsConstructor` automatically.)

Then **replace** the existing `getAllApplications()` block:

```java
    /**
     * Internal-only firehose. Borrowers/agents must use {@code GET /me/loans}, which is
     * filtered to loans they participate in.
     */
    @GetMapping
    @PreAuthorize("@loanAccessGuard.isInternal()")
    public ResponseEntity<List<LoanApplication>> getAllApplications() {
        List<LoanApplication> applications = loanApplicationService.getAllApplications();
        return new ResponseEntity<>(applications, HttpStatus.OK);
    }
```

…with this:

```java
    /**
     * Paged list backing the /applications pipeline page. Replaces the previous
     * unpaged firehose. The old shape is preserved at {@code GET /all} during the
     * frontend cutover (Phase 1 of the pipeline-and-search rollout) — that route
     * is deleted in Phase 3 once no caller remains.
     */
    @GetMapping
    @PreAuthorize("@loanAccessGuard.isInternal()")
    public ResponseEntity<LoanListPage> list(
            @RequestParam(required = false) List<String> status,
            @RequestParam(name = "lo", required = false) Integer assignedLoId,
            @RequestParam(required = false) Integer conditionsGt,
            @RequestParam(required = false) String closingFrom,
            @RequestParam(required = false) String closingTo,
            @RequestParam(required = false) Integer stageAgeGt,
            @RequestParam(required = false) List<String> loanType,
            @RequestParam(required = false) java.math.BigDecimal amountMin,
            @RequestParam(required = false) java.math.BigDecimal amountMax,
            @RequestParam(defaultValue = "createdDate,desc") String sort,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int size) {

        String[] sortParts = sort.split(",", 2);
        String sortField = sortParts.length > 0 && !sortParts[0].isBlank() ? sortParts[0] : "createdDate";
        String sortDir   = sortParts.length > 1 && !sortParts[1].isBlank() ? sortParts[1] : "desc";

        LoanListFilters filters = new LoanListFilters(
            status == null ? List.of() : status,
            java.util.Optional.ofNullable(assignedLoId),
            java.util.Optional.ofNullable(conditionsGt),
            parseDate(closingFrom),
            parseDate(closingTo),
            java.util.Optional.ofNullable(stageAgeGt),
            loanType == null ? List.of() : loanType,
            java.util.Optional.ofNullable(amountMin),
            java.util.Optional.ofNullable(amountMax),
            sortField, sortDir, page, size
        );

        return ResponseEntity.ok(loanApplicationListService.list(filters));
    }

    /** Deprecated firehose. Removed in Phase 3 of the pipeline rollout. */
    @GetMapping("/all")
    @PreAuthorize("@loanAccessGuard.isInternal()")
    @Deprecated
    public ResponseEntity<List<LoanApplication>> getAllApplications() {
        List<LoanApplication> applications = loanApplicationService.getAllApplications();
        return new ResponseEntity<>(applications, HttpStatus.OK);
    }

    /** Typeahead for the global TopBar search. */
    @GetMapping("/search")
    @PreAuthorize("@loanAccessGuard.isInternal()")
    public ResponseEntity<List<LoanSearchHit>> searchLoans(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Integer limit) {
        return ResponseEntity.ok(loanSearchService.search(q, limit));
    }

    private static java.util.Optional<java.time.LocalDate> parseDate(String s) {
        if (s == null || s.isBlank()) return java.util.Optional.empty();
        try { return java.util.Optional.of(java.time.LocalDate.parse(s.trim())); }
        catch (java.time.format.DateTimeParseException e) { return java.util.Optional.empty(); }
    }
```

Add the necessary imports at the top of the file (just above the existing imports):

```java
import com.msfg.mortgage.dto.LoanListFilters;
import com.msfg.mortgage.dto.LoanListPage;
import com.msfg.mortgage.dto.LoanSearchHit;
import com.msfg.mortgage.service.LoanApplicationListService;
import com.msfg.mortgage.service.LoanSearchService;
```

- [ ] **Step 4: Run — expect PASS**

```
mvn test -Dtest=LoanApplicationListControllerTest
```

Expected: all 4 tests pass.

- [ ] **Step 5: Run the full backend suite to catch regressions**

```
mvn test
```

Expected: all green. If the existing frontend integration tests (or anything else) calls `GET /api/loan-applications` expecting a List, **that's fine** because the frontend still uses the old shape until Phase 3 — but those tests don't exist on the backend side. If something *does* break, it's the change from a `List` response to a `LoanListPage` response — adjust whatever asserts on the shape, or revisit whether the change is safe.

- [ ] **Step 6: Commit**

```bash
git add backend/src/main/java/com/msfg/mortgage/controller/LoanApplicationController.java \
        backend/src/test/java/com/msfg/mortgage/controller/LoanApplicationListControllerTest.java
git commit -m "feat(api): paged GET /loan-applications + GET /search; firehose at /all (deprecated)"
```

---

### Task 1.8: Phase-1 gate — deploy backend to prod

The frontend hasn't been touched yet. The existing `ApplicationList.js` calls `GET /loan-applications` and now receives a paged envelope it doesn't understand → it'll show "No applications match your search." That's an outage of the list page.

**Fix it temporarily** by updating one line in `mortgageService.getApplications` so the existing frontend keeps rendering during Phase 2's typeahead work:

- [ ] **Step 1: Adjust the frontend service to read from `/all` until Phase 3 rewrites the page**

In `frontend/src/services/mortgageService.js`, find:

```js
  getApplications: async () => {
    const { data } = await apiClient.get('/loan-applications');
    return data;
  },
```

Replace with:

```js
  getApplications: async () => {
    // TEMP: the legacy ApplicationList expects an array. The new paged shape
    // is at GET /loan-applications; the deprecated firehose lives at /all
    // and is consumed here until Phase 3 rewrites this page. Removed in
    // task 3.x along with the deprecated /all route.
    const { data } = await apiClient.get('/loan-applications/all');
    return data;
  },
```

- [ ] **Step 2: Build + commit**

```bash
cd frontend && CI=false npm run build 2>&1 | tail -5
cd ..
git add frontend/src/services/mortgageService.js
git commit -m "chore(api): point legacy ApplicationList at /loan-applications/all during cutover"
```

- [ ] **Step 3: Deploy**

```
./deploy.sh
```

Verify `/applications` still renders the old card list (against the new firehose alias) and that a manual curl returns the paged shape:

```bash
curl -H "Authorization: Bearer $TOKEN" 'https://app.msfgco.com/api/loan-applications?size=2' | jq .
```

Expected: `{ "content": [...], "totalElements": N, "totalPages": N, "page": 0, "size": 2 }`.

```bash
curl -H "Authorization: Bearer $TOKEN" 'https://app.msfgco.com/api/loan-applications/search?q=for' | jq .
```

Expected: an array, possibly empty.

Phase 1 is done.

---

# Phase 2 — Frontend: global typeahead in TopBar

Self-contained. Hits the Phase 1 endpoints. No changes to the pipeline page yet.

---

### Task 2.1: `mortgageService.searchLoans`

**Files:**
- Modify: `frontend/src/services/mortgageService.js`

- [ ] **Step 1: Add the method**

Right under `getApplications` (or wherever feels appropriate), add:

```js
  /**
   * Typeahead for the global TopBar search. Returns up to `limit` ranked hits.
   * Uses an AbortController so rapid retypes cancel in-flight requests.
   *
   * @param {string} q
   * @param {{ limit?: number, signal?: AbortSignal }} [opts]
   */
  searchLoans: async (q, opts = {}) => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (opts.limit) params.set('limit', String(opts.limit));
    const { data } = await apiClient.get(
      `/loan-applications/search?${params.toString()}`,
      { signal: opts.signal },
    );
    return Array.isArray(data) ? data : [];
  },
```

- [ ] **Step 2: Smoke check**

```
cd frontend && CI=false npm run build 2>&1 | tail -5
```

Expected: builds clean.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/services/mortgageService.js
git commit -m "feat(service): mortgageService.searchLoans (TopBar typeahead client)"
```

---

### Task 2.2: `recentLoans` utility (localStorage cache)

**Files:**
- Create: `frontend/src/utils/recentLoans.js`
- Create: `frontend/src/utils/recentLoans.test.js`

- [ ] **Step 1: Write the failing test**

```js
// frontend/src/utils/recentLoans.test.js
import { pushRecentLoan, getRecentLoans, clearRecentLoans, RECENT_LOANS_KEY } from './recentLoans';

beforeEach(() => {
  window.localStorage.clear();
});

describe('recentLoans', () => {
  test('getRecentLoans returns [] when storage empty', () => {
    expect(getRecentLoans()).toEqual([]);
  });

  test('pushRecentLoan stores the loan and getRecentLoans returns it', () => {
    pushRecentLoan({ id: 7, applicationNumber: 'APP-007', borrowerName: 'Fortney, Matthew' });
    const recents = getRecentLoans();
    expect(recents).toHaveLength(1);
    expect(recents[0]).toMatchObject({ id: 7, applicationNumber: 'APP-007', borrowerName: 'Fortney, Matthew' });
    expect(recents[0].openedAt).toEqual(expect.any(Number));
  });

  test('pushRecentLoan dedupes by id, keeping the latest', () => {
    pushRecentLoan({ id: 7, applicationNumber: 'APP-007', borrowerName: 'A' });
    pushRecentLoan({ id: 8, applicationNumber: 'APP-008', borrowerName: 'B' });
    pushRecentLoan({ id: 7, applicationNumber: 'APP-007', borrowerName: 'A renamed' });
    const recents = getRecentLoans();
    expect(recents.map(r => r.id)).toEqual([7, 8]);
    expect(recents[0].borrowerName).toBe('A renamed');
  });

  test('pushRecentLoan caps at 10', () => {
    for (let i = 0; i < 12; i++) {
      pushRecentLoan({ id: i, applicationNumber: `APP-${i}`, borrowerName: `B${i}` });
    }
    expect(getRecentLoans()).toHaveLength(10);
    // newest first, so id 11 is at index 0; id 0 and 1 fell off
    expect(getRecentLoans()[0].id).toBe(11);
    expect(getRecentLoans().map(r => r.id)).not.toContain(0);
  });

  test('clearRecentLoans empties the cache', () => {
    pushRecentLoan({ id: 1, applicationNumber: 'a', borrowerName: 'b' });
    clearRecentLoans();
    expect(getRecentLoans()).toEqual([]);
  });

  test('survives corrupt JSON in storage', () => {
    window.localStorage.setItem(RECENT_LOANS_KEY, '{not valid json');
    expect(getRecentLoans()).toEqual([]);
  });

  test('ignores pushRecentLoan with missing id', () => {
    pushRecentLoan({ applicationNumber: 'APP-X' });
    expect(getRecentLoans()).toEqual([]);
  });
});
```

- [ ] **Step 2: Run — expect failure (module missing)**

```
cd frontend && npm test -- --testPathPattern=recentLoans --watchAll=false
```

Expected: cannot find module.

- [ ] **Step 3: Implement the utility**

```js
// frontend/src/utils/recentLoans.js

/**
 * Local cache of the loans this browser has opened recently — drives the
 * TopBar typeahead's empty state. Capped at 10, deduped by id, newest first.
 * Scoped per browser (so per-user implicitly via Cognito-bound device).
 */

export const RECENT_LOANS_KEY = 'msfg.recentLoans';
const CAP = 10;

function safeRead() {
  try {
    const raw = window.localStorage.getItem(RECENT_LOANS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function safeWrite(list) {
  try {
    window.localStorage.setItem(RECENT_LOANS_KEY, JSON.stringify(list));
  } catch {
    // out of quota / disabled / etc. — silent.
  }
}

export function getRecentLoans() {
  return safeRead();
}

/**
 * Push a loan onto the recent list. Dedupes by `id`. Missing-id calls are ignored
 * so callers can safely fire from anywhere without null-checking.
 *
 * @param {{ id: number | string, applicationNumber?: string, borrowerName?: string }} loan
 */
export function pushRecentLoan(loan) {
  if (!loan || loan.id == null) return;
  const entry = {
    id: loan.id,
    applicationNumber: loan.applicationNumber || null,
    borrowerName: loan.borrowerName || null,
    openedAt: Date.now(),
  };
  const current = safeRead().filter((r) => r.id !== loan.id);
  current.unshift(entry);
  safeWrite(current.slice(0, CAP));
}

export function clearRecentLoans() {
  try { window.localStorage.removeItem(RECENT_LOANS_KEY); } catch {}
}
```

- [ ] **Step 4: Run — expect PASS**

```
npm test -- --testPathPattern=recentLoans --watchAll=false
```

Expected: 7/7 pass.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/utils/recentLoans.js frontend/src/utils/recentLoans.test.js
git commit -m "feat(util): recentLoans localStorage cache for TopBar typeahead empty state"
```

---

### Task 2.3: `LoanSearch` component — typeahead UI

**Files:**
- Create: `frontend/src/components/design/LoanSearch.jsx`
- Create: `frontend/src/components/design/LoanSearch.test.jsx`

- [ ] **Step 1: Write the failing test**

```jsx
// frontend/src/components/design/LoanSearch.test.jsx
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LoanSearch from './LoanSearch';
import mortgageService from '../../services/mortgageService';
import { pushRecentLoan, clearRecentLoans } from '../../utils/recentLoans';

jest.mock('../../services/mortgageService');

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

function renderSearch() {
  return render(
    <MemoryRouter>
      <LoanSearch />
    </MemoryRouter>
  );
}

beforeEach(() => {
  jest.useFakeTimers();
  mortgageService.searchLoans.mockReset();
  mockNavigate.mockReset();
  clearRecentLoans();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('LoanSearch', () => {
  test('renders an input with the find-a-loan placeholder', () => {
    renderSearch();
    expect(screen.getByPlaceholderText(/find a loan/i)).toBeInTheDocument();
  });

  test('does not query until 2 characters are typed', async () => {
    renderSearch();
    const input = screen.getByPlaceholderText(/find a loan/i);
    fireEvent.change(input, { target: { value: 'a' } });
    await act(async () => { jest.advanceTimersByTime(300); });
    expect(mortgageService.searchLoans).not.toHaveBeenCalled();
  });

  test('queries after debounce with 2+ characters', async () => {
    mortgageService.searchLoans.mockResolvedValue([
      { id: 1, applicationNumber: 'APP-001', borrowerName: 'Fortney, Matthew',
        city: 'Lehi', state: 'UT', status: 'UNDERWRITING' },
    ]);
    renderSearch();
    const input = screen.getByPlaceholderText(/find a loan/i);
    fireEvent.change(input, { target: { value: 'for' } });

    await act(async () => { jest.advanceTimersByTime(250); });
    await waitFor(() => expect(mortgageService.searchLoans).toHaveBeenCalledWith('for', expect.any(Object)));
    await waitFor(() => expect(screen.getByText(/Fortney, Matthew/)).toBeInTheDocument());
  });

  test('rapid retype cancels the in-flight request (abort)', async () => {
    const calls = [];
    mortgageService.searchLoans.mockImplementation((q, opts) => {
      calls.push({ q, signal: opts?.signal });
      return new Promise(() => {}); // never resolves
    });
    renderSearch();
    const input = screen.getByPlaceholderText(/find a loan/i);

    fireEvent.change(input, { target: { value: 'for' } });
    await act(async () => { jest.advanceTimersByTime(250); });
    fireEvent.change(input, { target: { value: 'fortney' } });
    await act(async () => { jest.advanceTimersByTime(250); });

    // First call's signal should now be aborted.
    expect(calls[0].signal?.aborted).toBe(true);
  });

  test('Enter on highlighted row navigates to /loan/:id', async () => {
    mortgageService.searchLoans.mockResolvedValue([
      { id: 42, applicationNumber: 'APP-042', borrowerName: 'Sawaged, Veronica',
        city: 'Provo', state: 'UT', status: 'CTC' },
    ]);
    renderSearch();
    const input = screen.getByPlaceholderText(/find a loan/i);
    fireEvent.change(input, { target: { value: 'saw' } });
    await act(async () => { jest.advanceTimersByTime(250); });
    await waitFor(() => screen.getByText(/Sawaged, Veronica/));

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(mockNavigate).toHaveBeenCalledWith('/loan/42');
  });

  test('Esc closes the dropdown', async () => {
    mortgageService.searchLoans.mockResolvedValue([
      { id: 1, applicationNumber: 'APP-001', borrowerName: 'Anyone',
        city: 'X', state: 'X', status: 'APPLICATION' },
    ]);
    renderSearch();
    const input = screen.getByPlaceholderText(/find a loan/i);
    fireEvent.change(input, { target: { value: 'any' } });
    await act(async () => { jest.advanceTimersByTime(250); });
    await waitFor(() => screen.getByText(/Anyone/));

    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByText(/Anyone/)).not.toBeInTheDocument();
  });

  test('empty-state shows up to 5 recently-opened loans', async () => {
    pushRecentLoan({ id: 11, applicationNumber: 'APP-011', borrowerName: 'Recent One' });
    pushRecentLoan({ id: 12, applicationNumber: 'APP-012', borrowerName: 'Recent Two' });

    renderSearch();
    const input = screen.getByPlaceholderText(/find a loan/i);
    fireEvent.focus(input);

    expect(screen.getByText(/Recent One/)).toBeInTheDocument();
    expect(screen.getByText(/Recent Two/)).toBeInTheDocument();
    expect(mortgageService.searchLoans).not.toHaveBeenCalled();
  });

  test('"no matches" shows a Browse-all link', async () => {
    mortgageService.searchLoans.mockResolvedValue([]);
    renderSearch();
    const input = screen.getByPlaceholderText(/find a loan/i);
    fireEvent.change(input, { target: { value: 'zzznomatch' } });
    await act(async () => { jest.advanceTimersByTime(250); });

    await waitFor(() => expect(screen.getByText(/no loans match/i)).toBeInTheDocument());
    expect(screen.getByRole('link', { name: /browse all/i })).toHaveAttribute(
      'href',
      expect.stringContaining('zzznomatch'),
    );
  });
});
```

- [ ] **Step 2: Run — expect module-missing failure**

```
npm test -- --testPathPattern=LoanSearch --watchAll=false
```

Expected: cannot find module.

- [ ] **Step 3: Implement `LoanSearch.jsx`**

```jsx
// frontend/src/components/design/LoanSearch.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Icon from './Icon';
import Pill from './Pill';
import mortgageService from '../../services/mortgageService';
import { getRecentLoans, pushRecentLoan } from '../../utils/recentLoans';
import './LoanSearch.css';

const DEBOUNCE_MS = 200;
const MIN_QUERY_LEN = 2;
const MAX_RECENT_SHOWN = 5;

function statusTone(status) {
  if (!status) return 'muted';
  if (status === 'FUNDED' || status === 'CTC' || status === 'DOCS_OUT') return 'active';
  if (status === 'DISPOSITIONED') return 'danger';
  if (status === 'REGISTERED' || status === 'APPLICATION') return 'muted';
  return 'review';
}

/** Highlight the matched substring inside `text` (case-insensitive). */
function Highlighted({ text, query }) {
  if (!query || !text) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark>{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

export default function LoanSearch() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [hasQueried, setHasQueried] = useState(false);

  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const debounceRef = useRef(null);
  const abortRef = useRef(null);

  const recents = useMemo(() => getRecentLoans().slice(0, MAX_RECENT_SHOWN), [open]);

  // Items rendered in the dropdown — query results when querying, recents
  // when empty.
  const items = query.trim().length >= MIN_QUERY_LEN ? hits : recents;

  // Debounced search.
  useEffect(() => {
    const q = query.trim();
    if (q.length < MIN_QUERY_LEN) {
      setHits([]);
      setHasQueried(false);
      setLoading(false);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (abortRef.current) abortRef.current.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setLoading(true);
      try {
        const results = await mortgageService.searchLoans(q, { signal: ctrl.signal, limit: 10 });
        if (!ctrl.signal.aborted) {
          setHits(results);
          setHasQueried(true);
          setHighlight(0);
        }
      } catch (e) {
        // axios throws on abort with code 'ERR_CANCELED'; swallow.
        if (e?.name !== 'CanceledError' && e?.code !== 'ERR_CANCELED') {
          // Don't surface — typeahead errors are too noisy for a toast.
          if (!ctrl.signal.aborted) {
            setHits([]);
            setHasQueried(true);
          }
        }
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => debounceRef.current && clearTimeout(debounceRef.current);
  }, [query]);

  // Global ⌘K / Ctrl+K.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // Click-outside to close.
  useEffect(() => {
    const onClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const choose = useCallback((hit) => {
    if (!hit) return;
    pushRecentLoan({
      id: hit.id,
      applicationNumber: hit.applicationNumber,
      borrowerName: hit.borrowerName,
    });
    setOpen(false);
    setQuery('');
    navigate(`/loan/${hit.id}`);
  }, [navigate]);

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setHighlight((h) => Math.min(h + 1, Math.max(items.length - 1, 0)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      choose(items[highlight]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const trimmed = query.trim();
  const showNoMatches = trimmed.length >= MIN_QUERY_LEN && hasQueried && !loading && hits.length === 0;

  return (
    <div className="loan-search" ref={containerRef} role="combobox"
         aria-expanded={open} aria-haspopup="listbox" aria-owns="loan-search-results">
      <span className="loan-search-icon"><Icon name="search" size={14} /></span>
      <input
        ref={inputRef}
        type="search"
        className="loan-search-input"
        placeholder="Find a loan… (⌘K)"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        aria-controls="loan-search-results"
        aria-activedescendant={open && items[highlight] ? `loan-search-opt-${items[highlight].id}` : undefined}
      />
      {open && (
        <div className="loan-search-panel" id="loan-search-results" role="listbox">
          {trimmed.length < MIN_QUERY_LEN && recents.length > 0 && (
            <div className="loan-search-section">Recently opened</div>
          )}
          {items.map((item, i) => {
            const isResult = trimmed.length >= MIN_QUERY_LEN;
            return (
              <button
                type="button"
                key={item.id}
                id={`loan-search-opt-${item.id}`}
                role="option"
                aria-selected={i === highlight}
                className={`loan-search-row${i === highlight ? ' is-highlighted' : ''}`}
                onMouseEnter={() => setHighlight(i)}
                onClick={() => choose(item)}
              >
                <div className="loan-search-row-main">
                  <div className="loan-search-row-name">
                    <Highlighted text={item.borrowerName || '—'} query={trimmed} />
                  </div>
                  <div className="loan-search-row-sub">
                    {[
                      [item.city, item.state].filter(Boolean).join(', '),
                      item.applicationNumber ? `#${item.applicationNumber}` : null,
                    ].filter(Boolean).join(' · ')}
                  </div>
                </div>
                {isResult && item.status && (
                  <Pill tone={statusTone(item.status)} dot>{item.status}</Pill>
                )}
              </button>
            );
          })}
          {trimmed.length < MIN_QUERY_LEN && recents.length === 0 && (
            <div className="loan-search-empty">Type a borrower name, app #, or loan #</div>
          )}
          {showNoMatches && (
            <div className="loan-search-empty">
              No loans match "{trimmed}" —{' '}
              <Link to={`/applications?q=${encodeURIComponent(trimmed)}`} className="loan-search-link">
                Browse all loans →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Add minimal CSS**

Create `frontend/src/components/design/LoanSearch.css`:

```css
.loan-search { position: relative; flex: 1; max-width: 480px; }
.loan-search-icon {
  position: absolute; left: 10px; top: 50%; transform: translateY(-50%);
  color: var(--ink-500);
}
.loan-search-input {
  width: 100%; padding: 7px 10px 7px 30px;
  border: 1px solid var(--ink-line); border-radius: 999px;
  background: #fff; font-size: 13px; color: var(--ink-900);
}
.loan-search-input:focus {
  outline: 2px solid var(--copper); outline-offset: 1px;
}
.loan-search-panel {
  position: absolute; top: calc(100% + 6px); left: 0; right: 0;
  background: #fff; border: 1px solid var(--ink-line); border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.08);
  max-height: 380px; overflow-y: auto; z-index: 50;
  padding: 6px 0;
}
.loan-search-section {
  font-size: 11px; text-transform: uppercase; letter-spacing: .08em;
  color: var(--ink-500); padding: 8px 14px 4px;
}
.loan-search-row {
  display: flex; align-items: center; justify-content: space-between;
  gap: 12px; width: 100%; padding: 8px 14px;
  background: transparent; border: 0; text-align: left; cursor: pointer;
  font-family: inherit;
}
.loan-search-row.is-highlighted { background: var(--bg-secondary, #f6f4ee); }
.loan-search-row-name { font-size: 14px; font-weight: 600; color: var(--ink-900); }
.loan-search-row-name mark { background: rgba(177,107,58,.22); color: inherit; padding: 0 2px; border-radius: 2px; }
.loan-search-row-sub { font-size: 12px; color: var(--ink-500); margin-top: 1px; }
.loan-search-empty { padding: 10px 14px; font-size: 13px; color: var(--ink-500); }
.loan-search-link { color: var(--copper); text-decoration: none; font-weight: 600; }
```

- [ ] **Step 5: Run — expect PASS**

```
npm test -- --testPathPattern=LoanSearch --watchAll=false
```

Expected: 8/8 pass. If any timer-related test flakes, check that `jest.useFakeTimers()` is set in `beforeEach` and `await act(...)` wraps the timer advance.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/design/LoanSearch.jsx \
        frontend/src/components/design/LoanSearch.test.jsx \
        frontend/src/components/design/LoanSearch.css
git commit -m "feat(ui): LoanSearch — ⌘K typeahead with debounce, abort, recents, ARIA"
```

---

### Task 2.4: Mount `LoanSearch` into `TopBar`

**Files:**
- Modify: `frontend/src/components/design/TopBar.jsx`

- [ ] **Step 1: Mount the component**

In `TopBar.jsx`, find the `<nav className="topnav">…</nav>` block. Insert the search **between** the `<nav>` and the `<div className="top-right">`:

```jsx
      <nav className="topnav">
        <Link to="/apply" className={active === 'apply' ? 'active' : ''}>
          <Icon name="doc" size={14} /> Apply
        </Link>
        <Link to="/applications" className={active === 'applications' ? 'active' : ''}>
          <Icon name="folder" size={14} /> Applications
        </Link>
        {isAdmin && (
          <Link to="/admin" className={active === 'admin' ? 'active' : ''}>
            <Icon name="settings" size={14} /> Admin
          </Link>
        )}
      </nav>

      {/* Global typeahead — find any loan by name, app#, or external loan id. */}
      {auth.isAuthenticated && <LoanSearch />}

      <div className="top-right">
        {/* ... */}
      </div>
```

Add the import at the top of the file:

```jsx
import LoanSearch from './LoanSearch';
```

- [ ] **Step 2: Tweak `.topbar` CSS so the search can grow**

Find the topbar CSS (likely `frontend/src/styles/design-system.css` or `topbar.css`). Locate the `.topbar` selector and ensure `display: flex; align-items: center; gap: 16px;` is present. If `.topnav` has `flex-grow: 1`, set it to `flex-grow: 0` so the search gets the slack instead.

If you can't immediately find the class, leave it for now — the page will render with a narrower search; we'll tune in Phase 3.

- [ ] **Step 3: Build smoke**

```
cd frontend && CI=false npm run build 2>&1 | tail -5
```

Expected: builds clean.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/design/TopBar.jsx
git commit -m "feat(topbar): mount LoanSearch typeahead between nav and account menu"
```

---

### Task 2.5: Push to recent-loans cache on loan-page load

**Files:**
- Modify: `frontend/src/pages/LoanDashboardPage.js`
- Modify: `frontend/src/pages/ApplicationDetails.js`

- [ ] **Step 1: Add the push in `LoanDashboardPage.js`**

Find the existing `load` callback (around line 128). Inside the `try { … setData(payload) … }` block, immediately after `setData(payload)`:

```jsx
        // Cache this loan for the TopBar typeahead's empty state.
        try {
          pushRecentLoan({
            id: payload?.id ?? loanId,
            applicationNumber: payload?.applicationNumber,
            borrowerName: payload?.primaryBorrower
              ? `${payload.primaryBorrower.firstName || ''} ${payload.primaryBorrower.lastName || ''}`.trim()
              : null,
          });
        } catch { /* never block the page on cache write */ }
```

Add the import at the top:

```jsx
import { pushRecentLoan } from '../utils/recentLoans';
```

- [ ] **Step 2: Same idea in `ApplicationDetails.js`**

Find the existing fetch (around line 25–30 where it currently does `toast.error('Failed to load application details')` on failure). After the successful set:

```jsx
        try {
          pushRecentLoan({
            id: data?.id,
            applicationNumber: data?.applicationNumber,
            borrowerName: data?.borrowers?.[0]
              ? `${data.borrowers[0].firstName || ''} ${data.borrowers[0].lastName || ''}`.trim()
              : null,
          });
        } catch {}
```

Add the import:

```jsx
import { pushRecentLoan } from '../utils/recentLoans';
```

- [ ] **Step 3: Build smoke**

```
cd frontend && CI=false npm run build 2>&1 | tail -5
```

Expected: builds clean.

- [ ] **Step 4: Commit + deploy frontend**

```bash
git add frontend/src/pages/LoanDashboardPage.js frontend/src/pages/ApplicationDetails.js
git commit -m "feat(recents): push opened loans into the typeahead's recent cache"
./deploy.sh --frontend-only
```

- [ ] **Step 5: Manual smoke on prod**

Open `https://app.msfgco.com`, focus the new search box, type 3 letters of a borrower name — confirm the dropdown shows results, ↑↓ navigates, Enter goes to the dashboard. Press `⌘K` from anywhere — confirm focus jumps to the input. Open 2–3 loans, refresh, focus the empty input — confirm "Recently opened" lists them.

Phase 2 done.

---

# Phase 3 — Frontend: replace `ApplicationList.js` with the Hybrid pipeline

This is the big one. ~10 tasks. At the end of this phase the legacy card-list view is gone and `mortgageService.getApplications` calls the paged endpoint with filters.

---

### Task 3.1: `stageSlas.js` constants

**Files:**
- Create: `frontend/src/pages/loanList/stageSlas.js`

- [ ] **Step 1: Create the constants**

```js
// frontend/src/pages/loanList/stageSlas.js

/**
 * Per-status SLA thresholds (in days). The pipeline row paints "day N" copper
 * once it exceeds `warn` and adds a danger marker past `alarm`. v1 are
 * constants; move to a config table only if real usage demands per-loan-type
 * tuning. Keys must match LoanStatus.java in the backend.
 */
export const STAGE_SLAS = {
  REGISTERED:        { warn: 5,  alarm: 10 },
  APPLICATION:       { warn: 7,  alarm: 14 },
  DISCLOSURES_SENT:  { warn: 3,  alarm: 7 },
  DISCLOSURES_SIGNED:{ warn: 5,  alarm: 10 },
  UNDERWRITING:      { warn: 7,  alarm: 14 },
  APPROVED:          { warn: 5,  alarm: 10 },
  APPRAISAL:         { warn: 10, alarm: 21 },
  INSURANCE:         { warn: 7,  alarm: 14 },
  CTC:               { warn: 3,  alarm: 7 },
  DOCS_OUT:          { warn: 3,  alarm: 7 },
  FUNDED:            { warn: 99, alarm: 999 }, // terminal — no warn
  DISPOSITIONED:     { warn: 99, alarm: 999 },
};

/**
 * Tone for the "day N" sublabel.
 * @param {string} status
 * @param {number} days
 * @returns {'ok'|'warn'|'alarm'}
 */
export function stageTone(status, days) {
  const sla = STAGE_SLAS[status] || { warn: 7, alarm: 14 };
  if (days >= sla.alarm) return 'alarm';
  if (days >= sla.warn) return 'warn';
  return 'ok';
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/loanList/stageSlas.js
git commit -m "feat(pipeline): per-status stage-age SLA constants"
```

---

### Task 3.2: `useFilterUrlState` hook

**Files:**
- Create: `frontend/src/pages/loanList/useFilterUrlState.js`
- Create: `frontend/src/pages/loanList/useFilterUrlState.test.js`

- [ ] **Step 1: Write the failing test**

```js
// frontend/src/pages/loanList/useFilterUrlState.test.js
import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { useFilterUrlState, DEFAULT_FILTERS } from './useFilterUrlState';

function wrap({ children, initialEntries }) {
  return (
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="*" element={children} />
      </Routes>
    </MemoryRouter>
  );
}

function renderWithUrl(url) {
  return renderHook(() => useFilterUrlState(), {
    wrapper: ({ children }) => wrap({ children, initialEntries: [url] }),
  });
}

describe('useFilterUrlState', () => {
  test('returns defaults when URL has no params', () => {
    const { result } = renderWithUrl('/applications');
    expect(result.current.filters).toMatchObject(DEFAULT_FILTERS);
    expect(result.current.page).toBe(0);
    expect(result.current.size).toBe(25);
    expect(result.current.sort).toEqual({ field: 'createdDate', dir: 'desc' });
  });

  test('parses comma-separated status', () => {
    const { result } = renderWithUrl('/applications?status=UNDERWRITING,CTC');
    expect(result.current.filters.statuses).toEqual(['UNDERWRITING', 'CTC']);
  });

  test('parses numeric filters', () => {
    const { result } = renderWithUrl('/applications?conditionsGt=2&amountMin=300000&amountMax=900000');
    expect(result.current.filters.conditionsGt).toBe(2);
    expect(result.current.filters.amountMin).toBe(300000);
    expect(result.current.filters.amountMax).toBe(900000);
  });

  test('parses sort=field,dir', () => {
    const { result } = renderWithUrl('/applications?sort=statusChangedAt,asc');
    expect(result.current.sort).toEqual({ field: 'statusChangedAt', dir: 'asc' });
  });

  test('setFilters merges into URL', () => {
    const { result } = renderWithUrl('/applications');
    act(() => result.current.setFilters({ statuses: ['CTC'] }));
    expect(result.current.filters.statuses).toEqual(['CTC']);
  });

  test('setPage updates page param and resets to that page', () => {
    const { result } = renderWithUrl('/applications');
    act(() => result.current.setPage(3));
    expect(result.current.page).toBe(3);
  });

  test('setSort changes sort, resets page to 0', () => {
    const { result } = renderWithUrl('/applications?page=4');
    act(() => result.current.setSort('loanAmount', 'asc'));
    expect(result.current.sort).toEqual({ field: 'loanAmount', dir: 'asc' });
    expect(result.current.page).toBe(0);
  });

  test('clearAll resets to defaults and page 0', () => {
    const { result } = renderWithUrl('/applications?status=UNDERWRITING&conditionsGt=2&page=3');
    act(() => result.current.clearAll());
    expect(result.current.filters).toMatchObject(DEFAULT_FILTERS);
    expect(result.current.page).toBe(0);
  });

  test('toQueryString builds a backend-friendly query string', () => {
    const { result } = renderWithUrl('/applications?status=UNDERWRITING&conditionsGt=1&sort=stageAge,desc&page=2');
    const qs = result.current.toQueryString();
    // status repeats? backend takes comma-sep — emit as comma-sep.
    expect(qs).toContain('status=UNDERWRITING');
    expect(qs).toContain('conditionsGt=1');
    expect(qs).toContain('page=2');
    expect(qs).toContain('size=25');
  });
});
```

- [ ] **Step 2: Run — expect failure**

```
cd frontend && npm test -- --testPathPattern=useFilterUrlState --watchAll=false
```

Expected: cannot find module.

- [ ] **Step 3: Implement the hook**

```js
// frontend/src/pages/loanList/useFilterUrlState.js
import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

export const DEFAULT_FILTERS = {
  statuses: [],
  assignedLoId: null,
  conditionsGt: null,
  closingFrom: null,
  closingTo: null,
  stageAgeGt: null,
  loanTypes: [],
  amountMin: null,
  amountMax: null,
};

const DEFAULT_SORT = { field: 'createdDate', dir: 'desc' };
const DEFAULT_PAGE = 0;
const DEFAULT_SIZE = 25;

function parseList(v) {
  if (!v) return [];
  return v.split(',').map((s) => s.trim()).filter(Boolean);
}

function parseInt2(v) {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function parseSort(v) {
  if (!v) return { ...DEFAULT_SORT };
  const [field, dir] = v.split(',', 2);
  return {
    field: field || DEFAULT_SORT.field,
    dir: dir === 'asc' ? 'asc' : 'desc',
  };
}

export function useFilterUrlState() {
  const [params, setParams] = useSearchParams();

  const filters = useMemo(() => ({
    statuses:      parseList(params.get('status')),
    assignedLoId:  parseInt2(params.get('lo')),
    conditionsGt:  parseInt2(params.get('conditionsGt')),
    closingFrom:   params.get('closingFrom') || null,
    closingTo:     params.get('closingTo') || null,
    stageAgeGt:    parseInt2(params.get('stageAgeGt')),
    loanTypes:     parseList(params.get('loanType')),
    amountMin:     parseInt2(params.get('amountMin')),
    amountMax:     parseInt2(params.get('amountMax')),
  }), [params]);

  const sort = useMemo(() => parseSort(params.get('sort')), [params]);
  const page = parseInt2(params.get('page')) ?? DEFAULT_PAGE;
  const size = parseInt2(params.get('size')) ?? DEFAULT_SIZE;

  // ── Setters update the URL — single source of truth. ─────────────────
  const mutateParams = useCallback((mutator) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      mutator(next);
      return next;
    }, { replace: true });
  }, [setParams]);

  const setFilters = useCallback((patch) => {
    mutateParams((n) => {
      Object.entries(patch).forEach(([k, v]) => {
        if (k === 'statuses') {
          if (v && v.length) n.set('status', v.join(',')); else n.delete('status');
        } else if (k === 'loanTypes') {
          if (v && v.length) n.set('loanType', v.join(',')); else n.delete('loanType');
        } else if (k === 'assignedLoId') {
          if (v != null) n.set('lo', String(v)); else n.delete('lo');
        } else {
          if (v != null && v !== '') n.set(k, String(v)); else n.delete(k);
        }
      });
      n.set('page', '0'); // any filter change → first page
    });
  }, [mutateParams]);

  const setSort = useCallback((field, dir) => {
    mutateParams((n) => {
      n.set('sort', `${field},${dir}`);
      n.set('page', '0');
    });
  }, [mutateParams]);

  const setPage = useCallback((p) => {
    mutateParams((n) => n.set('page', String(p)));
  }, [mutateParams]);

  const setSize = useCallback((s) => {
    mutateParams((n) => { n.set('size', String(s)); n.set('page', '0'); });
  }, [mutateParams]);

  const clearAll = useCallback(() => {
    mutateParams((n) => {
      ['status', 'lo', 'conditionsGt', 'closingFrom', 'closingTo',
       'stageAgeGt', 'loanType', 'amountMin', 'amountMax', 'sort']
        .forEach((k) => n.delete(k));
      n.set('page', '0');
    });
  }, [mutateParams]);

  /** Build the query string the backend list endpoint expects. */
  const toQueryString = useCallback(() => {
    const qp = new URLSearchParams();
    if (filters.statuses.length) qp.set('status', filters.statuses.join(','));
    if (filters.assignedLoId != null) qp.set('lo', String(filters.assignedLoId));
    if (filters.conditionsGt != null) qp.set('conditionsGt', String(filters.conditionsGt));
    if (filters.closingFrom) qp.set('closingFrom', filters.closingFrom);
    if (filters.closingTo) qp.set('closingTo', filters.closingTo);
    if (filters.stageAgeGt != null) qp.set('stageAgeGt', String(filters.stageAgeGt));
    if (filters.loanTypes.length) qp.set('loanType', filters.loanTypes.join(','));
    if (filters.amountMin != null) qp.set('amountMin', String(filters.amountMin));
    if (filters.amountMax != null) qp.set('amountMax', String(filters.amountMax));
    qp.set('sort', `${sort.field},${sort.dir}`);
    qp.set('page', String(page));
    qp.set('size', String(size));
    return qp.toString();
  }, [filters, sort, page, size]);

  const isAnyFilterActive = useMemo(() => (
    filters.statuses.length > 0 ||
    filters.assignedLoId != null ||
    filters.conditionsGt != null ||
    filters.closingFrom != null ||
    filters.closingTo != null ||
    filters.stageAgeGt != null ||
    filters.loanTypes.length > 0 ||
    filters.amountMin != null ||
    filters.amountMax != null
  ), [filters]);

  return {
    filters, sort, page, size,
    setFilters, setSort, setPage, setSize, clearAll,
    toQueryString, isAnyFilterActive,
  };
}
```

- [ ] **Step 4: Run — expect PASS**

```
npm test -- --testPathPattern=useFilterUrlState --watchAll=false
```

Expected: 9/9 pass.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/loanList/useFilterUrlState.js \
        frontend/src/pages/loanList/useFilterUrlState.test.js
git commit -m "feat(pipeline): useFilterUrlState — URL is the source of truth for filter state"
```

---

### Task 3.3: `mortgageService.getApplications` — take filter params

**Files:**
- Modify: `frontend/src/services/mortgageService.js`

- [ ] **Step 1: Rewrite the method**

Replace the temporary `/all` shim from Task 1.8 with a real paged client:

```js
  /**
   * Paged loan list backing the pipeline page. Accepts a backend-ready
   * query string (see useFilterUrlState.toQueryString()).
   *
   * @param {string} [queryString]
   * @returns {Promise<{ content: any[], totalElements: number, totalPages: number, page: number, size: number }>}
   */
  getApplications: async (queryString = '') => {
    const url = queryString
      ? `/loan-applications?${queryString}`
      : '/loan-applications';
    const { data } = await apiClient.get(url);
    // Defensive: if a caller still expects an array (legacy callers during
    // the cutover window), return content[]. After Phase 3 this branch goes.
    if (Array.isArray(data)) return { content: data, totalElements: data.length, totalPages: 1, page: 0, size: data.length };
    return data;
  },
```

- [ ] **Step 2: Build smoke**

```
cd frontend && CI=false npm run build 2>&1 | tail -5
```

Expected: builds clean. The old `ApplicationList.js` still calls `getApplications()` with no args, gets a `{ content: [...] }` shape back, and breaks — that's expected because we're about to rewrite it in 3.7.

- [ ] **Step 3: Commit (do not deploy yet — frontend is broken until 3.7)**

```bash
git add frontend/src/services/mortgageService.js
git commit -m "feat(service): getApplications takes a backend query string (paged shape)"
```

---

### Task 3.4: `PipelineRow.jsx`

**Files:**
- Create: `frontend/src/pages/loanList/PipelineRow.jsx`
- Create: `frontend/src/pages/loanList/PipelineRow.test.jsx`

- [ ] **Step 1: Write failing test**

```jsx
// frontend/src/pages/loanList/PipelineRow.test.jsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PipelineRow from './PipelineRow';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const row = {
  id: 42,
  applicationNumber: 'APP-042',
  status: 'UNDERWRITING',
  borrowerName: 'Fortney, Matthew',
  city: 'Lehi', state: 'UT',
  outstandingConditions: 4,
  loanAmount: 485000, propertyValue: 620000, ltvPct: 78.2,
  estClosingDate: '2026-06-12',
  assignedLoName: 'Zink',
  statusChangedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
  createdDate: new Date(Date.now() - 12 * 86400000).toISOString(),
};

beforeEach(() => { mockNavigate.mockReset(); });

describe('PipelineRow', () => {
  test('renders borrower name + city + app number', () => {
    render(<MemoryRouter><table><tbody><PipelineRow row={row} /></tbody></table></MemoryRouter>);
    expect(screen.getByText('Fortney, Matthew')).toBeInTheDocument();
    expect(screen.getByText(/Lehi, UT/)).toBeInTheDocument();
    expect(screen.getByText(/#APP-042/)).toBeInTheDocument();
  });

  test('renders status pill with day count', () => {
    render(<MemoryRouter><table><tbody><PipelineRow row={row} /></tbody></table></MemoryRouter>);
    expect(screen.getByText('UNDERWRITING')).toBeInTheDocument();
    expect(screen.getByText(/day 3/)).toBeInTheDocument();
  });

  test('shows outstanding count when > 0', () => {
    render(<MemoryRouter><table><tbody><PipelineRow row={row} /></tbody></table></MemoryRouter>);
    expect(screen.getByText('4')).toBeInTheDocument();
  });

  test('renders amount and LTV', () => {
    render(<MemoryRouter><table><tbody><PipelineRow row={row} /></tbody></table></MemoryRouter>);
    expect(screen.getByText(/\$485K/)).toBeInTheDocument();
    expect(screen.getByText(/78\.2%/)).toBeInTheDocument();
  });

  test('row click navigates to loan dashboard', () => {
    render(<MemoryRouter><table><tbody><PipelineRow row={row} /></tbody></table></MemoryRouter>);
    fireEvent.click(screen.getByRole('row'));
    expect(mockNavigate).toHaveBeenCalledWith('/loan/42');
  });
});
```

- [ ] **Step 2: Run — expect module-missing**

```
npm test -- --testPathPattern=PipelineRow --watchAll=false
```

- [ ] **Step 3: Implement `PipelineRow.jsx`**

```jsx
// frontend/src/pages/loanList/PipelineRow.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import Pill from '../../components/design/Pill';
import { formatMoneyShort } from '../../utils/format';
import { stageTone } from './stageSlas';

function statusTone(status) {
  if (!status) return 'muted';
  if (status === 'FUNDED' || status === 'CTC' || status === 'DOCS_OUT') return 'active';
  if (status === 'DISPOSITIONED') return 'danger';
  if (status === 'REGISTERED' || status === 'APPLICATION') return 'muted';
  return 'review';
}

function daysBetween(isoStart, end = Date.now()) {
  if (!isoStart) return null;
  const ms = end - new Date(isoStart).getTime();
  return Math.max(0, Math.floor(ms / 86400000));
}

function formatMonthDay(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
}

export default function PipelineRow({ row }) {
  const navigate = useNavigate();
  const age = daysBetween(row.statusChangedAt);
  const tone = stageTone(row.status, age ?? 0);
  const ltvHigh = row.ltvPct != null && row.ltvPct >= 80;

  return (
    <tr
      className="pipe-row"
      onClick={() => navigate(`/loan/${row.id}`)}
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/loan/${row.id}`); }}
    >
      <td className="pipe-cell pipe-cell--name">
        <div className="pipe-name">{row.borrowerName || '(no borrower)'}</div>
        <div className="pipe-name-sub">
          {[
            [row.city, row.state].filter(Boolean).join(', '),
            row.applicationNumber ? `#${row.applicationNumber}` : null,
          ].filter(Boolean).join(' · ') || ' '}
        </div>
      </td>
      <td className="pipe-cell">
        <Pill tone={statusTone(row.status)} dot>{row.status || '—'}</Pill>
        {age != null && (
          <div className={`pipe-age pipe-age--${tone}`}>day {age}</div>
        )}
      </td>
      <td className="pipe-cell pipe-cell--num">
        {row.outstandingConditions > 0
          ? <span className="pipe-cond">{row.outstandingConditions}</span>
          : <span className="pipe-cond pipe-cond--zero">0</span>}
      </td>
      <td className="pipe-cell pipe-cell--num">
        <span className="pipe-money">{formatMoneyShort(row.loanAmount)}</span>
        {' '}
        <span className={`pipe-ltv${ltvHigh ? ' pipe-ltv--high' : ''}`}>
          / {row.ltvPct != null ? `${row.ltvPct.toFixed(1)}%` : '—'}
        </span>
      </td>
      <td className="pipe-cell">{formatMonthDay(row.estClosingDate)}</td>
      <td className="pipe-cell">{row.assignedLoName || '—'}</td>
    </tr>
  );
}
```

- [ ] **Step 4: Run — expect PASS**

```
npm test -- --testPathPattern=PipelineRow --watchAll=false
```

Expected: 5/5 pass.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/loanList/PipelineRow.jsx \
        frontend/src/pages/loanList/PipelineRow.test.jsx
git commit -m "feat(pipeline): PipelineRow — borrower+property, status+age, $ /LTV, close, LO"
```

---

### Task 3.5: `PipelineTable.jsx` (header + sort)

**Files:**
- Create: `frontend/src/pages/loanList/PipelineTable.jsx`
- Create: `frontend/src/pages/loanList/PipelineTable.test.jsx`

- [ ] **Step 1: Write failing test**

```jsx
// frontend/src/pages/loanList/PipelineTable.test.jsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PipelineTable from './PipelineTable';

const rows = [
  { id: 1, applicationNumber: 'APP-001', status: 'UNDERWRITING', borrowerName: 'A One',
    city: 'X', state: 'X', outstandingConditions: 0, loanAmount: 100000, propertyValue: 200000,
    ltvPct: 50, estClosingDate: null, assignedLoName: 'Z',
    statusChangedAt: new Date().toISOString(), createdDate: new Date().toISOString() },
];

test('renders the column headers', () => {
  render(<MemoryRouter><PipelineTable rows={rows} sort={{ field: 'createdDate', dir: 'desc' }} onSort={() => {}} /></MemoryRouter>);
  expect(screen.getByText(/Borrower/i)).toBeInTheDocument();
  expect(screen.getByText('Status')).toBeInTheDocument();
  expect(screen.getByText(/Cond/i)).toBeInTheDocument();
  expect(screen.getByText(/Amount/i)).toBeInTheDocument();
  expect(screen.getByText(/Close/i)).toBeInTheDocument();
  expect(screen.getByText('LO')).toBeInTheDocument();
});

test('renders each row', () => {
  render(<MemoryRouter><PipelineTable rows={rows} sort={{ field: 'createdDate', dir: 'desc' }} onSort={() => {}} /></MemoryRouter>);
  expect(screen.getByText('A One')).toBeInTheDocument();
});

test('clicking a sortable header calls onSort', () => {
  const onSort = jest.fn();
  render(<MemoryRouter><PipelineTable rows={rows} sort={{ field: 'createdDate', dir: 'desc' }} onSort={onSort} /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: /amount/i }));
  expect(onSort).toHaveBeenCalledWith('loanAmount', 'desc');
});

test('clicking the current sort column toggles direction', () => {
  const onSort = jest.fn();
  render(<MemoryRouter><PipelineTable rows={rows} sort={{ field: 'loanAmount', dir: 'desc' }} onSort={onSort} /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: /amount/i }));
  expect(onSort).toHaveBeenCalledWith('loanAmount', 'asc');
});

test('shows empty message when rows is []', () => {
  render(<MemoryRouter><PipelineTable rows={[]} sort={{ field: 'createdDate', dir: 'desc' }} onSort={() => {}} /></MemoryRouter>);
  expect(screen.getByText(/no loans match/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run — expect failure**

```
npm test -- --testPathPattern=PipelineTable --watchAll=false
```

- [ ] **Step 3: Implement `PipelineTable.jsx`**

```jsx
// frontend/src/pages/loanList/PipelineTable.jsx
import React from 'react';
import PipelineRow from './PipelineRow';

const COLUMNS = [
  { id: 'borrower',     label: 'Borrower / Property',   sortable: false },
  { id: 'status',       label: 'Status',                sortable: true, field: 'statusChangedAt' },
  { id: 'conditions',   label: 'Cond.',                 sortable: false },
  { id: 'amount',       label: 'Amount / LTV',          sortable: true, field: 'loanAmount' },
  { id: 'close',        label: 'Close',                 sortable: false },
  { id: 'lo',           label: 'LO',                    sortable: false },
];

function SortHeader({ col, sort, onSort }) {
  const isActive = sort.field === col.field;
  const next = isActive && sort.dir === 'desc' ? 'asc' : 'desc';
  return (
    <th>
      <button
        type="button"
        className={`pipe-th-sort${isActive ? ' is-active' : ''}`}
        onClick={() => onSort(col.field, next)}
      >
        {col.label}
        <span className="pipe-th-arrow">{isActive ? (sort.dir === 'asc' ? '▲' : '▼') : ''}</span>
      </button>
    </th>
  );
}

export default function PipelineTable({ rows, sort, onSort }) {
  if (!rows || rows.length === 0) {
    return (
      <div className="pipe-empty">
        <p>No loans match your filters.</p>
      </div>
    );
  }
  return (
    <table className="pipe-table">
      <thead>
        <tr>
          {COLUMNS.map((c) => c.sortable
            ? <SortHeader key={c.id} col={c} sort={sort} onSort={onSort} />
            : <th key={c.id}>{c.label}</th>)}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => <PipelineRow key={r.id} row={r} />)}
      </tbody>
    </table>
  );
}
```

- [ ] **Step 4: Run — expect PASS**

```
npm test -- --testPathPattern=PipelineTable --watchAll=false
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/loanList/PipelineTable.jsx \
        frontend/src/pages/loanList/PipelineTable.test.jsx
git commit -m "feat(pipeline): PipelineTable with sortable column headers"
```

---

### Task 3.6: `FilterChips.jsx`

**Files:**
- Create: `frontend/src/pages/loanList/FilterChips.jsx`
- Create: `frontend/src/pages/loanList/FilterChips.test.jsx`

For v1 keep the chip popovers minimal — a native `<select multiple>` for status / loan type, a date pair for closing window, a number input for stageAgeGt and conditionsGt. Looks plain; functional. We can prettify in a follow-up.

- [ ] **Step 1: Write failing test**

```jsx
// frontend/src/pages/loanList/FilterChips.test.jsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import FilterChips from './FilterChips';
import { DEFAULT_FILTERS } from './useFilterUrlState';

test('Clear all is hidden when no filters active', () => {
  render(<FilterChips filters={DEFAULT_FILTERS} resultCount={42} onChange={() => {}} onClear={() => {}} />);
  expect(screen.queryByRole('button', { name: /clear all/i })).toBeNull();
});

test('Clear all visible when any filter active', () => {
  render(
    <FilterChips
      filters={{ ...DEFAULT_FILTERS, statuses: ['UNDERWRITING'] }}
      resultCount={3}
      onChange={() => {}} onClear={() => {}}
    />
  );
  expect(screen.getByRole('button', { name: /clear all/i })).toBeInTheDocument();
});

test('toggling conditions-checkbox calls onChange with conditionsGt: 0', () => {
  const onChange = jest.fn();
  render(
    <FilterChips filters={DEFAULT_FILTERS} resultCount={0} onChange={onChange} onClear={() => {}} />
  );
  fireEvent.click(screen.getByLabelText(/has outstanding conditions/i));
  expect(onChange).toHaveBeenCalledWith({ conditionsGt: 0 });
});

test('Clear button calls onClear', () => {
  const onClear = jest.fn();
  render(
    <FilterChips
      filters={{ ...DEFAULT_FILTERS, statuses: ['UNDERWRITING'] }}
      resultCount={0}
      onChange={() => {}} onClear={onClear}
    />
  );
  fireEvent.click(screen.getByRole('button', { name: /clear all/i }));
  expect(onClear).toHaveBeenCalled();
});

test('result count rendered', () => {
  render(<FilterChips filters={DEFAULT_FILTERS} resultCount={42} onChange={() => {}} onClear={() => {}} />);
  expect(screen.getByText('(42 results)')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run — expect failure**

```
npm test -- --testPathPattern=FilterChips --watchAll=false
```

- [ ] **Step 3: Implement `FilterChips.jsx`**

```jsx
// frontend/src/pages/loanList/FilterChips.jsx
import React from 'react';

const STATUSES = [
  'REGISTERED','APPLICATION','DISCLOSURES_SENT','DISCLOSURES_SIGNED',
  'UNDERWRITING','APPROVED','APPRAISAL','INSURANCE',
  'CTC','DOCS_OUT','FUNDED','DISPOSITIONED',
];
const LOAN_TYPES = ['Conventional','FHA','VA','USDA','Jumbo'];

function multiFromSelect(e) {
  return Array.from(e.target.selectedOptions).map((o) => o.value);
}

export default function FilterChips({ filters, resultCount, onChange, onClear }) {
  const anyActive = (
    filters.statuses.length > 0 ||
    filters.assignedLoId != null ||
    filters.conditionsGt != null ||
    filters.closingFrom != null ||
    filters.closingTo != null ||
    filters.stageAgeGt != null ||
    filters.loanTypes.length > 0 ||
    filters.amountMin != null ||
    filters.amountMax != null
  );

  return (
    <div className="pipe-chips">
      <label className="pipe-chip">
        <span>Status</span>
        <select multiple size={1} value={filters.statuses}
                onChange={(e) => onChange({ statuses: multiFromSelect(e) })}>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </label>

      <label className="pipe-chip">
        <span>Loan type</span>
        <select multiple size={1} value={filters.loanTypes}
                onChange={(e) => onChange({ loanTypes: multiFromSelect(e) })}>
          {LOAN_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </label>

      <label className="pipe-chip">
        <input
          type="checkbox"
          checked={filters.conditionsGt != null}
          onChange={(e) => onChange({ conditionsGt: e.target.checked ? 0 : null })}
        />
        <span>Has outstanding conditions</span>
      </label>

      <label className="pipe-chip">
        <span>Closing from</span>
        <input type="date" value={filters.closingFrom || ''}
               onChange={(e) => onChange({ closingFrom: e.target.value || null })} />
      </label>

      <label className="pipe-chip">
        <span>to</span>
        <input type="date" value={filters.closingTo || ''}
               onChange={(e) => onChange({ closingTo: e.target.value || null })} />
      </label>

      <label className="pipe-chip">
        <span>Stage age &gt;</span>
        <input type="number" min={0} style={{ width: 64 }} value={filters.stageAgeGt ?? ''}
               onChange={(e) => onChange({ stageAgeGt: e.target.value === '' ? null : Number(e.target.value) })} />
        <span>days</span>
      </label>

      <label className="pipe-chip">
        <span>Amount</span>
        <input type="number" placeholder="min" style={{ width: 96 }} value={filters.amountMin ?? ''}
               onChange={(e) => onChange({ amountMin: e.target.value === '' ? null : Number(e.target.value) })} />
        <span>–</span>
        <input type="number" placeholder="max" style={{ width: 96 }} value={filters.amountMax ?? ''}
               onChange={(e) => onChange({ amountMax: e.target.value === '' ? null : Number(e.target.value) })} />
      </label>

      {anyActive && (
        <button type="button" className="btn btn-sm" onClick={onClear}>Clear all</button>
      )}
      <span className="pipe-chips-count">({resultCount} results)</span>
    </div>
  );
}
```

- [ ] **Step 4: Run — expect PASS**

```
npm test -- --testPathPattern=FilterChips --watchAll=false
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/loanList/FilterChips.jsx \
        frontend/src/pages/loanList/FilterChips.test.jsx
git commit -m "feat(pipeline): FilterChips — status, loan type, conditions, closing, stage age, amount"
```

---

### Task 3.7: `Pager.jsx`

**Files:**
- Create: `frontend/src/pages/loanList/Pager.jsx`

(Small; no test of its own — covered by integration in 3.8.)

- [ ] **Step 1: Create**

```jsx
// frontend/src/pages/loanList/Pager.jsx
import React from 'react';

const SIZE_OPTIONS = [10, 25, 50, 100];

export default function Pager({ page, size, totalElements, totalPages, onPage, onSize }) {
  const first = totalElements === 0 ? 0 : page * size + 1;
  const last  = Math.min((page + 1) * size, totalElements);
  return (
    <div className="pipe-pager">
      <button type="button" disabled={page === 0} onClick={() => onPage(page - 1)} className="btn btn-sm">◀</button>
      <span className="pipe-pager-info">Page {page + 1} of {Math.max(totalPages, 1)}</span>
      <button type="button" disabled={page + 1 >= totalPages} onClick={() => onPage(page + 1)} className="btn btn-sm">▶</button>
      <select value={size} onChange={(e) => onSize(Number(e.target.value))} className="pipe-pager-size">
        {SIZE_OPTIONS.map((s) => <option key={s} value={s}>{s} per page</option>)}
      </select>
      <span className="pipe-pager-info">Showing {first}–{last} of {totalElements}</span>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/loanList/Pager.jsx
git commit -m "feat(pipeline): Pager component"
```

---

### Task 3.8: Rewrite `ApplicationList.js`

**Files:**
- Modify (rewrite): `frontend/src/pages/ApplicationList.js`
- Modify: `frontend/src/pages/ApplicationList.design.css` (or replace)

- [ ] **Step 1: Rewrite `ApplicationList.js`**

```jsx
// frontend/src/pages/ApplicationList.js
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

import mortgageService from '../services/mortgageService';
import Icon from '../components/design/Icon';
import Button from '../components/design/Button';
import Card from '../components/design/Card';

import PipelineTable from './loanList/PipelineTable';
import FilterChips from './loanList/FilterChips';
import Pager from './loanList/Pager';
import { useFilterUrlState } from './loanList/useFilterUrlState';

import { formatMoneyShort } from '../utils/format';
import './ApplicationList.design.css';

/**
 * Pipeline — the admin/LO landing surface for loans in flight. Driven by
 * URL params so any view is a bookmark. Replaces the legacy in-memory
 * card-list. Backed by GET /api/loan-applications (paged) and the global
 * TopBar typeahead (separate endpoint).
 */
export default function ApplicationList() {
  const navigate = useNavigate();
  const {
    filters, sort, page, size,
    setFilters, setSort, setPage, setSize, clearAll,
    toQueryString,
  } = useFilterUrlState();

  const [data, setData] = useState({ content: [], totalElements: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const result = await mortgageService.getApplications(toQueryString());
      setData(result);
    } catch (err) {
      toast.error('Failed to load applications');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [toQueryString]);

  useEffect(() => { fetch(); }, [fetch]);

  // Lightweight stat cards over the current page only. (At 1K–5K loans these
  // are good-enough approximations — full-pipeline rollups would need a
  // separate endpoint and aren't worth it for v1.)
  const totalPipeline = data.content.reduce((s, r) => s + (Number(r.loanAmount) || 0), 0);
  const needsAction = data.content.filter((r) => (r.outstandingConditions || 0) > 0).length;
  const kpis = [
    { label: 'Loans on page',     value: data.content.length,                       sub: `of ${data.totalElements} total` },
    { label: 'Total amount (page)', value: formatMoneyShort(totalPipeline),         sub: '' },
    { label: 'Needs action (page)', value: needsAction,                              sub: 'outstanding conditions > 0' },
  ];

  return (
    <div className="page apps-page">
      <div className="apps-page-header">
        <h1 className="apps-page-title">Pipeline</h1>
        <Button variant="primary" onClick={() => navigate('/apply')}>
          <Icon name="plus" size={14} /> New application
        </Button>
      </div>

      <div className="apps-kpis">
        {kpis.map((k) => (
          <Card key={k.label} pad>
            <div className="apps-kpi-label">{k.label}</div>
            <div className="apps-kpi-value">{k.value}</div>
            {k.sub && <div className="apps-kpi-sub">{k.sub}</div>}
          </Card>
        ))}
      </div>

      <FilterChips
        filters={filters}
        resultCount={data.totalElements}
        onChange={setFilters}
        onClear={clearAll}
      />

      {loading ? (
        <Card pad><div className="muted">Loading loans…</div></Card>
      ) : (
        <>
          <PipelineTable
            rows={data.content}
            sort={sort}
            onSort={setSort}
          />
          <Pager
            page={page} size={size}
            totalElements={data.totalElements}
            totalPages={data.totalPages}
            onPage={setPage}
            onSize={setSize}
          />
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Rewrite the CSS**

Replace `frontend/src/pages/ApplicationList.design.css` with:

```css
.apps-page { padding: 24px; }

.apps-page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; }
.apps-page-title  { font-size: 22px; font-weight: 700; color: var(--ink-900); margin: 0; }

.apps-kpis { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 18px; }
.apps-kpi-label { font-size: 11px; text-transform: uppercase; letter-spacing: .08em; color: var(--ink-500); }
.apps-kpi-value { font-size: 22px; font-weight: 700; color: var(--ink-900); margin-top: 4px; }
.apps-kpi-sub   { font-size: 12px; color: var(--ink-500); margin-top: 2px; }

/* ─── Filter chips ─────────────────────────────────────────────────────── */
.pipe-chips {
  display: flex; flex-wrap: wrap; gap: 10px; align-items: center;
  padding: 10px 12px; background: var(--bg-secondary, #f6f4ee);
  border-radius: 8px; margin-bottom: 14px; font-size: 12.5px;
}
.pipe-chip {
  display: inline-flex; align-items: center; gap: 6px;
  background: #fff; border: 1px solid var(--ink-line); border-radius: 999px;
  padding: 4px 10px; color: var(--ink-700, var(--ink-900));
}
.pipe-chip select, .pipe-chip input { border: 0; background: transparent; font: inherit; padding: 0 4px; }
.pipe-chips-count { color: var(--ink-500); font-size: 12px; margin-left: auto; }

/* ─── Table ────────────────────────────────────────────────────────────── */
.pipe-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.pipe-table th {
  text-align: left; padding: 8px 12px; background: #f0ece0;
  color: var(--ink-500); font-size: 11px; text-transform: uppercase; letter-spacing: .05em;
  border-bottom: 1px solid var(--ink-line); font-weight: 600;
}
.pipe-th-sort {
  background: transparent; border: 0; padding: 0; color: inherit; font: inherit;
  text-transform: inherit; letter-spacing: inherit; cursor: pointer;
  display: inline-flex; align-items: center; gap: 6px;
}
.pipe-th-sort.is-active { color: var(--copper); }
.pipe-th-arrow { font-size: 9px; }

.pipe-row { cursor: pointer; transition: background .1s; }
.pipe-row:hover { background: #fafaf5; }
.pipe-row:focus { outline: 2px solid var(--copper); outline-offset: -2px; }

.pipe-cell { padding: 10px 12px; border-bottom: 1px solid #f0ece0; vertical-align: top; }
.pipe-cell--num { font-variant-numeric: tabular-nums; }
.pipe-cell--name { min-width: 220px; }
.pipe-name { font-weight: 600; color: var(--ink-900); }
.pipe-name-sub { font-size: 11px; color: var(--ink-500); margin-top: 2px; }

.pipe-age { font-size: 11px; margin-top: 4px; color: var(--ink-500); }
.pipe-age--warn  { color: var(--copper); font-weight: 600; }
.pipe-age--alarm { color: #b54040; font-weight: 700; }

.pipe-cond { font-weight: 700; color: var(--copper); }
.pipe-cond--zero { color: var(--ink-500); font-weight: 400; }

.pipe-money { font-weight: 600; color: var(--ink-900); }
.pipe-ltv { color: var(--ink-500); font-size: 12px; }
.pipe-ltv--high { color: var(--copper); font-weight: 600; }

.pipe-empty {
  padding: 32px; text-align: center; color: var(--ink-500);
  background: #fff; border: 1px dashed var(--ink-line); border-radius: 8px;
}

/* ─── Pager ────────────────────────────────────────────────────────────── */
.pipe-pager {
  display: flex; align-items: center; gap: 12px; padding: 12px 4px;
  font-size: 12.5px; color: var(--ink-500);
}
.pipe-pager-info { font-variant-numeric: tabular-nums; }
.pipe-pager-size { padding: 4px 8px; border: 1px solid var(--ink-line); border-radius: 6px; background: #fff; font-size: 12px; }
```

- [ ] **Step 3: Build + run all frontend tests**

```
cd frontend && CI=false npm run build 2>&1 | tail -5
npm test -- --watchAll=false 2>&1 | tail -20
```

Expected: build clean, no test regressions. If the old tests for the removed card components fail, delete those test files — those components are gone.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/ApplicationList.js frontend/src/pages/ApplicationList.design.css
git commit -m "feat(pipeline): replace ApplicationList with Hybrid table + filter chips + URL state"
```

- [ ] **Step 5: Deploy frontend**

```
./deploy.sh --frontend-only
```

Manual check at `https://app.msfgco.com/applications`:
- Table renders, ~25 rows visible.
- Click a status header → sort toggles, URL updates with `?sort=statusChangedAt,...`.
- Click a row → navigates to `/loan/:id`.
- Toggle "Has outstanding conditions" → result count updates, URL updates.
- Reload the URL → state restored.
- Browse-all link from TopBar typeahead lands you here with `?q=` in URL (ignored for now — that's a Phase-3 follow-up if you want it to prefilter).

---

### Task 3.9: Delete the deprecated `/all` route + cleanup

**Files:**
- Modify: `backend/src/main/java/com/msfg/mortgage/controller/LoanApplicationController.java`

- [ ] **Step 1: Remove the route**

Delete the `@GetMapping("/all")` block added in Task 1.7 — no callers remain.

- [ ] **Step 2: Verify the backend suite still passes**

```
cd backend && mvn test
```

- [ ] **Step 3: Commit + deploy**

```bash
git add backend/src/main/java/com/msfg/mortgage/controller/LoanApplicationController.java
git commit -m "chore(api): remove deprecated /loan-applications/all firehose"
./deploy.sh --backend-only
```

Phase 3 complete.

---

# Phase 4 — Stretch / polish (only if needed)

Skip unless something surfaced during Phase 3 testing.

---

### Task 4.1: Verify `status_changed_at` backfill for historical loans

If any loans show `day 0` immediately after deploy (because backfill defaulted to `CURRENT_TIMESTAMP`), run a one-off SQL to refresh from history:

- [ ] **Step 1: Connect to prod RDS and run**

```sql
UPDATE loan_applications la
   SET status_changed_at = COALESCE(
     (SELECT MAX(transitioned_at) FROM loan_status_history WHERE loan_application_id = la.id),
     la.created_date
   )
 WHERE la.status_changed_at::date = CURRENT_DATE;  -- only touch backfill-defaulted rows
```

Expected: a small UPDATE count matching how many loans backfilled to "today."

- [ ] **Step 2: Drop a one-line note in `.claude/memory/` documenting that the V24 backfill is good for new prod databases but a refresh was needed for the existing dataset**

```bash
# (No commit needed for the SQL itself — it's an operational task)
```

### Task 4.2: Honor `?q=` from the TopBar "Browse all" link

The typeahead's "No matches → Browse all loans" link passes `?q=…` to `/applications`. The current pipeline ignores it. Either drop the link (decide it's a dead-end at no-match) or add `q` as a fuzzy borrower-name filter in `useFilterUrlState` + extend the backend list endpoint to accept it.

Decide based on real usage signal post-Phase-3. Not implemented here.

---

## Self-review notes

- **Spec coverage:** Each spec section (§1–§4) maps to tasks above. §1 → 1.1–1.7. §2 → 3.1–3.8. §3 → 2.1–2.5. §4 testing → embedded in each task; rollout → 1.8 / 2.5 / 3.8 / 3.9. Out-of-scope items (saved views, bulk actions, etc.) are explicitly not tasked.
- **Placeholder scan:** No TBDs; every step has the actual code or command. The two H2-vs-Postgres caveats (LATERAL, INTERVAL syntax) are called out inline as decision points the engineer can verify by running the test.
- **Type / name consistency:** `LoanListRow.statusChangedAt` (Java) ↔ `statusChangedAt` field in the entity ↔ `status_changed_at` column. `LoanListFilters.statuses` (List<String>) is plural and matches the JSON param `status` (comma-sep at the HTTP layer, list inside). `stageAgeGtDays` in the DTO is `stageAgeGt` in the URL — controller does the mapping; documented in 1.7.
- **Scope check:** Single feature, one spec, one plan. Subsystems B/C/D explicitly deferred.
