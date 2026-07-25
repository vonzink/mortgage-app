# Borrower Dashboard v2 — Borrower App (Part 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Evolve the borrower's Loan Status Center (app.msfgco.com/dashboard): remove the Document History card, add a property-photo hero banner, a vesting line, contact cards (title/insurance/agents/escrow) under the loan-officer card, and a closing-costs & cash-to-close card.

**Architecture:** All changes live in `frontend/src/pages/statusCenter/`. The container (`LoanStatusCenter.js`) keeps its existing server-visibility contract — a null/absent payload section means the LO hid it, so the section renders nothing. Two new pure section components (`ContactCards`, `ClosingCostsCard`) follow the existing card patterns (`LoanOfficerCard` for contact rows, `PaymentCard`/`SnapshotCard` for money rows). The service layer needs **zero changes**: `mortgageService.getBorrowerDashboard` (`frontend/src/services/mortgageService.js:404-411`) is a pure envelope passthrough, so the new payload fields (`property.photoUrl`, `property.vesting`, `contacts`, `closingCosts`, `loanSnapshot.cashToClose`) arrive automatically once the API ships them.

**Tech Stack:** React 18 (CRA / react-scripts 5.0.1), plain CSS scoped under `.lsc-page`, Jest + @testing-library/react (via `react-scripts test`, jsdom, `src/setupTests.js` loads jest-dom).

**Branch:** `feat/borrower-dashboard-v2` (created in Task 1).

---

## Contract dependency note

This plan implements the **client side** of the pinned API contract from the design spec (`msfg-suite-web/docs/superpowers/specs/2026-07-25-borrower-dashboard-v2-design.md`, Part 1 + Part 3). Every task here is testable with **local fixtures only** — no live API needed. The payload fields consumed (exact names, all nullable):

- `property.photoUrl` (string) — short-TTL presigned GET URL for the property photo.
- `property.vesting` (string) — display-only vesting text.
- **Server-side coupling (API plan adaptation #3):** the server only builds the `property` section when `showLoanSnapshot` is on — so an LO hiding Loan Snapshot also drops the hero photo, vesting line, and address from the borrower payload. No client change needed (hero/vesting/address are already presence-gated on `property`), but don't misread a missing photo/vesting in QA as a bug when Loan Snapshot is toggled off.
- `contacts` — `[{ role, roleLabel, name, company, phone, email }]` or `null` when the LO hid the section. Roles: `TITLE_COMPANY`, `INSURANCE_AGENT`, `LISTING_AGENT`, `SELLING_AGENT`, `ESCROW_OFFICER` (server sends them in that display order; the client renders as received). `roleLabel` comes from the server ("Title", "Insurance", "Seller's Agent", "Buyer's Agent", "Escrow"). **No address fields.**
- `closingCosts` — `{ origination, services, taxesAndGov, prepaidsAndEscrow, other, totalClosingCosts, sellerCredits, otherCredits, estimatedCashToClose }` or `null` when hidden. All numbers, each null-tolerant. `estimatedCashToClose` positive = borrower brings cash; negative = cash back.
- `loanSnapshot.cashToClose` — the API wires this previously-empty slot; **the client already renders it** (`SnapshotCard.jsx:66`, "Est. cash to close" row). No frontend change needed beyond a pin-down assertion (Task 2).
- `visibility` gains `showContacts` / `showClosingCosts` — the borrower app only *reads* `visibility.showAppraisal` (`LoanStatusCenter.js:233`); the new sections are gated by their payload fields being non-null, same as every other card.

Dev-mode note (accepted degradation, per spec 1.2): the local storage driver serves authed URLs a naked CSS `background-image` can't fetch, so the photo banner only displays real images against S3-presigned URLs (prod/staging). The fallback flat-forest hero renders in dev.

## Verified file anchors (as of `main`, before Task 1)

- `frontend/src/pages/statusCenter/LoanStatusCenter.js` (257 lines): `DocumentHistory` import `:11`, render block `:212-214` (these are the ONLY two references to delete; the `UploadDropzone` block `:204-208` is ALSO gated on `documents.uploads` and must stay); hero `:154-165`; `addressLine` derivation `:129-133`; rail column `:181-195` (`StatusRail`, `LoanOfficerCard` `:185-187`, `NotificationsCard` `:188-194`); side column `:223-245` (`RateLockCard`, `KeyDatesCard`, `AppraisalCard`, `SnapshotCard`, `PaymentCard`).
- `frontend/src/pages/statusCenter/LoanStatusCenter.css` (895 lines): hero block `:85-137` (decorative `::before` `:94-102`, `.lsc-hero > * { position: relative; }` `:103`, `.lsc-sub` `:119-124`); responsive rail rules `:732-743` (`.lsc-rail-col > .lsc-card { flex: 1 1 280px; }` at `:743` already handles any new rail card) and `:765-776`. **All new CSS is appended at the END of the file** so equal-specificity rules (`.lsc-hero > *`, `.lsc-sub`) lose to the new ones by source order.
- Shared CSS classes `lsc-hrow`/`lsc-fic`/`lsc-tag`/`lsc-cnt`/`lsc-empty` are used by `TodoList.jsx`, `ClearedItems.jsx`, `DownloadsCard.jsx`, `AppraisalCard.jsx` — do **NOT** delete any CSS when removing DocumentHistory.
- `frontend/src/pages/statusCenter/LoanStatusCenter.test.js`: `FULL_DASHBOARD` fixture `:40-93` with STALE visibility keys at `:88-92` (`showSnapshot`/`showProperty` don't exist server-side); 11 existing tests.
- Do NOT touch `frontend/src/workspace/DocumentHistory.jsx` — unrelated staff audit modal.
- Test baseline verified green: `cd frontend && CI=true npx react-scripts test --watchAll=false src/pages/statusCenter` → `Test Suites: 17 passed, Tests: 87 passed`.

All test commands run from `/Users/zacharyzink/MSFG/WebProjects/mortgage-app/frontend`; all git commands from the repo root `/Users/zacharyzink/MSFG/WebProjects/mortgage-app`. The repo currently has an unrelated dirty `frontend/package-lock.json` — never `git add -A`; stage only the files each task names.

---

### Task 1: Branch + remove Document History

**Files:**
- Modify: `frontend/src/pages/statusCenter/LoanStatusCenter.js` (import `:11`, render block `:212-214`)
- Modify: `frontend/src/pages/statusCenter/LoanStatusCenter.test.js` (add regression test)
- Delete: `frontend/src/pages/statusCenter/sections/DocumentHistory.jsx`
- Delete: `frontend/src/pages/statusCenter/sections/DocumentHistory.test.jsx`

- [ ] **Step 1: Create the branch**

```bash
cd /Users/zacharyzink/MSFG/WebProjects/mortgage-app
git checkout main
git checkout -b feat/borrower-dashboard-v2
```

- [ ] **Step 2: Write the failing regression test**

In `frontend/src/pages/statusCenter/LoanStatusCenter.test.js`, add inside the `describe('LoanStatusCenter', ...)` block, right after the `'full payload: a representative element from every column renders'` test (which ends at line 219):

```js
  test('Document history card no longer renders, even with uploads present', async () => {
    mortgageService.getBorrowerDashboard.mockResolvedValue(FULL_DASHBOARD);
    renderPage();

    // Wait for the grid, then assert the removed card is gone while the other
    // two documents.uploads consumers (dropzone) and downloads still render.
    expect(await screen.findByText(/Drop your documents here/i)).toBeInTheDocument();
    expect(screen.queryByText('Document history')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Download$/i })).toBeInTheDocument();
  });
```

- [ ] **Step 3: Run it to verify it fails**

```bash
cd /Users/zacharyzink/MSFG/WebProjects/mortgage-app/frontend
CI=true npx react-scripts test --watchAll=false src/pages/statusCenter/LoanStatusCenter.test.js
```

Expected: `FAIL src/pages/statusCenter/LoanStatusCenter.test.js` — the new test fails with `expect(element).not.toBeInTheDocument()` (the "Document history" heading is found). `Tests: 1 failed, 11 passed, 12 total`.

- [ ] **Step 4: Remove the import and render block**

In `frontend/src/pages/statusCenter/LoanStatusCenter.js`, delete line 11:

```js
import DocumentHistory from './sections/DocumentHistory';
```

and delete the render block at lines 212–214 (in the `<main className="lsc-main-col">` column, between the `ClearedItems` block and the `DownloadsCard` block):

```jsx
            {payload?.documents?.uploads != null && (
              <DocumentHistory uploads={payload.documents.uploads} />
            )}
```

**Do NOT touch** the visually similar `UploadDropzone` block just above it (also gated on `payload?.documents?.uploads != null` — that one stays):

```jsx
            {payload?.documents?.uploads != null && (
              <div ref={dropzoneRef}>
                <UploadDropzone suiteLoanId={selectedId} onUploaded={refetch} />
              </div>
            )}
```

- [ ] **Step 5: Delete the component and its test**

```bash
cd /Users/zacharyzink/MSFG/WebProjects/mortgage-app
git rm frontend/src/pages/statusCenter/sections/DocumentHistory.jsx frontend/src/pages/statusCenter/sections/DocumentHistory.test.jsx
```

(Only these two. `frontend/src/workspace/DocumentHistory.jsx` is an unrelated audit modal — leave it.)

- [ ] **Step 6: Run the statusCenter suite to verify green**

```bash
cd /Users/zacharyzink/MSFG/WebProjects/mortgage-app/frontend
CI=true npx react-scripts test --watchAll=false src/pages/statusCenter
```

Expected: `Test Suites: 16 passed, 16 total` (17 minus the deleted DocumentHistory suite), `Tests: 84 passed, 84 total` (87 − 4 deleted DocumentHistory tests + 1 new regression test).

- [ ] **Step 7: Commit**

```bash
cd /Users/zacharyzink/MSFG/WebProjects/mortgage-app
git add frontend/src/pages/statusCenter/LoanStatusCenter.js frontend/src/pages/statusCenter/LoanStatusCenter.test.js
git commit -m "feat(status-center): remove Document History card

- Delete sections/DocumentHistory.jsx + test (uploads stay in payload; UploadDropzone still gated on documents.uploads)
- Shared lsc-hrow/lsc-fic/lsc-tag CSS kept (TodoList/DownloadsCard/ClearedItems use it)"
```

---

### Task 2: Re-sync the container test fixture to the real contract

**Files:**
- Modify: `frontend/src/pages/statusCenter/LoanStatusCenter.test.js` (`FULL_DASHBOARD` fixture `:40-93`, full-payload test)

The `visibility` block in `FULL_DASHBOARD` has drifted keys (`showSnapshot`, `showProperty` don't exist server-side; `showLoanSnapshot`, `showDownloads` are missing). Re-sync it to the real settings flags including the two new ones, and add the new v2 payload fields so later tasks can assert against them. This is fixture hygiene — the suite must stay green throughout (the container ignores payload fields it doesn't render yet).

- [ ] **Step 1: Update the fixture**

In `frontend/src/pages/statusCenter/LoanStatusCenter.test.js`, replace the `property` line of `FULL_DASHBOARD` (currently line 42):

```js
  property: { addressLine1: '123 Main St', city: 'Aurora', state: 'CO' },
```

with:

```js
  property: {
    addressLine1: '123 Main St', city: 'Aurora', state: 'CO',
    photoUrl: 'https://s3.example.com/prop-photo.jpg?X-Amz-Signature=abc',
    vesting: 'John Q. Public and Jane Q. Public, as joint tenants',
  },
```

Then replace the stale `visibility` block (currently lines 88–92):

```js
  visibility: {
    showMilestones: true, showConditions: true, showDocuments: true, showKeyDates: true,
    showRateLock: true, showAppraisal: true, showSnapshot: true, showPayment: true,
    showLoanOfficer: true, showNotifications: true, showProperty: true,
  },
```

with the real server flag set (spec Part 2 table + the two new flags) **plus** the two new payload sections, inserted just before `visibility`:

```js
  contacts: [
    { role: 'TITLE_COMPANY', roleLabel: 'Title', name: 'Terri Cruz', company: 'Alta Title Co.', phone: '(303) 555-0140', email: 'terri@altatitle.example.com' },
    { role: 'INSURANCE_AGENT', roleLabel: 'Insurance', name: 'Ian Shore', company: 'Acme Insurance', phone: '(303) 555-0177', email: 'ian@acmeins.example.com' },
  ],
  closingCosts: {
    origination: 3000, services: 2500, taxesAndGov: 1200, prepaidsAndEscrow: 1800, other: 400,
    totalClosingCosts: 8900, sellerCredits: 5000, otherCredits: 250, estimatedCashToClose: 25000,
  },
  visibility: {
    showMilestones: true, showConditions: true, showDocuments: true, showDownloads: true,
    showKeyDates: true, showAppraisal: true, showRateLock: true, showLoanSnapshot: true,
    showPayment: true, showClosingCosts: true, showLoanOfficer: true, showContacts: true,
    showNotifications: true,
  },
```

(The minimal `DASHBOARD` fixture at `:33-36` stays exactly as-is — it is the "no photo / no vesting / nothing extra" case used by later tasks.)

- [ ] **Step 2: Pin down the already-wired Snapshot cash-to-close row**

The fixture already carries `loanSnapshot.cashToClose: 25000` and `SnapshotCard.jsx:66` already renders it — the API side is what wires the value; the client needs no code change. Server invariant: `loanSnapshot.cashToClose` and `closingCosts.estimatedCashToClose` are the SAME DoT `cashFromToBorrower` figure (the API plan's closing-costs IT asserts equality), which is why the fixture above carries 25000 in both slots. Pin the snapshot row with an assertion so a regression is loud — scoped to the row, because once Task 7 wires ClosingCostsCard the same dollar string renders in two cards and a bare `getByText('$25,000.00')` would throw. In the `'full payload: a representative element from every column renders'` test, after the payment-total assertion (`expect(screen.getByText(/\$2,620\.00\s*\/\s*mo/)).toBeInTheDocument();`), add:

```js
    // Snapshot card renders the (newly API-wired) cash-to-close slot. Scoped to
    // the .lsc-kv row: ClosingCostsCard (Task 7) renders the same figure — the
    // server sends one DoT cashFromToBorrower value to both slots.
    const cashRow = screen.getByText('Est. cash to close').closest('.lsc-kv');
    expect(cashRow).toHaveTextContent('$25,000.00');
```

(`getByText('Est. cash to close')` stays unique — ClosingCostsCard's bottom-line label is the full string "Estimated cash to close", and `getByText` matches the whole string.)

- [ ] **Step 3: Run the container suite — must stay green**

```bash
cd /Users/zacharyzink/MSFG/WebProjects/mortgage-app/frontend
CI=true npx react-scripts test --watchAll=false src/pages/statusCenter/LoanStatusCenter.test.js
```

Expected: `PASS`, `Tests: 12 passed, 12 total`.

- [ ] **Step 4: Commit**

```bash
cd /Users/zacharyzink/MSFG/WebProjects/mortgage-app
git add frontend/src/pages/statusCenter/LoanStatusCenter.test.js
git commit -m "test(status-center): re-sync FULL_DASHBOARD fixture to real contract

- visibility: drop nonexistent showSnapshot/showProperty; add showDownloads, showLoanSnapshot, showClosingCosts, showContacts
- add v2 payload fields: property.photoUrl/vesting, contacts, closingCosts
- pin the Snapshot Est. cash to close row"
```

---

### Task 2b: Fix ClearedItems cleared-date field (pre-existing bug)

**Files:**
- Modify: `frontend/src/pages/statusCenter/sections/ClearedItems.jsx:39` (and the `cleared.map` body around it)
- Modify: `frontend/src/pages/statusCenter/sections/ClearedItems.test.jsx:8` (fixture) + first test

`ClearedItems.jsx:39` renders `c.clearedDate`, but the API's `BorrowerConditionItem` sends `clearedAt` (an ISO instant — see `BorrowerDashboardResponse.java`, `clearedAt` field). The "Cleared …" line has never rendered in production. Fix the field name and format the instant like `DownloadsCard.jsx:18-29` does (`Intl.DateTimeFormat` en-US, UTC, `month: 'short', day: 'numeric'`). Modify the existing first test rather than adding a new one (keeps suite/test counts used elsewhere in this plan unchanged).

- [ ] **Step 1: Update the test to use `clearedAt` and expect the formatted date**

In `frontend/src/pages/statusCenter/sections/ClearedItems.test.jsx`, change the `c2` fixture row (line 8):

```js
    { id: 'c2', status: 'Cleared', conditionText: 'Purchase contract — fully executed', clearedAt: '2026-06-05T14:30:00Z' },
```

and add one assertion to the existing first test (`renders cleared conditions only, with a check glyph and a count`), after the `2 done` assertion:

```js
    expect(screen.getByText('Cleared Jun 5')).toBeInTheDocument();
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd frontend && CI=true npx react-scripts test --watchAll=false src/pages/statusCenter/sections/ClearedItems.test.jsx`
Expected: FAIL — `Unable to find an element with the text: Cleared Jun 5` (component still reads `clearedDate`, which is now absent from the fixture).

- [ ] **Step 3: Fix the component**

In `frontend/src/pages/statusCenter/sections/ClearedItems.jsx`, add the formatter above the component (same pattern as `DownloadsCard.jsx:18-29`):

```js
const DATE_FMT = new Intl.DateTimeFormat('en-US', {
  timeZone: 'UTC',
  month: 'short',
  day: 'numeric',
});

function formatDate(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return DATE_FMT.format(d);
}
```

and change the `cleared.map` body from an expression arrow to a block so the formatted value is computed once (replacing the current lines 33-42):

```js
        cleared.map((c, i) => {
          const when = formatDate(c.clearedAt);
          return (
            <div className="lsc-cond" key={c.id != null ? c.id : i}>
              <span className="lsc-st lsc-st--ok" aria-hidden="true">✓</span>
              <div className="lsc-cond-tx">
                <b>{c.conditionText || 'Condition'}</b>
                {when && <span>Cleared {when}</span>}
              </div>
              <span className="lsc-tag lsc-tag--ok">Cleared</span>
            </div>
          );
        })
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd frontend && CI=true npx react-scripts test --watchAll=false src/pages/statusCenter/sections/ClearedItems.test.jsx`
Expected: PASS — all ClearedItems tests green, including the new `Cleared Jun 5` assertion.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/statusCenter/sections/ClearedItems.jsx frontend/src/pages/statusCenter/sections/ClearedItems.test.jsx
git commit -m "fix(status-center): render cleared date from clearedAt

ClearedItems read c.clearedDate but the API sends clearedAt (ISO instant);
the 'Cleared …' line never rendered. Format like DownloadsCard (UTC, MMM d)."
```

---

### Task 3: Property-photo hero banner

**Files:**
- Modify: `frontend/src/pages/statusCenter/LoanStatusCenter.js` (hero, `:154-165` pre-Task-1 numbering — one line above after Task 1 removed the import)
- Modify: `frontend/src/pages/statusCenter/LoanStatusCenter.css` (append at end, after line 895)
- Test: `frontend/src/pages/statusCenter/LoanStatusCenter.test.js`

Design: when `payload.property.photoUrl` is present, the hero renders the photo as a full-bleed background layer with a forest gradient overlay (`--forest #0E3B2C` family; gradient `linear-gradient(rgba(10,44,32,.55), rgba(10,44,32,.75))` = `--forest-deep` at .55→.75) over a `center`/`cover` photo. Absent → today's flat forest hero, unchanged. No dedicated visibility flag — no photo, no banner (server-side the whole `property` section rides the existing `showLoanSnapshot` gate; see the contract dependency note).

Implementation shape: a dedicated absolutely-positioned `.lsc-hero-photo` layer div (first child of the header) carrying `background-image: url(...)` inline, with the gradient in a CSS `::after` — NOT a combined `linear-gradient(...), url(...)` inline shorthand, because jsdom's cssstyle drops gradient values, which would make the style untestable (and React would silently lose the whole declaration in tests).

- [ ] **Step 1: Write the failing tests**

In `frontend/src/pages/statusCenter/LoanStatusCenter.test.js`, add after the `'Document history card no longer renders...'` test:

```js
  test('property.photoUrl renders the hero photo banner layer', async () => {
    mortgageService.getBorrowerDashboard.mockResolvedValue(FULL_DASHBOARD);
    const { container } = renderPage();
    await screen.findByText('In processing');

    const hero = container.querySelector('.lsc-hero');
    expect(hero.classList.contains('lsc-hero--photo')).toBe(true);
    const photo = container.querySelector('.lsc-hero-photo');
    expect(photo).not.toBeNull();
    expect(photo.getAttribute('style')).toContain('prop-photo.jpg');
    expect(photo).toHaveAttribute('aria-hidden', 'true');
  });

  test('no property.photoUrl → flat forest hero, no photo layer', async () => {
    // Default DASHBOARD fixture has no photoUrl.
    const { container } = renderPage();
    await screen.findByText(/123 Main St/);

    const hero = container.querySelector('.lsc-hero');
    expect(hero.classList.contains('lsc-hero--photo')).toBe(false);
    expect(container.querySelector('.lsc-hero-photo')).toBeNull();
  });
```

- [ ] **Step 2: Run to verify the first test fails**

```bash
cd /Users/zacharyzink/MSFG/WebProjects/mortgage-app/frontend
CI=true npx react-scripts test --watchAll=false src/pages/statusCenter/LoanStatusCenter.test.js
```

Expected: `Tests: 1 failed, 13 passed, 14 total` — the photo test fails on `expect(hero.classList.contains('lsc-hero--photo')).toBe(true)` (received false); the flat-hero test already passes.

- [ ] **Step 3: Implement the hero photo layer**

In `frontend/src/pages/statusCenter/LoanStatusCenter.js`, extend the derived-props block (pre-Task-1 `:128-133`, post-Task-1 `:127-132`; currently reads):

```js
  const selectedLoan = loans?.find((l) => String(l.id) === String(selectedId)) || null;
  const prop = payload?.property || null;
  const addressLine = prop
    ? [prop.addressLine1, [prop.city, prop.state].filter(Boolean).join(', ')]
        .filter(Boolean).join(' · ') || null
    : null;
```

to:

```js
  const selectedLoan = loans?.find((l) => String(l.id) === String(selectedId)) || null;
  const prop = payload?.property || null;
  const photoUrl = prop?.photoUrl || null;
  const addressLine = prop
    ? [prop.addressLine1, [prop.city, prop.state].filter(Boolean).join(', ')]
        .filter(Boolean).join(' · ') || null
    : null;
```

Then replace the hero opening (currently):

```jsx
      <header className="lsc-hero">
        <div className="lsc-hero-text">
```

with:

```jsx
      <header className={`lsc-hero${photoUrl ? ' lsc-hero--photo' : ''}`}>
        {photoUrl && (
          <div
            className="lsc-hero-photo"
            style={{ backgroundImage: `url("${photoUrl}")` }}
            aria-hidden="true"
          />
        )}
        <div className="lsc-hero-text">
```

(The rest of the header — eyebrow, `<h1>`, address `<p className="lsc-sub">`, status pill — is untouched. The photo div is the FIRST child so the text/pill, which are `position: relative` via `.lsc-hero > *` at CSS `:103`, paint above it by DOM order.)

- [ ] **Step 4: Append the hero-photo CSS**

Append at the very END of `frontend/src/pages/statusCenter/LoanStatusCenter.css` (after the last line, `.lsc-page .lsc-cal-empty ...` at `:895`):

```css

/* ---------- Borrower Dashboard v2: hero photo banner ---------- */
/* Appended at end of file ON PURPOSE: .lsc-hero-photo must beat the
 * equal-specificity `.lsc-hero > * { position: relative; }` (line ~103) by
 * source order. The gradient overlay lives in ::after (not an inline
 * `linear-gradient(), url()` shorthand) so jsdom can still see the url(). */
.lsc-hero--photo::before { display: none; } /* ring decoration reads as noise over a photo */
.lsc-hero-photo {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  pointer-events: none;
}
.lsc-hero-photo::after {
  content: "";
  position: absolute;
  inset: 0;
  /* forest gradient overlay for text legibility over any photo (#0A2C20 = --forest-deep) */
  background: linear-gradient(rgba(10, 44, 32, .55), rgba(10, 44, 32, .75));
}
```

- [ ] **Step 5: Run to verify pass**

```bash
cd /Users/zacharyzink/MSFG/WebProjects/mortgage-app/frontend
CI=true npx react-scripts test --watchAll=false src/pages/statusCenter/LoanStatusCenter.test.js
```

Expected: `PASS`, `Tests: 14 passed, 14 total`.

- [ ] **Step 6: Commit**

```bash
cd /Users/zacharyzink/MSFG/WebProjects/mortgage-app
git add frontend/src/pages/statusCenter/LoanStatusCenter.js frontend/src/pages/statusCenter/LoanStatusCenter.css frontend/src/pages/statusCenter/LoanStatusCenter.test.js
git commit -m "feat(status-center): property-photo hero banner

- .lsc-hero-photo absolute layer (inline url) + forest gradient ::after overlay
- lsc-hero--photo modifier suppresses the ring decoration; flat forest hero unchanged when no photoUrl"
```

---

### Task 4: Vesting line in the hero

**Files:**
- Modify: `frontend/src/pages/statusCenter/LoanStatusCenter.js` (hero text block)
- Modify: `frontend/src/pages/statusCenter/LoanStatusCenter.css` (append at end)
- Test: `frontend/src/pages/statusCenter/LoanStatusCenter.test.js`

`property.vesting` (string | null) renders under the address line as a small-caps muted variant of `.lsc-sub`. Absent → nothing.

- [ ] **Step 1: Write the failing tests**

In `frontend/src/pages/statusCenter/LoanStatusCenter.test.js`, add after the flat-hero test from Task 3:

```js
  test('property.vesting renders under the address line', async () => {
    mortgageService.getBorrowerDashboard.mockResolvedValue(FULL_DASHBOARD);
    const { container } = renderPage();
    await screen.findByText('In processing');

    const vest = container.querySelector('.lsc-vesting');
    expect(vest).not.toBeNull();
    expect(vest).toHaveTextContent('John Q. Public and Jane Q. Public, as joint tenants');
    // It sits inside the hero text block, after the address sub-line.
    expect(vest.closest('.lsc-hero-text')).not.toBeNull();
  });

  test('no property.vesting → no vesting line', async () => {
    // Default DASHBOARD fixture has no vesting.
    const { container } = renderPage();
    await screen.findByText(/123 Main St/);
    expect(container.querySelector('.lsc-vesting')).toBeNull();
  });
```

- [ ] **Step 2: Run to verify the first test fails**

```bash
cd /Users/zacharyzink/MSFG/WebProjects/mortgage-app/frontend
CI=true npx react-scripts test --watchAll=false src/pages/statusCenter/LoanStatusCenter.test.js
```

Expected: `Tests: 1 failed, 15 passed, 16 total` — fails on `expect(vest).not.toBeNull()`.

- [ ] **Step 3: Implement**

In `frontend/src/pages/statusCenter/LoanStatusCenter.js`, inside the hero text block, replace:

```jsx
          {addressLine && <p className="lsc-sub">{addressLine}</p>}
```

with:

```jsx
          {addressLine && <p className="lsc-sub">{addressLine}</p>}
          {prop?.vesting && <p className="lsc-sub lsc-vesting">{prop.vesting}</p>}
```

Append at the END of `frontend/src/pages/statusCenter/LoanStatusCenter.css` (after the Task 3 block):

```css

/* vesting line — small-caps muted variant of .lsc-sub; end-of-file so it wins
 * the equal-specificity fight with .lsc-sub (line ~119) by source order */
.lsc-vesting {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: var(--sage);
  opacity: .85;
  margin-top: 3px;
}
```

- [ ] **Step 4: Run to verify pass**

```bash
cd /Users/zacharyzink/MSFG/WebProjects/mortgage-app/frontend
CI=true npx react-scripts test --watchAll=false src/pages/statusCenter/LoanStatusCenter.test.js
```

Expected: `PASS`, `Tests: 16 passed, 16 total`.

- [ ] **Step 5: Commit**

```bash
cd /Users/zacharyzink/MSFG/WebProjects/mortgage-app
git add frontend/src/pages/statusCenter/LoanStatusCenter.js frontend/src/pages/statusCenter/LoanStatusCenter.css frontend/src/pages/statusCenter/LoanStatusCenter.test.js
git commit -m "feat(status-center): vesting line under the hero address"
```

---

### Task 5: ContactCards section component

**Files:**
- Create: `frontend/src/pages/statusCenter/sections/ContactCards.jsx`
- Create: `frontend/src/pages/statusCenter/sections/ContactCards.test.jsx`
- Modify: `frontend/src/pages/statusCenter/LoanStatusCenter.css` (append at end)

Pattern source: `sections/LoanOfficerCard.jsx` (the `blank()` helper, `tel:`/`mailto:` `.lsc-lo-row` rows, blank-hidden rule). One compact `.lsc-card` per contact; `roleLabel` is the card heading; icon per role; name/company identity block; contacts with every field blank are skipped; renders as received (server sends display order). Wiring into the container is Task 7.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/pages/statusCenter/sections/ContactCards.test.jsx`:

```jsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import ContactCards from './ContactCards';

const CONTACTS = [
  { role: 'TITLE_COMPANY', roleLabel: 'Title', name: 'Terri Cruz', company: 'Alta Title Co.', phone: '(303) 555-0140', email: 'terri@altatitle.example.com' },
  { role: 'INSURANCE_AGENT', roleLabel: 'Insurance', name: 'Ian Shore', company: 'Acme Insurance', phone: '(303) 555-0177', email: 'ian@acmeins.example.com' },
];

describe('ContactCards', () => {
  test('renders one card per contact: roleLabel heading, name, company', () => {
    const { container } = render(<ContactCards contacts={CONTACTS} />);
    expect(container.querySelectorAll('.lsc-card')).toHaveLength(2);
    expect(screen.getByRole('heading', { name: 'Title' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Insurance' })).toBeInTheDocument();
    expect(screen.getByText('Terri Cruz')).toBeInTheDocument();
    expect(screen.getByText('Alta Title Co.')).toBeInTheDocument();
    expect(screen.getByText('Ian Shore')).toBeInTheDocument();
    expect(screen.getByText('Acme Insurance')).toBeInTheDocument();
  });

  test('phone renders a tel: link and email a mailto: link', () => {
    render(<ContactCards contacts={[CONTACTS[0]]} />);
    expect(screen.getByRole('link', { name: /555-0140/ }))
      .toHaveAttribute('href', 'tel:(303) 555-0140');
    expect(screen.getByRole('link', { name: /terri@altatitle\.example\.com/ }))
      .toHaveAttribute('href', 'mailto:terri@altatitle.example.com');
  });

  test('blank fields hide their rows (name-only contact still renders its card)', () => {
    render(
      <ContactCards contacts={[{ role: 'ESCROW_OFFICER', roleLabel: 'Escrow', name: 'Eve Osei', company: '', phone: null, email: '' }]} />,
    );
    expect(screen.getByRole('heading', { name: 'Escrow' })).toBeInTheDocument();
    expect(screen.getByText('Eve Osei')).toBeInTheDocument();
    expect(screen.queryByRole('link')).toBeNull();
  });

  test('a contact with every display field blank is skipped entirely', () => {
    const { container } = render(
      <ContactCards
        contacts={[
          CONTACTS[0],
          { role: 'LISTING_AGENT', roleLabel: "Seller's Agent", name: '', company: null, phone: '', email: null },
        ]}
      />,
    );
    expect(container.querySelectorAll('.lsc-card')).toHaveLength(1);
    expect(screen.queryByText("Seller's Agent")).not.toBeInTheDocument();
  });

  test('blank roleLabel falls back to the raw role', () => {
    render(
      <ContactCards contacts={[{ role: 'SELLING_AGENT', roleLabel: null, name: 'Bud Byer', company: null, phone: null, email: null }]} />,
    );
    expect(screen.getByRole('heading', { name: 'SELLING_AGENT' })).toBeInTheDocument();
  });

  test('renders nothing for null, empty, or non-array contacts', () => {
    const a = render(<ContactCards contacts={null} />);
    expect(a.container.firstChild).toBeNull();
    const b = render(<ContactCards contacts={[]} />);
    expect(b.container.firstChild).toBeNull();
    const c = render(<ContactCards contacts="oops" />);
    expect(c.container.firstChild).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd /Users/zacharyzink/MSFG/WebProjects/mortgage-app/frontend
CI=true npx react-scripts test --watchAll=false src/pages/statusCenter/sections/ContactCards.test.jsx
```

Expected: `FAIL` — `Cannot find module './ContactCards'`.

- [ ] **Step 3: Implement the component**

Create `frontend/src/pages/statusCenter/sections/ContactCards.jsx`:

```jsx
import React from 'react';

/*
 * ContactCards — compact third-party contact cards (title / insurance / agents /
 * escrow) rendered in the Loan Status Center left rail directly below
 * LoanOfficerCard. Follows the LoanOfficerCard row pattern (tel:/mailto: rows,
 * blank fields hidden).
 *
 * Consumes payload.contacts: [{ role, roleLabel, name, company, phone, email }].
 * The server sends contacts already filtered to the borrower-safe role allowlist
 * and in display order — render as received, no client sorting. roleLabel is the
 * card heading (server-mapped, e.g. "Seller's Agent"); a blank roleLabel falls
 * back to the raw role. A contact with every display field blank is skipped; an
 * empty/absent list renders nothing (the container also gates on
 * payload.contacts != null — the LO-hid contract).
 */

const ROLE_ICONS = {
  TITLE_COMPANY: '⚖',
  INSURANCE_AGENT: '☂',
  LISTING_AGENT: '⌂',
  SELLING_AGENT: '⌂',
  ESCROW_OFFICER: '$',
};

const blank = (s) => s == null || String(s).trim() === '';

export default function ContactCards({ contacts }) {
  const rows = Array.isArray(contacts) ? contacts : [];
  const visible = rows.filter(
    (c) => c && !(blank(c.name) && blank(c.company) && blank(c.phone) && blank(c.email)),
  );
  if (visible.length === 0) return null;

  return (
    <>
      {visible.map((c, i) => {
        const icon = ROLE_ICONS[c.role] || '☎';
        const heading = blank(c.roleLabel) ? (c.role || 'Contact') : String(c.roleLabel).trim();
        return (
          <div className="lsc-card lsc-contact" key={`${c.role || 'contact'}-${i}`}>
            <div className="lsc-card-h">
              <span className="lsc-cic lsc-cic--forest" aria-hidden="true">{icon}</span>
              <h3>{heading}</h3>
            </div>

            {(!blank(c.name) || !blank(c.company)) && (
              <div className="lsc-contact-id">
                {!blank(c.name) && <b>{String(c.name).trim()}</b>}
                {!blank(c.company) && <span>{String(c.company).trim()}</span>}
              </div>
            )}

            {!blank(c.phone) && (
              <a className="lsc-lo-row" href={`tel:${String(c.phone).trim()}`}>
                <span className="lsc-lo-ic" aria-hidden="true">✆</span>
                {String(c.phone).trim()}
              </a>
            )}
            {!blank(c.email) && (
              <a className="lsc-lo-row" href={`mailto:${String(c.email).trim()}`}>
                <span className="lsc-lo-ic" aria-hidden="true">✉</span>
                {String(c.email).trim()}
              </a>
            )}
            <div className="lsc-kv-pad" />
          </div>
        );
      })}
    </>
  );
}
```

- [ ] **Step 4: Append the identity-block CSS**

Append at the END of `frontend/src/pages/statusCenter/LoanStatusCenter.css` (after the Task 4 block):

```css

/* contact cards (rail, under the LO card) — reuse .lsc-card / .lsc-lo-row;
 * only the compact identity block is new */
.lsc-contact-id { padding: 12px 22px 4px; }
.lsc-contact-id b { display: block; font-size: 14px; font-weight: 800; }
.lsc-contact-id span { display: block; font-size: 11.5px; color: var(--ink-soft); margin-top: 1px; }
```

(No responsive work needed: `.lsc-rail-col > .lsc-card { flex: 1 1 280px; }` at CSS `:743` already lays new rail cards out in the ≤1180px row variant.)

- [ ] **Step 5: Run to verify pass**

```bash
cd /Users/zacharyzink/MSFG/WebProjects/mortgage-app/frontend
CI=true npx react-scripts test --watchAll=false src/pages/statusCenter/sections/ContactCards.test.jsx
```

Expected: `PASS`, `Tests: 6 passed, 6 total`.

- [ ] **Step 6: Commit**

```bash
cd /Users/zacharyzink/MSFG/WebProjects/mortgage-app
git add frontend/src/pages/statusCenter/sections/ContactCards.jsx frontend/src/pages/statusCenter/sections/ContactCards.test.jsx frontend/src/pages/statusCenter/LoanStatusCenter.css
git commit -m "feat(status-center): ContactCards section component

- one compact lsc-card per borrower-visible contact (roleLabel heading, role icon, name/company, tel/mailto rows)
- blank fields hidden; all-blank contacts skipped; null/empty renders nothing"
```

---

### Task 6: ClosingCostsCard section component

**Files:**
- Create: `frontend/src/pages/statusCenter/sections/ClosingCostsCard.jsx`
- Create: `frontend/src/pages/statusCenter/sections/ClosingCostsCard.test.jsx`

Pattern source: `sections/PaymentCard.jsx` / `sections/SnapshotCard.jsx` (`USD_FMT`, `usd()`, `Row` with `.lsc-kv` / `.is-hl`, null rows omitted, tight header). Rows: Origination, Services, Taxes & government, Prepaids & escrow, Other, **Total closing costs** (highlighted), Seller credits, Other credits, then the emphasized bottom line — label `"Estimated cash to close"` when `estimatedCashToClose >= 0`, else `"Estimated cash back to you"` with the absolute value. Credit values render as provided by the server (no client sign games). No new CSS — everything reuses the existing kv-table classes.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/pages/statusCenter/sections/ClosingCostsCard.test.jsx`:

```jsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import ClosingCostsCard from './ClosingCostsCard';

const FULL = {
  origination: 3000,
  services: 2500,
  taxesAndGov: 1200,
  prepaidsAndEscrow: 1800,
  other: 400,
  totalClosingCosts: 8900,
  sellerCredits: 5000,
  otherCredits: 250,
  estimatedCashToClose: 42350.75,
};

describe('ClosingCostsCard', () => {
  test('renders every category row with currency formatting', () => {
    render(<ClosingCostsCard closingCosts={FULL} />);
    expect(screen.getByText('Closing costs')).toBeInTheDocument();
    expect(screen.getByText('Origination')).toBeInTheDocument();
    expect(screen.getByText('$3,000.00')).toBeInTheDocument();
    expect(screen.getByText('Services')).toBeInTheDocument();
    expect(screen.getByText('$2,500.00')).toBeInTheDocument();
    expect(screen.getByText('Taxes & government')).toBeInTheDocument();
    expect(screen.getByText('$1,200.00')).toBeInTheDocument();
    expect(screen.getByText('Prepaids & escrow')).toBeInTheDocument();
    expect(screen.getByText('$1,800.00')).toBeInTheDocument();
    expect(screen.getByText('Other')).toBeInTheDocument();
    expect(screen.getByText('$400.00')).toBeInTheDocument();
    expect(screen.getByText('Seller credits')).toBeInTheDocument();
    expect(screen.getByText('$5,000.00')).toBeInTheDocument();
    expect(screen.getByText('Other credits')).toBeInTheDocument();
    expect(screen.getByText('$250.00')).toBeInTheDocument();
  });

  test('total row and cash line are both highlighted (.is-hl)', () => {
    const { container } = render(<ClosingCostsCard closingCosts={FULL} />);
    const hls = container.querySelectorAll('.lsc-kv.is-hl');
    expect(hls).toHaveLength(2);
    expect(hls[0].textContent).toMatch(/Total closing costs/);
    expect(hls[0].textContent).toMatch(/\$8,900\.00/);
    expect(hls[1].textContent).toMatch(/Estimated cash to close/);
    expect(hls[1].textContent).toMatch(/\$42,350\.75/);
  });

  test('negative estimatedCashToClose flips the label and shows the absolute value', () => {
    render(<ClosingCostsCard closingCosts={{ ...FULL, estimatedCashToClose: -1500 }} />);
    expect(screen.getByText('Estimated cash back to you')).toBeInTheDocument();
    expect(screen.getByText('$1,500.00')).toBeInTheDocument();
    expect(screen.queryByText('Estimated cash to close')).not.toBeInTheDocument();
  });

  test('zero estimatedCashToClose keeps the cash-to-close label', () => {
    render(<ClosingCostsCard closingCosts={{ ...FULL, estimatedCashToClose: 0 }} />);
    expect(screen.getByText('Estimated cash to close')).toBeInTheDocument();
    expect(screen.getByText('$0.00')).toBeInTheDocument();
  });

  test('null fields omit their rows (null-tolerant DTO contract)', () => {
    render(
      <ClosingCostsCard
        closingCosts={{
          origination: 3000, services: null, taxesAndGov: null, prepaidsAndEscrow: null,
          other: null, totalClosingCosts: 3000, sellerCredits: null, otherCredits: null,
          estimatedCashToClose: null,
        }}
      />,
    );
    expect(screen.getByText('Origination')).toBeInTheDocument();
    expect(screen.queryByText('Services')).not.toBeInTheDocument();
    expect(screen.queryByText('Seller credits')).not.toBeInTheDocument();
    expect(screen.queryByText(/Estimated cash/)).not.toBeInTheDocument();
    expect(screen.getByText('Total closing costs')).toBeInTheDocument();
  });

  test('renders nothing when closingCosts is null', () => {
    const { container } = render(<ClosingCostsCard closingCosts={null} />);
    expect(container.querySelector('.lsc-card')).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd /Users/zacharyzink/MSFG/WebProjects/mortgage-app/frontend
CI=true npx react-scripts test --watchAll=false src/pages/statusCenter/sections/ClosingCostsCard.test.jsx
```

Expected: `FAIL` — `Cannot find module './ClosingCostsCard'`.

- [ ] **Step 3: Implement the component**

Create `frontend/src/pages/statusCenter/sections/ClosingCostsCard.jsx`:

```jsx
import React from 'react';

/*
 * ClosingCostsCard — the "Closing costs" card in the Loan Status Center right
 * column, below PaymentCard. Follows the PaymentCard/SnapshotCard kv-table
 * pattern (.lsc-kv rows, .is-hl highlight, null rows omitted).
 *
 * Consumes payload.closingCosts:
 *   { origination, services, taxesAndGov, prepaidsAndEscrow, other,
 *     totalClosingCosts, sellerCredits, otherCredits, estimatedCashToClose }
 * All fields null-tolerant. estimatedCashToClose: positive = borrower brings
 * cash ("Estimated cash to close"); negative = cash back ("Estimated cash back
 * to you", absolute value shown). Credit values render as provided by the API.
 */

const USD_FMT = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const usd = (n) => (Number.isFinite(n) ? USD_FMT.format(n) : null);

function Row({ label, value, hl }) {
  if (value == null) return null;
  return (
    <div className={`lsc-kv${hl ? ' is-hl' : ''}`}>
      <span className="lsc-kv-k">{label}</span>
      <span className="lsc-kv-v">{value}</span>
    </div>
  );
}

export default function ClosingCostsCard({ closingCosts }) {
  if (!closingCosts) return null;

  const {
    origination,
    services,
    taxesAndGov,
    prepaidsAndEscrow,
    other,
    totalClosingCosts,
    sellerCredits,
    otherCredits,
    estimatedCashToClose,
  } = closingCosts;

  const cashBack = Number.isFinite(estimatedCashToClose) && estimatedCashToClose < 0;
  const cashLabel = cashBack ? 'Estimated cash back to you' : 'Estimated cash to close';
  const cashValue = usd(cashBack ? Math.abs(estimatedCashToClose) : estimatedCashToClose);

  return (
    <div className="lsc-card">
      <div className="lsc-card-h lsc-card-h--tight">
        <span className="lsc-cic lsc-cic--green" aria-hidden="true">$</span>
        <h3>Closing costs</h3>
      </div>

      <Row label="Origination" value={usd(origination)} />
      <Row label="Services" value={usd(services)} />
      <Row label="Taxes & government" value={usd(taxesAndGov)} />
      <Row label="Prepaids & escrow" value={usd(prepaidsAndEscrow)} />
      <Row label="Other" value={usd(other)} />
      <Row label="Total closing costs" value={usd(totalClosingCosts)} hl />
      <Row label="Seller credits" value={usd(sellerCredits)} />
      <Row label="Other credits" value={usd(otherCredits)} />
      <Row label={cashLabel} value={cashValue} hl />
      <div className="lsc-kv-pad" />
    </div>
  );
}
```

- [ ] **Step 4: Run to verify pass**

```bash
cd /Users/zacharyzink/MSFG/WebProjects/mortgage-app/frontend
CI=true npx react-scripts test --watchAll=false src/pages/statusCenter/sections/ClosingCostsCard.test.jsx
```

Expected: `PASS`, `Tests: 6 passed, 6 total`.

- [ ] **Step 5: Commit**

```bash
cd /Users/zacharyzink/MSFG/WebProjects/mortgage-app
git add frontend/src/pages/statusCenter/sections/ClosingCostsCard.jsx frontend/src/pages/statusCenter/sections/ClosingCostsCard.test.jsx
git commit -m "feat(status-center): ClosingCostsCard section component

- category rows, highlighted Total closing costs, seller/other credits
- sign-aware bottom line: cash to close vs cash back to you (abs value)"
```

---

### Task 7: Wire ContactCards + ClosingCostsCard into the container

**Files:**
- Modify: `frontend/src/pages/statusCenter/LoanStatusCenter.js` (imports + rail column + side column)
- Test: `frontend/src/pages/statusCenter/LoanStatusCenter.test.js`

Placement per spec: `ContactCards` in the left rail directly below `LoanOfficerCard` (above `NotificationsCard`); `ClosingCostsCard` in the right column after `PaymentCard`. Both follow the LO-hid contract: `payload.<section> != null` gates the render; an empty `contacts` array additionally renders nothing (component-level).

- [ ] **Step 1: Write the failing container tests**

In `frontend/src/pages/statusCenter/LoanStatusCenter.test.js`, add after the vesting tests from Task 4:

```js
  test('contacts render in the rail below the LO card; closing costs in the side column after Payment', async () => {
    mortgageService.getBorrowerDashboard.mockResolvedValue(FULL_DASHBOARD);
    const { container } = renderPage();
    await screen.findByText('In processing');

    // Contacts land in the rail column…
    const rail = container.querySelector('.lsc-rail-col');
    expect(rail).toHaveTextContent('Terri Cruz');
    expect(rail).toHaveTextContent('Alta Title Co.');
    expect(rail).toHaveTextContent('Ian Shore');
    // …after the LO card and before Notifications (heading order proves placement).
    const railHeadings = [...rail.querySelectorAll('.lsc-card-h h3')].map((h) => h.textContent);
    expect(railHeadings.indexOf('Your loan officer')).toBeLessThan(railHeadings.indexOf('Title'));
    expect(railHeadings.indexOf('Insurance')).toBeLessThan(railHeadings.indexOf('Notifications'));

    // Closing costs land in the side column, after the payment card.
    const side = container.querySelector('.lsc-side-col');
    expect(side).toHaveTextContent('Closing costs');
    expect(side).toHaveTextContent('$8,900.00');
    expect(side).toHaveTextContent('Estimated cash to close');
    const sideHeadings = [...side.querySelectorAll('.lsc-card-h h3')].map((h) => h.textContent);
    expect(sideHeadings.indexOf('Estimated monthly payment')).toBeLessThan(sideHeadings.indexOf('Closing costs'));
  });

  test('LO-hid contract: contacts/closingCosts null (or contacts empty) render nothing', async () => {
    mortgageService.getBorrowerDashboard.mockResolvedValue({
      ...FULL_DASHBOARD,
      contacts: null,
      closingCosts: null,
    });
    renderPage();

    expect(await screen.findByText('In processing')).toBeInTheDocument();
    expect(screen.queryByText('Terri Cruz')).not.toBeInTheDocument();
    expect(screen.queryByText('Closing costs')).not.toBeInTheDocument();
    // The rest of the grid is intact.
    expect(screen.getByText('Dana Lender')).toBeInTheDocument();
    expect(screen.getByText('Estimated monthly payment')).toBeInTheDocument();
  });

  test('empty contacts array renders no contact cards', async () => {
    mortgageService.getBorrowerDashboard.mockResolvedValue({
      ...FULL_DASHBOARD,
      contacts: [],
    });
    renderPage();

    expect(await screen.findByText('In processing')).toBeInTheDocument();
    expect(screen.queryByText('Terri Cruz')).not.toBeInTheDocument();
    expect(screen.getByText('Your loan officer')).toBeInTheDocument();
  });
```

(Heading texts verified against source: `NotificationsCard.jsx:73` renders `<h3>Notifications</h3>`; `LoanOfficerCard.jsx` renders `<h3>Your loan officer</h3>`; `PaymentCard.jsx` renders `<h3>Estimated monthly payment</h3>`.)

- [ ] **Step 2: Run to verify the new tests fail**

```bash
cd /Users/zacharyzink/MSFG/WebProjects/mortgage-app/frontend
CI=true npx react-scripts test --watchAll=false src/pages/statusCenter/LoanStatusCenter.test.js
```

Expected: `Tests: 1 failed, 18 passed, 19 total` — only the placement test fails (on `expect(rail).toHaveTextContent('Terri Cruz')`, since nothing is wired yet); the two negative tests pass vacuously before wiring, but they become real guards once Step 3 lands.

- [ ] **Step 3: Wire the components in**

In `frontend/src/pages/statusCenter/LoanStatusCenter.js`:

Add the imports after the existing `NotificationsCard` import (post-Task-1 `:19`):

```js
import ContactCards from './sections/ContactCards';
import ClosingCostsCard from './sections/ClosingCostsCard';
```

Replace the rail column block (post-Task-1, the `<aside className="lsc-rail-col">` contents):

```jsx
          <aside className="lsc-rail-col">
            {payload?.milestones != null && (
              <StatusRail milestones={payload.milestones} />
            )}
            {payload?.loanOfficer != null && (
              <LoanOfficerCard loanOfficer={payload.loanOfficer} />
            )}
            {payload?.notificationPrefs != null && (
              <NotificationsCard
                prefs={payload.notificationPrefs}
                suiteLoanId={selectedId}
                onSaved={refetch}
              />
            )}
          </aside>
```

with:

```jsx
          <aside className="lsc-rail-col">
            {payload?.milestones != null && (
              <StatusRail milestones={payload.milestones} />
            )}
            {payload?.loanOfficer != null && (
              <LoanOfficerCard loanOfficer={payload.loanOfficer} />
            )}
            {payload?.contacts != null && (
              <ContactCards contacts={payload.contacts} />
            )}
            {payload?.notificationPrefs != null && (
              <NotificationsCard
                prefs={payload.notificationPrefs}
                suiteLoanId={selectedId}
                onSaved={refetch}
              />
            )}
          </aside>
```

And in the side column, replace:

```jsx
            {payload?.payment != null && (
              <PaymentCard payment={payload.payment} />
            )}
          </aside>
```

with:

```jsx
            {payload?.payment != null && (
              <PaymentCard payment={payload.payment} />
            )}
            {payload?.closingCosts != null && (
              <ClosingCostsCard closingCosts={payload.closingCosts} />
            )}
          </aside>
```

- [ ] **Step 4: Run to verify pass**

```bash
cd /Users/zacharyzink/MSFG/WebProjects/mortgage-app/frontend
CI=true npx react-scripts test --watchAll=false src/pages/statusCenter/LoanStatusCenter.test.js
```

Expected: `PASS`, `Tests: 19 passed, 19 total`.

- [ ] **Step 5: Commit**

```bash
cd /Users/zacharyzink/MSFG/WebProjects/mortgage-app
git add frontend/src/pages/statusCenter/LoanStatusCenter.js frontend/src/pages/statusCenter/LoanStatusCenter.test.js
git commit -m "feat(status-center): wire ContactCards + ClosingCostsCard into the grid

- contacts in the rail under the LO card; closing costs after Payment in the side column
- null payload section renders nothing (LO-hid contract); empty contacts list renders nothing"
```

---

### Task 8: Full verification sweep

**Files:** none (verification only)

- [ ] **Step 1: Run the whole statusCenter scope**

```bash
cd /Users/zacharyzink/MSFG/WebProjects/mortgage-app/frontend
CI=true npx react-scripts test --watchAll=false src/pages/statusCenter
```

Expected: `Test Suites: 18 passed, 18 total` (baseline 17 − DocumentHistory + ContactCards + ClosingCostsCard), `Tests: 103 passed, 103 total` (baseline 87 − 4 DocumentHistory + 1 doc-gone + 2 hero + 2 vesting + 6 ContactCards + 6 ClosingCostsCard + 3 wiring). Requirement: zero failures.

- [ ] **Step 2: Run the full frontend test suite**

```bash
cd /Users/zacharyzink/MSFG/WebProjects/mortgage-app/frontend
CI=true npx react-scripts test --watchAll=false
```

Expected: zero failures. If anything fails OUTSIDE `src/pages/statusCenter`, compare against `main` (`git stash && CI=true npx react-scripts test --watchAll=false <failing path>`) — pre-existing failures are out of scope for this branch; do not "fix" unrelated suites here.

- [ ] **Step 3: Production build sanity check**

```bash
cd /Users/zacharyzink/MSFG/WebProjects/mortgage-app/frontend
npm run build
```

Expected: `Compiled successfully.` (or "Compiled with warnings" — pre-existing lint warnings are fine; new errors are not).

- [ ] **Step 4: Verify the branch is clean and reviewable**

```bash
cd /Users/zacharyzink/MSFG/WebProjects/mortgage-app
git log --oneline main..feat/borrower-dashboard-v2
git status --short
```

Expected: 7 commits (Tasks 1–7); only the pre-existing `frontend/package-lock.json` modification and the untracked plan doc (`?? docs/superpowers/plans/2026-07-25-borrower-dashboard-v2-borrower-app.md`) remain — leave both.

---

## Manual verification

The new payload fields come from the msfg-suite API plan (Part 3). Until that ships, sections simply don't render (null-gated) — the page must look identical to today except Document History is gone.

**Without the API (fixture-independent smoke, do now):**
1. `cd frontend && npm start`, log in as a borrower (or staff client-view), open `/dashboard`.
2. Confirm: no "Document history" card; the upload dropzone and Downloads card still render; flat forest hero unchanged; no console errors.

**With the API deployed (staging/prod smoke, after the msfg-suite plan ships):**
1. In the suite console, on a test loan: upload a property photo (PROPERTY_PHOTO), set vesting text, ensure `showContacts`/`showClosingCosts` are on, and add loan contacts for at least TITLE_COMPANY and INSURANCE_AGENT.
2. Open the borrower dashboard for that loan: hero shows the photo full-bleed with the forest gradient overlay and legible mint/sage text; vesting line renders small-caps under the address.
3. Contact cards appear under "Your loan officer" with working `tel:`/`mailto:` links; no address data appears anywhere in a contact card.
4. Closing costs card appears below the payment card; verify the category rows and total against the loan's fee worksheet; "Est. cash to close" also appears in the Snapshot card and matches.
5. Flip a loan with negative cash-to-close (or temporarily edit fees) → the bottom line reads "Estimated cash back to you" with a positive dollar figure.
6. In the suite console, toggle `showContacts` off and `showClosingCosts` off → borrower refresh: both sections vanish entirely (no empty cards).
7. Remove the property photo (settings PATCH `propertyPhotoDocumentId: null`) → borrower refresh: flat forest hero returns.
8. Resize to <1180px and <860px: contact cards flow into the wrapped rail row (existing `flex: 1 1 280px` rule) and the closing-costs card stacks with the side column; hero photo stays legible at mobile padding.
