# Borrower Dashboard v2.1 — Borrower App (Part 3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Evolve the borrower's Loan Status Center for v2.1: consolidate the per-contact cards into a single "Your loan team" card, render each grid column's sections in the LO's saved `payload.layout` order, add a property-photo thumbnail strip with client-side hero swap, and re-sync milestone fixtures to the 8 Kanban-lane contract.

**Architecture:** All changes live in `frontend/src/pages/statusCenter/`. The container (`LoanStatusCenter.js`) keeps the v2 server-visibility contract — a null/absent payload section means the LO hid it — and layers section ARRANGEMENT (column placement + order) on top via a new pure helper `planColumns(layout)` (union contract: any of the 14 section keys can land in any column, because the console drags sections across columns); hiding always beats ordering. `ContactCards` becomes one card with a row group per contact (payload `contacts` array unchanged — purely presentational). The hero gains a `photoUrls`-driven thumbnail strip with `useState` index selection; a single photo stays byte-identical to v2. The service layer needs **zero changes**: `mortgageService.getBorrowerDashboard` (`frontend/src/services/mortgageService.js:404-411`) is a pure envelope passthrough, so `layout`, `property.photoUrls`, and the 8-lane `milestones` arrive automatically once the API ships them.

**Tech Stack:** React 18 (CRA / react-scripts 5.0.1), plain CSS scoped under `.lsc-page`, Jest + @testing-library/react (via `react-scripts test`, jsdom, `src/setupTests.js` loads jest-dom).

**Worktree / branch:** `/Users/zacharyzink/MSFG/worktrees/bdv21-borrower`, branch `feat/borrower-dashboard-v2.1` (already checked out, off `main` @ `b00b68c`). All test commands run from `/Users/zacharyzink/MSFG/worktrees/bdv21-borrower/frontend`; all git commands from the worktree root `/Users/zacharyzink/MSFG/worktrees/bdv21-borrower`. Deps are installed (`npm ci --legacy-peer-deps` run 2026-07-26); re-run it if `frontend/node_modules` is missing. **NEVER commit `frontend/package-lock.json`** (deliberate repo convention — stage only the files each task names, never `git add -A`). `frontend/build/` is gitignored.

---

## Pinned v2.1 wire contract (client-consumed fields only)

From the design spec (`bdv21-console/docs/superpowers/specs/2026-07-26-borrower-dashboard-v2.1-design.md`). Every task here is testable with **local fixtures only** — no live API needed.

- **`payload.layout`** — `{"rail":[...],"main":[...],"side":[...]}`, the LO's saved per-loan section arrangement. NON_NULL semantics: the field is **absent when unset** (never `null` on the wire). The key vocabulary is the **14-key UNION** — any key may appear in ANY of the three arrays, because the console drags sections within AND across columns (pinned identically in `bdv21-api/docs/superpowers/plans/2026-07-26-borrower-dashboard-v2.1-api.md:18` — "Keys may be placed in ANY of the three arrays (drag across columns) — validation is over the union"; its ITs park `rateLock` in `rail` and expect 200). HOME columns / default orders:
  - `rail`: `milestones`, `loanOfficer`, `contacts`, `notifications`
  - `main`: `todo`, `dropzone`, `cleared`, `downloads`
  - `side`: `rateLock`, `keyDates`, `appraisal`, `snapshot`, `payment`, `closingCosts`
  The server 400s unknown keys and duplicates **across all three arrays on write** (a section lives in exactly one column); the client stays tolerant **on read**: unknown keys ignored, duplicates (within or across arrays) resolve global-first-occurrence-wins scanning rail→main→side, keys missing from the whole layout append to their HOME column in default order, absent layout → today's hardcoded arrangement. Responsive collapse keeps concatenating columns rail→main→side as today (pure CSS — no change).
- **`property.photoUrls`** — ordered presigned GET URLs. Each element degrades to SKIPPED server-side on dangling/unconfirmed/failed presign, so the array **never contains nulls**. `property.photoUrl` stays = first element or `null` (back-compat; pre-v2.1 payloads have only `photoUrl`).
- **`milestones`** — now **8 entries**: the Kanban pipeline lanes in board order, minus INACTIVE. `key` = `KanbanLane.name()`, `label` = lane `label()` — verified against `bdv21-api/loan-core/src/main/java/com/msfg/los/loan/board/KanbanLane.java:33-40`:
  `PRE_APPROVAL` "Pre-Approval", `APPLICATION` "Application", `PROCESSING` "Processing", `UNDERWRITING` "Underwriting", `CONDITIONAL_APPROVAL` "Conditional Approval", `CLEAR_TO_CLOSE` "Clear to Close", `CLOSED` "Closed", `FUNDED` "Funded".
  `state` ∈ DONE/CURRENT/UPCOMING; an INACTIVE effective lane → **no entry is CURRENT** (existing DONEs keep their state). DONE dates derive from status history (null when none) — all server-side; the client renders whatever arrives. `BorrowerMilestone` DTO shape is unchanged (`{ key, label, state, date }`), so **no component logic changes — fixtures only** (Task 5 verifies `StatusRail` is genuinely count-agnostic).
- **`contacts`** — array UNCHANGED from v2 (`[{ role, roleLabel, name, company, phone, email }]`, server-ordered, `null` = LO hid). The single-card rework is purely presentational.

**Not in this plan** (other v2.1 plans; do not touch here): V53 migration + `sectionLayout`/`propertyPhotoDocumentIds` settings PATCH (API plan — V53-free check happens there), notes send endpoint + `loan_note_send` audit, console drag-to-arrange, PreviewHero photo management, lane mover, SendDashboardLinkDialog mount. The borrower app has no migrations and no settings writes.

## Verified file anchors (at `b00b68c`)

- `frontend/src/pages/statusCenter/LoanStatusCenter.js` (273 lines): state block `:33-40` (`calendarOpen` `:39`); payload fetch effect `:92-109` (success branch `setPayload(data); setError(null)` `:100-103`); `prop`/`photoUrl` derivation `:130-131`; hero `:156-178` (photo layer `:158-164` — must stay first child); grid `:187-262` — rail col `:194-211`, main col `:213-234`, side col `:236-261`; calendar modal `:265-270`.
- `frontend/src/pages/statusCenter/LoanStatusCenter.test.js` (416 lines, 20 tests): `FULL_DASHBOARD` `:40-106` (`property` `:42-46`, `milestones` `:47-51`, `contacts` `:92-95`); contacts/closing-costs placement test `:303-331`; empty-contacts test `:349-359`; `'In processing'` appears at `:49` (fixture) and as a wait-anchor at `:217, 253, 277, 299, 306, 341, 356, 371`.
- `frontend/src/pages/statusCenter/sections/ContactCards.jsx` (72 lines, one `.lsc-card` per contact) + `ContactCards.test.jsx` (67 lines, 6 tests).
- `frontend/src/pages/statusCenter/sections/StatusRail.jsx` (61 lines; header comment `:3-10` says "exactly 6" — stale after this plan) + `StatusRail.test.jsx` (31 lines, 3 tests, lowercase ad-hoc keys — stale).
- `frontend/src/pages/statusCenter/LoanStatusCenter.css` (949 lines): **all new CSS is appended at the END** (source-order beats equal specificity — v2 convention). Old contact-cards block `:945-949` (replaced by Task 1); hero-photo block `:897-943`; `.lsc-card`/`.lsc-card-h` `:296-312`; `.lsc-lo-row`/`.lsc-lo-ic` `:650-670`; grid `:185-201`; responsive `:731-776` (`.lsc-rail-col > .lsc-card { flex: 1 1 280px; }` at `:743` already handles the consolidated team card).
- Section identifiers for DOM-order assertions — card headings (`.lsc-card-h h3`): `Your to-do list` (TodoList), `Cleared items`, `Downloads`, `Key dates`, `Appraisal`, `Your loan at a glance` (SnapshotCard), `Estimated monthly payment` (PaymentCard), `Closing costs`, `Your loan officer`, `Notifications`. **Headerless roots:** StatusRail renders `<ol class="lsc-rail">`, RateLockCard renders `<div class="lsc-lockcard">`, the dropzone is a plain `<div ref={dropzoneRef}>` containing the text `Drop your documents here`.
- `humanizeStatus('IN_UNDERWRITING')` → `"In underwriting"` (`sections/LoanSelector.jsx:5-10`) — distinct string from the lane label `"Underwriting"`, so exact-match `findByText('Underwriting')` is collision-free.

**Baselines verified green 2026-07-26** on this worktree:
- `CI=true npx react-scripts test --watchAll=false src/pages/statusCenter` → `Test Suites: 18 passed`, `Tests: 105 passed`.
- Full suite → `Test Suites: 69 passed`, `Tests: 618 passed`.
- `npm run build` → succeeds ("The build folder is ready to be deployed.").

---

### Task 1: Single "Your loan team" card (ContactCards rework)

**Files:**
- Modify: `frontend/src/pages/statusCenter/sections/ContactCards.test.jsx` (full rewrite, 6 → 7 tests)
- Modify: `frontend/src/pages/statusCenter/sections/ContactCards.jsx` (full rewrite)
- Modify: `frontend/src/pages/statusCenter/LoanStatusCenter.test.js` (placement test `:303-331`, empty-contacts test `:349-359`)
- Modify: `frontend/src/pages/statusCenter/LoanStatusCenter.css` (replace `:945-949` block, append v2.1 block at end)

- [ ] **Step 1: Rewrite the component test file (failing first)**

Replace the entire contents of `frontend/src/pages/statusCenter/sections/ContactCards.test.jsx` with:

```jsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import ContactCards from './ContactCards';

const CONTACTS = [
  // v2.1: the borrower's own team leads the server-sent order (Processor + Loan Assistant),
  // then the third parties. Icons come from ROLE_ICONS — the two team roles must map to their
  // own glyphs, not the '☎' fallback.
  { role: 'PROCESSOR', roleLabel: 'Processor', name: 'Pam Process', company: 'MSFG', phone: '(303) 555-0110', email: 'pam@msfg.example.com' },
  { role: 'LOAN_ASSISTANT', roleLabel: 'Loan Assistant', name: 'Lee Assist', company: 'MSFG', phone: '(303) 555-0120', email: 'lee@msfg.example.com' },
  { role: 'TITLE_COMPANY', roleLabel: 'Title', name: 'Terri Cruz', company: 'Alta Title Co.', phone: '(303) 555-0140', email: 'terri@altatitle.example.com' },
  { role: 'INSURANCE_AGENT', roleLabel: 'Insurance', name: 'Ian Shore', company: 'Acme Insurance', phone: '(303) 555-0177', email: 'ian@acmeins.example.com' },
];

describe('ContactCards (single "Your loan team" card, v2.1)', () => {
  test('renders ONE card with the team heading and a row group per contact, in server order', () => {
    const { container } = render(<ContactCards contacts={CONTACTS} />);
    expect(container.querySelectorAll('.lsc-card')).toHaveLength(1);
    expect(screen.getByRole('heading', { name: 'Your loan team' })).toBeInTheDocument();
    expect(container.querySelectorAll('.lsc-contact-row')).toHaveLength(4);
    // per-contact roleLabel eyebrows, server order preserved (team roles first)
    const eyebrows = [...container.querySelectorAll('.lsc-contact-eyebrow')].map((el) => el.textContent);
    expect(eyebrows[0]).toContain('Processor');
    expect(eyebrows[1]).toContain('Loan Assistant');
    expect(eyebrows[2]).toContain('Title');
    expect(eyebrows[3]).toContain('Insurance');
    // the two v2.1 team roles resolve to their OWN icons (not the '☎' fallback)
    const icons = [...container.querySelectorAll('.lsc-contact-eyebrow-ic')].map((el) => el.textContent);
    expect(icons[0]).toBe('⚙');
    expect(icons[1]).toBe('✎');
    expect(screen.getByText('Pam Process')).toBeInTheDocument();
    expect(screen.getByText('Lee Assist')).toBeInTheDocument();
    expect(screen.getByText('Terri Cruz')).toBeInTheDocument();
    expect(screen.getByText('Alta Title Co.')).toBeInTheDocument();
    expect(screen.getByText('Ian Shore')).toBeInTheDocument();
    expect(screen.getByText('Acme Insurance')).toBeInTheDocument();
  });

  test('roleLabel is an eyebrow, not a card heading', () => {
    render(<ContactCards contacts={CONTACTS} />);
    expect(screen.queryByRole('heading', { name: 'Title' })).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Insurance' })).toBeNull();
  });

  test('phone renders a tel: link and email a mailto: link', () => {
    render(<ContactCards contacts={[CONTACTS[0]]} />);
    expect(screen.getByRole('link', { name: /555-0140/ }))
      .toHaveAttribute('href', 'tel:(303) 555-0140');
    expect(screen.getByRole('link', { name: /terri@altatitle\.example\.com/ }))
      .toHaveAttribute('href', 'mailto:terri@altatitle.example.com');
  });

  test('blank fields hide their rows (name-only contact keeps its row group)', () => {
    render(
      <ContactCards contacts={[{ role: 'ESCROW_OFFICER', roleLabel: 'Escrow', name: 'Eve Osei', company: '', phone: null, email: '' }]} />,
    );
    expect(screen.getByText('Escrow')).toBeInTheDocument();
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
    expect(container.querySelectorAll('.lsc-contact-row')).toHaveLength(1);
    expect(screen.queryByText("Seller's Agent")).not.toBeInTheDocument();
  });

  test('blank roleLabel falls back to the raw role in the eyebrow', () => {
    const { container } = render(
      <ContactCards contacts={[{ role: 'SELLING_AGENT', roleLabel: null, name: 'Bud Byer', company: null, phone: null, email: null }]} />,
    );
    expect(container.querySelector('.lsc-contact-eyebrow')).toHaveTextContent('SELLING_AGENT');
  });

  test('renders nothing for null, empty, non-array, or all-blank contacts', () => {
    const a = render(<ContactCards contacts={null} />);
    expect(a.container.firstChild).toBeNull();
    const b = render(<ContactCards contacts={[]} />);
    expect(b.container.firstChild).toBeNull();
    const c = render(<ContactCards contacts="oops" />);
    expect(c.container.firstChild).toBeNull();
    const d = render(
      <ContactCards contacts={[{ role: 'TITLE_COMPANY', roleLabel: 'Title', name: '', company: '', phone: '', email: null }]} />,
    );
    expect(d.container.firstChild).toBeNull();
  });
});
```

- [ ] **Step 2: Run it to verify the right failures**

```bash
cd /Users/zacharyzink/MSFG/worktrees/bdv21-borrower/frontend
CI=true npx react-scripts test --watchAll=false src/pages/statusCenter/sections/ContactCards.test.jsx
```

Expected: `Tests: 4 failed, 3 passed, 7 total` — the single-card count (finds 2 `.lsc-card`s), the not-a-heading test (old markup has `<h3>Title</h3>`), the `.lsc-contact-row` count, and the eyebrow-fallback test (no `.lsc-contact-eyebrow` exists) fail against the old per-contact markup. tel/mailto, blank-row hiding, and renders-nothing pass (unchanged behavior).

- [ ] **Step 3: Rewrite the component**

Replace the entire contents of `frontend/src/pages/statusCenter/sections/ContactCards.jsx` with:

```jsx
import React from 'react';

/*
 * ContactCards — the single "Your loan team" card in the Loan Status Center
 * left rail, directly below LoanOfficerCard. v2.1 consolidation: ONE .lsc-card
 * with a row group per contact (was one card per contact). Purely
 * presentational — payload.contacts is UNCHANGED from v2.
 *
 * Consumes payload.contacts: [{ role, roleLabel, name, company, phone, email }].
 * The server sends contacts already filtered to the borrower-safe role allowlist
 * and in display order — render as received, no client sorting. roleLabel is the
 * per-contact eyebrow (server-mapped, e.g. "Seller's Agent"); a blank roleLabel
 * falls back to the raw role. A contact with every display field blank is
 * skipped; an empty/absent/all-blank list renders nothing (the container also
 * gates on payload.contacts != null — the LO-hid contract).
 */

const ROLE_ICONS = {
  PROCESSOR: '⚙',        // v2.1: borrower's own team (allowlisted first)
  LOAN_ASSISTANT: '✎',   // v2.1
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
    <div className="lsc-card lsc-contact">
      <div className="lsc-card-h">
        <span className="lsc-cic lsc-cic--forest" aria-hidden="true">☎</span>
        <h3>Your loan team</h3>
      </div>

      {visible.map((c, i) => {
        const icon = ROLE_ICONS[c.role] || '☎';
        const eyebrow = blank(c.roleLabel) ? (c.role || 'Contact') : String(c.roleLabel).trim();
        return (
          <div className="lsc-contact-row" key={`${c.role || 'contact'}-${i}`}>
            <div className="lsc-contact-eyebrow">
              <span className="lsc-contact-eyebrow-ic" aria-hidden="true">{icon}</span>
              {eyebrow}
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
          </div>
        );
      })}
      <div className="lsc-kv-pad" />
    </div>
  );
}
```

(Keeps `blank()`, `ROLE_ICONS`, and the exact tel/mailto `.lsc-lo-row` markup from v2. `.lsc-kv-pad` and `.lsc-cic--forest` already exist in the CSS.)

- [ ] **Step 4: Run the component test to verify it passes**

```bash
cd /Users/zacharyzink/MSFG/worktrees/bdv21-borrower/frontend
CI=true npx react-scripts test --watchAll=false src/pages/statusCenter/sections/ContactCards.test.jsx
```

Expected: `Tests: 7 passed, 7 total`.

- [ ] **Step 5: Update the two container tests**

In `frontend/src/pages/statusCenter/LoanStatusCenter.test.js`, replace the whole test `'contacts render in the rail below the LO card; closing costs in the side column after Payment'` (lines `303-331`) with:

```js
  test('single "Your loan team" card renders in the rail below the LO card; closing costs unchanged', async () => {
    mortgageService.getBorrowerDashboard.mockResolvedValue(FULL_DASHBOARD);
    const { container } = renderPage();
    await screen.findByText('Dana Lender');

    // ONE consolidated card holds both contacts…
    const rail = container.querySelector('.lsc-rail-col');
    expect(rail.querySelectorAll('.lsc-contact')).toHaveLength(1);
    expect(rail).toHaveTextContent('Terri Cruz');
    expect(rail).toHaveTextContent('Alta Title Co.');
    expect(rail).toHaveTextContent('Ian Shore');
    // …with roleLabel eyebrows, not per-contact card headings.
    const railHeadings = [...rail.querySelectorAll('.lsc-card-h h3')].map((h) => h.textContent);
    expect(railHeadings).toEqual(
      expect.arrayContaining(['Your loan officer', 'Your loan team', 'Notifications'])
    );
    expect(railHeadings).not.toEqual(expect.arrayContaining(['Title']));
    expect(railHeadings.indexOf('Your loan officer')).toBeLessThan(railHeadings.indexOf('Your loan team'));
    expect(railHeadings.indexOf('Your loan team')).toBeLessThan(railHeadings.indexOf('Notifications'));

    // Closing costs unchanged: side column, after the payment card.
    const side = container.querySelector('.lsc-side-col');
    expect(side).toHaveTextContent('Closing costs');
    expect(side).toHaveTextContent('$8,900.00');
    const sideHeadings = [...side.querySelectorAll('.lsc-card-h h3')].map((h) => h.textContent);
    expect(sideHeadings.indexOf('Estimated monthly payment')).toBeLessThan(sideHeadings.indexOf('Closing costs'));
  });
```

Then replace the whole test `'empty contacts array renders no contact cards'` (lines `349-359`) with (adds the team-heading assertion; keeps the `'In processing'` anchor — Task 5 re-points it):

```js
  test('empty contacts array renders no loan-team card', async () => {
    mortgageService.getBorrowerDashboard.mockResolvedValue({
      ...FULL_DASHBOARD,
      contacts: [],
    });
    renderPage();

    expect(await screen.findByText('In processing')).toBeInTheDocument();
    expect(screen.queryByText('Terri Cruz')).not.toBeInTheDocument();
    expect(screen.queryByText('Your loan team')).not.toBeInTheDocument();
    expect(screen.getByText('Your loan officer')).toBeInTheDocument();
  });
```

- [ ] **Step 6: Run the container test file**

```bash
cd /Users/zacharyzink/MSFG/worktrees/bdv21-borrower/frontend
CI=true npx react-scripts test --watchAll=false src/pages/statusCenter/LoanStatusCenter.test.js
```

Expected: `Tests: 20 passed, 20 total`.

- [ ] **Step 7: Swap the CSS block**

In `frontend/src/pages/statusCenter/LoanStatusCenter.css`, DELETE the old trailing block (lines `945-949`):

```css
/* contact cards (rail, under the LO card) — reuse .lsc-card / .lsc-lo-row;
 * only the compact identity block is new */
.lsc-contact-id { padding: 12px 22px 4px; }
.lsc-contact-id b { display: block; font-size: 14px; font-weight: 800; }
.lsc-contact-id span { display: block; font-size: 11.5px; color: var(--ink-soft); margin-top: 1px; }
```

and APPEND at the very end of the file:

```css
/* ---------- Borrower Dashboard v2.1: single "Your loan team" card ---------- */
/* One consolidated card in the rail (was one card per contact). Reuses
 * .lsc-card / .lsc-lo-row; each contact is a .lsc-contact-row group with a
 * roleLabel eyebrow. Divider uses the sibling combinator — NOT :first-of-type —
 * because the .lsc-card-h header is also a <div>, so :first-of-type on
 * .lsc-contact-row would never match. */
.lsc-contact-row + .lsc-contact-row {
  border-top: 1px solid var(--line);
  margin-top: 12px;
}
.lsc-contact-eyebrow {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 22px 0;
  font-size: 10.5px;
  font-weight: 800;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: var(--ink-soft);
}
.lsc-contact-eyebrow-ic {
  flex: 0 0 auto;
  width: 22px;
  height: 22px;
  border-radius: 7px;
  background: #F1F4F0;
  color: var(--forest);
  display: grid;
  place-items: center;
  font-size: 11px;
  letter-spacing: 0;
}
.lsc-contact-id { padding: 6px 22px 2px; }
.lsc-contact-id b { display: block; font-size: 14px; font-weight: 800; }
.lsc-contact-id span { display: block; font-size: 11.5px; color: var(--ink-soft); margin-top: 1px; }
```

- [ ] **Step 8: Run the whole statusCenter scope**

```bash
cd /Users/zacharyzink/MSFG/worktrees/bdv21-borrower/frontend
CI=true npx react-scripts test --watchAll=false src/pages/statusCenter
```

Expected: `Test Suites: 18 passed, 18 total`, `Tests: 106 passed, 106 total` (baseline 105 − 6 old ContactCards + 7 new).

- [ ] **Step 9: Commit**

```bash
cd /Users/zacharyzink/MSFG/worktrees/bdv21-borrower
git add frontend/src/pages/statusCenter/sections/ContactCards.jsx \
        frontend/src/pages/statusCenter/sections/ContactCards.test.jsx \
        frontend/src/pages/statusCenter/LoanStatusCenter.test.js \
        frontend/src/pages/statusCenter/LoanStatusCenter.css
git commit -m "feat(status-center): consolidate contacts into one \"Your loan team\" card

- one .lsc-card, a row group per contact with roleLabel eyebrow
- payload.contacts unchanged (purely presentational, per v2.1 spec)
- keeps blank-hiding, tel:/mailto rows, server order, LO-hid gating"
```

---

### Task 2: `planColumns` pure helper

**Files:**
- Create: `frontend/src/pages/statusCenter/planColumns.js`
- Create: `frontend/src/pages/statusCenter/planColumns.test.js`

(Colocated plain-JS module + test, same pattern as `loanGroups.js`/`loanGroups.test.js`.)

- [ ] **Step 1: Write the failing test**

Create `frontend/src/pages/statusCenter/planColumns.test.js`:

```js
import planColumns, { RAIL_KEYS, MAIN_KEYS, SIDE_KEYS } from './planColumns';

const DEFAULTS = { rail: RAIL_KEYS, main: MAIN_KEYS, side: SIDE_KEYS };

describe('planColumns', () => {
  test('null / undefined / non-object layout → default columns untouched', () => {
    expect(planColumns(null)).toEqual(DEFAULTS);
    expect(planColumns(undefined)).toEqual(DEFAULTS);
    expect(planColumns('oops')).toEqual(DEFAULTS);
    expect(planColumns(42)).toEqual(DEFAULTS);
  });

  test('a full within-column permutation is respected verbatim', () => {
    expect(planColumns({
      rail: ['notifications', 'contacts', 'loanOfficer', 'milestones'],
      main: ['downloads', 'cleared', 'dropzone', 'todo'],
      side: ['closingCosts', 'payment', 'snapshot', 'appraisal', 'keyDates', 'rateLock'],
    })).toEqual({
      rail: ['notifications', 'contacts', 'loanOfficer', 'milestones'],
      main: ['downloads', 'cleared', 'dropzone', 'todo'],
      side: ['closingCosts', 'payment', 'snapshot', 'appraisal', 'keyDates', 'rateLock'],
    });
  });

  test('cross-column placement is honored (union contract: any key in any array)', () => {
    const plan = planColumns({
      rail: ['rateLock', 'milestones', 'loanOfficer', 'contacts', 'notifications'],
      main: ['todo', 'dropzone', 'cleared', 'downloads'],
      side: ['keyDates', 'appraisal', 'snapshot', 'payment', 'closingCosts'],
    });
    expect(plan.rail).toEqual(['rateLock', 'milestones', 'loanOfficer', 'contacts', 'notifications']);
    expect(plan.side).toEqual(['keyDates', 'appraisal', 'snapshot', 'payment', 'closingCosts']);
  });

  test('unknown keys are ignored (forward compat)', () => {
    const plan = planColumns({
      main: ['downloads', 'heroPhoto', 'todo', 'dropzone', 'cleared'],
    });
    expect(plan.main).toEqual(['downloads', 'todo', 'dropzone', 'cleared']);
  });

  test('keys missing from the whole layout append to their HOME column in default order', () => {
    const plan = planColumns({ side: ['closingCosts', 'payment'] });
    expect(plan.side).toEqual(['closingCosts', 'payment', 'rateLock', 'keyDates', 'appraisal', 'snapshot']);
    expect(plan.rail).toEqual(RAIL_KEYS);
    expect(plan.main).toEqual(MAIN_KEYS);
  });

  test('duplicates within or across arrays: global first occurrence wins (scan rail→main→side)', () => {
    const plan = planColumns({
      rail: ['contacts', 'milestones', 'contacts'],                   // dupe WITHIN one array
      main: ['todo', 'contacts', 'dropzone', 'cleared', 'downloads'], // dupe ACROSS arrays
    });
    expect(plan.rail).toEqual(['contacts', 'milestones', 'loanOfficer', 'notifications']);
    expect(plan.main).toEqual(['todo', 'dropzone', 'cleared', 'downloads']);
  });

  test('empty object / empty arrays / non-array columns → defaults (equivalent to no layout)', () => {
    expect(planColumns({})).toEqual(DEFAULTS);
    expect(planColumns({ rail: [], main: [], side: [] })).toEqual(DEFAULTS);
    expect(planColumns({ rail: 'oops', main: 7, side: null })).toEqual(DEFAULTS);
  });

  test('does not mutate its input', () => {
    const layout = { rail: ['contacts', 'bogus'], main: ['todo'], side: [] };
    planColumns(layout);
    expect(layout).toEqual({ rail: ['contacts', 'bogus'], main: ['todo'], side: [] });
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

```bash
cd /Users/zacharyzink/MSFG/worktrees/bdv21-borrower/frontend
CI=true npx react-scripts test --watchAll=false src/pages/statusCenter/planColumns.test.js
```

Expected: FAIL — `Cannot find module './planColumns'`.

- [ ] **Step 3: Write the implementation**

Create `frontend/src/pages/statusCenter/planColumns.js`:

```js
/*
 * planColumns — pure column planner for the v2.1 layout contract.
 *
 * The borrower payload's `layout` ({ rail: [...], main: [...], side: [...] })
 * is the LO's saved per-loan section arrangement (absent when never
 * customized). The key vocabulary is the 14-key UNION: the console drags
 * sections both within and ACROSS columns, so any known key may appear in any
 * of the three arrays. The server 400s unknown keys and duplicates across all
 * three arrays on write (a section lives in exactly one column).
 *
 * Client read contract (tolerant):
 *   - layout missing / not an object → the three default columns, untouched
 *   - a column missing / not an array → treated as empty
 *   - unknown keys → ignored (forward compat: a future server key must not
 *     blank a column on an old client)
 *   - duplicate keys (within or across arrays) → global first occurrence
 *     wins, scanning rail → main → side
 *   - keys missing from the whole layout → appended to their HOME column in
 *     default order (backward compat: sections shipped after the LO saved
 *     their layout still render)
 *
 * Home columns / default orders (keys map 1:1 to the container's section
 * renderer; arrangement NEVER un-hides a section — hiding beats ordering):
 *   rail: milestones, loanOfficer, contacts, notifications
 *   main: todo, dropzone, cleared, downloads
 *   side: rateLock, keyDates, appraisal, snapshot, payment, closingCosts
 */

export const RAIL_KEYS = ['milestones', 'loanOfficer', 'contacts', 'notifications'];
export const MAIN_KEYS = ['todo', 'dropzone', 'cleared', 'downloads'];
export const SIDE_KEYS = ['rateLock', 'keyDates', 'appraisal', 'snapshot', 'payment', 'closingCosts'];

const COLUMNS = [
  ['rail', RAIL_KEYS],
  ['main', MAIN_KEYS],
  ['side', SIDE_KEYS],
];

const KNOWN = new Set([...RAIL_KEYS, ...MAIN_KEYS, ...SIDE_KEYS]);

export default function planColumns(layout) {
  const src = layout && typeof layout === 'object' ? layout : {};
  const seen = new Set();
  const plan = { rail: [], main: [], side: [] };

  // Pass 1: each known key lands in the column that claims it — global
  // first-occurrence-wins (scan order rail → main → side) resolves duplicates
  // both within and across arrays.
  for (const [name] of COLUMNS) {
    const arr = Array.isArray(src[name]) ? src[name] : [];
    for (const key of arr) {
      if (KNOWN.has(key) && !seen.has(key)) {
        seen.add(key);
        plan[name].push(key);
      }
    }
  }

  // Pass 2: append every unclaimed key to its HOME column in default order.
  for (const [name, defaults] of COLUMNS) {
    for (const key of defaults) {
      if (!seen.has(key)) plan[name].push(key);
    }
  }

  return plan;
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
cd /Users/zacharyzink/MSFG/worktrees/bdv21-borrower/frontend
CI=true npx react-scripts test --watchAll=false src/pages/statusCenter/planColumns.test.js
```

Expected: `Tests: 8 passed, 8 total`.

- [ ] **Step 5: Commit**

```bash
cd /Users/zacharyzink/MSFG/worktrees/bdv21-borrower
git add frontend/src/pages/statusCenter/planColumns.js \
        frontend/src/pages/statusCenter/planColumns.test.js
git commit -m "feat(status-center): planColumns helper for the v2.1 layout contract

- 14-key union semantics: any key in any column (console drags across columns)
- fallback / unknown-ignored / home-append / global-first-occurrence-wins
- exports RAIL_KEYS / MAIN_KEYS / SIDE_KEYS (home-column default orders)"
```

---

### Task 3: Layout-ordered grid rendering

**Files:**
- Modify: `frontend/src/pages/statusCenter/LoanStatusCenter.test.js` (4 new tests)
- Modify: `frontend/src/pages/statusCenter/LoanStatusCenter.js` (import, `renderSection` + `columnPlan`, grid block `:187-262`)

- [ ] **Step 1: Write the failing tests**

In `frontend/src/pages/statusCenter/LoanStatusCenter.test.js`, add these four tests inside the `describe` block, right after the `'single "Your loan team" card renders in the rail below the LO card; closing costs unchanged'` test (all use the `'Dana Lender'` anchor so they never touch milestone fixtures):

```js
  test('payload.layout reorders sections within each column', async () => {
    mortgageService.getBorrowerDashboard.mockResolvedValue({
      ...FULL_DASHBOARD,
      layout: {
        rail: ['notifications', 'contacts', 'loanOfficer', 'milestones'],
        main: ['downloads', 'cleared', 'dropzone', 'todo'],
        side: ['closingCosts', 'payment', 'snapshot', 'appraisal', 'keyDates', 'rateLock'],
      },
    });
    const { container } = renderPage();
    await screen.findByText('Dana Lender');

    const rail = [...container.querySelector('.lsc-rail-col').children];
    expect(rail[0].querySelector('h3')).toHaveTextContent('Notifications');
    expect(rail[1].querySelector('h3')).toHaveTextContent('Your loan team');
    expect(rail[2].querySelector('h3')).toHaveTextContent('Your loan officer');
    expect(rail[3].classList.contains('lsc-rail')).toBe(true); // StatusRail <ol> last

    const main = [...container.querySelector('.lsc-main-col').children];
    expect(main[0].querySelector('h3')).toHaveTextContent('Downloads');
    expect(main[1].querySelector('h3')).toHaveTextContent('Cleared items');
    expect(main[2]).toHaveTextContent('Drop your documents here'); // dropzone wrapper div
    expect(main[3].querySelector('h3')).toHaveTextContent('Your to-do list');

    const side = [...container.querySelector('.lsc-side-col').children];
    expect(side[0].querySelector('h3')).toHaveTextContent('Closing costs');
    expect(side[1].querySelector('h3')).toHaveTextContent('Estimated monthly payment');
    expect(side[2].querySelector('h3')).toHaveTextContent('Your loan at a glance');
    expect(side[3].querySelector('h3')).toHaveTextContent('Appraisal');
    expect(side[4].querySelector('h3')).toHaveTextContent('Key dates');
    expect(side[5].classList.contains('lsc-lockcard')).toBe(true); // RateLockCard (headerless)
  });

  test('layout: unknown keys are ignored and missing keys append in default order', async () => {
    mortgageService.getBorrowerDashboard.mockResolvedValue({
      ...FULL_DASHBOARD,
      layout: {
        rail: ['contacts', 'somethingNew'], // partial + unknown key
        main: ['downloads'],                // partial
        // side absent entirely → default side order
      },
    });
    const { container } = renderPage();
    await screen.findByText('Dana Lender');

    const rail = [...container.querySelector('.lsc-rail-col').children];
    expect(rail[0].querySelector('h3')).toHaveTextContent('Your loan team');
    expect(rail[1].classList.contains('lsc-rail')).toBe(true); // milestones appended first…
    expect(rail[2].querySelector('h3')).toHaveTextContent('Your loan officer');
    expect(rail[3].querySelector('h3')).toHaveTextContent('Notifications');

    const main = [...container.querySelector('.lsc-main-col').children];
    expect(main[0].querySelector('h3')).toHaveTextContent('Downloads');
    expect(main[1].querySelector('h3')).toHaveTextContent('Your to-do list');
    expect(main[2]).toHaveTextContent('Drop your documents here');
    expect(main[3].querySelector('h3')).toHaveTextContent('Cleared items');

    const side = [...container.querySelector('.lsc-side-col').children];
    expect(side[0].classList.contains('lsc-lockcard')).toBe(true); // default order intact
    expect(side[side.length - 1].querySelector('h3')).toHaveTextContent('Closing costs');
  });

  test('a section listed in the layout but hidden by the LO still renders nothing', async () => {
    mortgageService.getBorrowerDashboard.mockResolvedValue({
      ...FULL_DASHBOARD,
      contacts: null, // LO hid the loan-team card
      layout: { rail: ['contacts', 'loanOfficer', 'milestones', 'notifications'] },
    });
    const { container } = renderPage();
    await screen.findByText('Dana Lender');

    expect(screen.queryByText('Your loan team')).not.toBeInTheDocument();
    // loanOfficer leads the rail — the hidden contacts key contributed nothing.
    const rail = [...container.querySelector('.lsc-rail-col').children];
    expect(rail[0].querySelector('h3')).toHaveTextContent('Your loan officer');
  });

  test('cross-column placement: a key dragged to another column renders there', async () => {
    // Union contract: the console can drag any section across columns; the
    // API plan's ITs park rateLock in rail and expect 200 — the borrower app
    // must honor the persisted placement, not snap it back to its home column.
    mortgageService.getBorrowerDashboard.mockResolvedValue({
      ...FULL_DASHBOARD,
      layout: {
        rail: ['rateLock', 'milestones', 'loanOfficer', 'contacts', 'notifications'],
        main: ['todo', 'dropzone', 'cleared', 'downloads'],
        side: ['keyDates', 'appraisal', 'snapshot', 'payment', 'closingCosts'],
      },
    });
    const { container } = renderPage();
    await screen.findByText('Dana Lender');

    // RateLockCard now leads the RAIL — and is gone from the side column.
    const rail = container.querySelector('.lsc-rail-col');
    expect(rail.firstElementChild.classList.contains('lsc-lockcard')).toBe(true);
    expect(container.querySelector('.lsc-side-col .lsc-lockcard')).toBeNull();

    // The side column renders its remaining sections, in order, without rateLock.
    const sideHeadings = [...container.querySelectorAll('.lsc-side-col .lsc-card-h h3')].map((h) => h.textContent);
    expect(sideHeadings).toEqual([
      'Key dates', 'Appraisal', 'Your loan at a glance', 'Estimated monthly payment', 'Closing costs',
    ]);
  });
```

- [ ] **Step 2: Run to verify the 4 new tests fail**

```bash
cd /Users/zacharyzink/MSFG/worktrees/bdv21-borrower/frontend
CI=true npx react-scripts test --watchAll=false src/pages/statusCenter/LoanStatusCenter.test.js
```

Expected: `Tests: 4 failed, 20 passed, 24 total` — the container ignores `payload.layout`, so every column renders in the hardcoded default order (and `rateLock` snaps back to the side column).

- [ ] **Step 3: Implement layout-arranged rendering**

In `frontend/src/pages/statusCenter/LoanStatusCenter.js`:

**(a)** Add the import after the `groupLoans` import (line 5):

```js
import planColumns from './planColumns';
```

**(b)** After the `addressLine` derivation (the `const addressLine = ...` block ending at line 135), immediately before `return (`, add ONE renderer covering all 14 section keys plus the column plan. Any key can land in any column (union contract), so no column owns a switch. Each case returns `null` when the LO hid the section (same gating expressions the JSX used) — **hiding beats ordering**; unknown keys never reach the switch because `planColumns` filters them:

```js
  // v2.1 layout contract: one renderer for all 14 section keys, gated exactly
  // like the old inline blocks — a null/absent payload field means the LO hid
  // the section, so its key renders nothing no matter which column the layout
  // puts it in.
  const renderSection = (key) => {
    switch (key) {
      case 'milestones':
        return payload?.milestones != null
          ? <StatusRail key="milestones" milestones={payload.milestones} />
          : null;
      case 'loanOfficer':
        return payload?.loanOfficer != null
          ? <LoanOfficerCard key="loanOfficer" loanOfficer={payload.loanOfficer} />
          : null;
      case 'contacts':
        return payload?.contacts != null
          ? <ContactCards key="contacts" contacts={payload.contacts} />
          : null;
      case 'notifications':
        return payload?.notificationPrefs != null
          ? (
            <NotificationsCard
              key="notifications"
              prefs={payload.notificationPrefs}
              suiteLoanId={selectedId}
              onSaved={refetch}
            />
          )
          : null;
      case 'todo':
        return payload?.conditions != null
          ? (
            <TodoList
              key="todo"
              conditions={payload.conditions}
              onUploadForCondition={focusDropzone}
            />
          )
          : null;
      case 'dropzone':
        return payload?.documents?.uploads != null
          ? (
            <div key="dropzone" ref={dropzoneRef}>
              <UploadDropzone suiteLoanId={selectedId} onUploaded={refetch} />
            </div>
          )
          : null;
      case 'cleared':
        return payload?.conditions != null
          ? <ClearedItems key="cleared" conditions={payload.conditions} />
          : null;
      case 'downloads':
        return payload?.documents?.fromTeam != null
          ? (
            <DownloadsCard
              key="downloads"
              fromTeam={payload.documents.fromTeam}
              suiteLoanId={selectedId}
            />
          )
          : null;
      case 'rateLock':
        return payload?.rateLock != null
          ? <RateLockCard key="rateLock" rateLock={payload.rateLock} />
          : null;
      case 'keyDates':
        return payload?.keyDates != null
          ? (
            <KeyDatesCard
              key="keyDates"
              keyDates={payload.keyDates}
              onOpenCalendar={() => setCalendarOpen(true)}
            />
          )
          : null;
      case 'appraisal':
        return payload?.visibility?.showAppraisal
          ? (
            <AppraisalCard
              key="appraisal"
              keyDates={payload.keyDates || []}
              purchasePrice={payload.loanSnapshot?.purchasePrice}
            />
          )
          : null;
      case 'snapshot':
        return payload?.loanSnapshot != null
          ? <SnapshotCard key="snapshot" loanSnapshot={payload.loanSnapshot} />
          : null;
      case 'payment':
        return payload?.payment != null
          ? <PaymentCard key="payment" payment={payload.payment} />
          : null;
      case 'closingCosts':
        return payload?.closingCosts != null
          ? <ClosingCostsCard key="closingCosts" closingCosts={payload.closingCosts} />
          : null;
      default:
        return null;
    }
  };

  // Column plan: layout-claimed keys render in the column that claims them
  // (cross-column drags honored); unclaimed keys append to their home column
  // in default order. Absent/malformed layout → the default arrangement.
  const columnPlan = planColumns(payload?.layout);
```

**(c)** Replace the entire grid block — from `<div className="lsc-grid">` (line 187) through its closing `</div>` (line 262, just before the `)}` that closes the `loading ?` ternary) — with:

```jsx
        <div className="lsc-grid">
          {/*
            Each section renders ONLY when its gating payload field is non-null;
            a null/absent field means the LO hid that section (server-visibility
            contract). visibility{} is always present and gates the appraisal
            card, which has no own payload field.

            v2.1: section ARRANGEMENT (column + order) comes from payload.layout
            (the LO's saved drag-to-arrange; union contract — any key in any
            column) via planColumns — absent layout falls back to the default
            arrangement, unknown keys are ignored, cross-array duplicates
            resolve global-first-occurrence-wins, unclaimed keys append to
            their home column in default order. Hiding beats ordering.
          */}
          <aside className="lsc-rail-col">
            {columnPlan.rail.map(renderSection)}
          </aside>

          <main className="lsc-main-col">
            {columnPlan.main.map(renderSection)}
          </main>

          <aside className="lsc-side-col">
            {columnPlan.side.map(renderSection)}
          </aside>
        </div>
```

- [ ] **Step 4: Run the container tests to verify green**

```bash
cd /Users/zacharyzink/MSFG/worktrees/bdv21-borrower/frontend
CI=true npx react-scripts test --watchAll=false src/pages/statusCenter/LoanStatusCenter.test.js
```

Expected: `Tests: 24 passed, 24 total` (the 20 pre-existing tests prove the default arrangement and every LO-hid behavior are unchanged).

- [ ] **Step 5: Run the whole statusCenter scope**

```bash
cd /Users/zacharyzink/MSFG/worktrees/bdv21-borrower/frontend
CI=true npx react-scripts test --watchAll=false src/pages/statusCenter
```

Expected: `Test Suites: 19 passed, 19 total`, `Tests: 118 passed, 118 total`.

- [ ] **Step 6: Commit**

```bash
cd /Users/zacharyzink/MSFG/worktrees/bdv21-borrower
git add frontend/src/pages/statusCenter/LoanStatusCenter.js \
        frontend/src/pages/statusCenter/LoanStatusCenter.test.js
git commit -m "feat(status-center): arrange grid sections per payload.layout

- one 14-key renderSection + planColumns (union contract: any key, any column)
- cross-column drags honored; unknown ignored; unclaimed keys append to home
- hiding beats ordering (LO-hid sections render nothing regardless)"
```

---

### Task 4: Property-photo thumbnail strip + hero swap

**Files:**
- Modify: `frontend/src/pages/statusCenter/LoanStatusCenter.test.js` (`PHOTOS` fixture + 5 new tests)
- Modify: `frontend/src/pages/statusCenter/LoanStatusCenter.js` (state, fetch-effect reset, photo derivation, strip JSX)
- Modify: `frontend/src/pages/statusCenter/LoanStatusCenter.css` (append strip block at end)

- [ ] **Step 1: Write the failing tests**

In `frontend/src/pages/statusCenter/LoanStatusCenter.test.js`, add below the `FULL_DASHBOARD` const:

```js
// v2.1 multi-photo contract: ordered presigned GETs, no null elements
// (the server skips failed presigns); property.photoUrl = first element.
const PHOTOS = [
  'https://s3.example.com/prop-photo.jpg?X-Amz-Signature=abc',
  'https://s3.example.com/prop-back.jpg?X-Amz-Signature=def',
  'https://s3.example.com/prop-kitchen.jpg?X-Amz-Signature=ghi',
];
```

Then add these five tests inside the `describe` block, right after the `'no property.photoUrl → flat forest hero, no photo layer'` test:

```js
  test('photoUrls with >1 entries renders the thumbnail strip; hero shows the first photo', async () => {
    mortgageService.getBorrowerDashboard.mockResolvedValue({
      ...FULL_DASHBOARD,
      property: { ...FULL_DASHBOARD.property, photoUrls: PHOTOS },
    });
    const { container } = renderPage();
    await screen.findByText('Dana Lender');

    const thumbs = screen.getAllByRole('button', { name: /show photo \d of 3/i });
    expect(thumbs).toHaveLength(3);
    expect(thumbs[0].className).toContain('is-active');
    expect(thumbs[0]).toHaveAttribute('aria-pressed', 'true');
    expect(thumbs[1]).toHaveAttribute('aria-pressed', 'false');
    expect(container.querySelector('.lsc-hero-photo').getAttribute('style')).toContain('prop-photo.jpg');
  });

  test('clicking a thumbnail swaps it into the hero (client-side only, no refetch)', async () => {
    mortgageService.getBorrowerDashboard.mockResolvedValue({
      ...FULL_DASHBOARD,
      property: { ...FULL_DASHBOARD.property, photoUrls: PHOTOS },
    });
    const { container } = renderPage();
    await screen.findByText('Dana Lender');
    const callsBefore = mortgageService.getBorrowerDashboard.mock.calls.length;

    fireEvent.click(screen.getByRole('button', { name: /show photo 2 of 3/i }));

    expect(container.querySelector('.lsc-hero-photo').getAttribute('style')).toContain('prop-back.jpg');
    const thumbs = screen.getAllByRole('button', { name: /show photo \d of 3/i });
    expect(thumbs[1].className).toContain('is-active');
    expect(thumbs[0].className).not.toContain('is-active');
    expect(mortgageService.getBorrowerDashboard.mock.calls.length).toBe(callsBefore);
  });

  test('photoUrls-only payload with ONE photo: hero renders, no strip', async () => {
    // No legacy photoUrl at all — pins the new derivation, not the v2 fallback.
    const propNoLegacy = { ...FULL_DASHBOARD.property, photoUrls: [PHOTOS[0]] };
    delete propNoLegacy.photoUrl;
    mortgageService.getBorrowerDashboard.mockResolvedValue({
      ...FULL_DASHBOARD,
      property: propNoLegacy,
    });
    const { container } = renderPage();
    await screen.findByText('Dana Lender');

    expect(container.querySelector('.lsc-photo-strip')).toBeNull();
    const hero = container.querySelector('.lsc-hero');
    expect(hero.classList.contains('lsc-hero--photo')).toBe(true);
    expect(container.querySelector('.lsc-hero-photo').getAttribute('style')).toContain('prop-photo.jpg');
  });

  test('no photoUrls: legacy property.photoUrl still drives the hero, no strip (back-compat)', async () => {
    // FULL_DASHBOARD.property has photoUrl but NO photoUrls — the pre-v2.1 shape.
    mortgageService.getBorrowerDashboard.mockResolvedValue(FULL_DASHBOARD);
    const { container } = renderPage();
    await screen.findByText('Dana Lender');

    expect(container.querySelector('.lsc-photo-strip')).toBeNull();
    expect(container.querySelector('.lsc-hero-photo').getAttribute('style')).toContain('prop-photo.jpg');
  });

  test('switching loans resets the hero to the new loan\'s first photo', async () => {
    mortgageService.getApplications.mockResolvedValue({ content: [ACTIVE_LOAN, PAST_LOAN] });
    mortgageService.getBorrowerDashboard.mockImplementation(async (id) => (
      id === 'suite-1'
        ? { ...FULL_DASHBOARD, property: { ...FULL_DASHBOARD.property, photoUrls: PHOTOS } }
        : { ...FULL_DASHBOARD, property: { ...FULL_DASHBOARD.property, photoUrls: [PHOTOS[2], PHOTOS[1]] } }
    ));
    const { container } = renderPage();
    const select = await screen.findByRole('combobox');
    await screen.findByText('Dana Lender');

    fireEvent.click(screen.getByRole('button', { name: /show photo 2 of 3/i }));
    expect(container.querySelector('.lsc-hero-photo').getAttribute('style')).toContain('prop-back.jpg');

    fireEvent.change(select, { target: { value: 'suite-2' } });
    await waitFor(() =>
      expect(container.querySelector('.lsc-hero-photo').getAttribute('style')).toContain('prop-kitchen.jpg'),
    );
    expect(screen.getAllByRole('button', { name: /show photo \d of 2/i })[0].className).toContain('is-active');
  });
```

- [ ] **Step 2: Run to verify the right failures**

```bash
cd /Users/zacharyzink/MSFG/worktrees/bdv21-borrower/frontend
CI=true npx react-scripts test --watchAll=false src/pages/statusCenter/LoanStatusCenter.test.js
```

Expected: `Tests: 4 failed, 25 passed, 29 total` — the strip/thumb/swap/reset tests and the photoUrls-only test fail (no strip exists; the hero ignores `photoUrls`). The legacy back-compat test passes both before and after (deliberate pin-down).

- [ ] **Step 3: Implement the strip**

In `frontend/src/pages/statusCenter/LoanStatusCenter.js`:

**(a)** Add state after `calendarOpen` (line 39):

```js
  const [heroIdx, setHeroIdx] = useState(0); // thumbnail-strip selection (v2.1)
```

**(b)** In the payload fetch effect's success branch (lines 100-103), add the reset so a new loan/payload always leads with its first photo. Replace:

```js
      if (data) {
        setPayload(data);
        setError(null);
      } else {
```

with:

```js
      if (data) {
        setPayload(data);
        setHeroIdx(0); // new payload → hero returns to the first photo
        setError(null);
      } else {
```

**(c)** Replace the photo derivation (lines 130-131):

```js
  const prop = payload?.property || null;
  const photoUrl = prop?.photoUrl || null;
```

with:

```js
  const prop = payload?.property || null;
  // v2.1 multi-photo: property.photoUrls (ordered presigned GETs, never
  // containing nulls — the server skips failed presigns) drives the hero and
  // the thumbnail strip; property.photoUrl (= first element; the only field on
  // pre-v2.1 payloads) remains the legacy fallback. heroIdx is clamped so a
  // stale index (payload refetch shrank the list) falls back to the first photo.
  const photoList = Array.isArray(prop?.photoUrls) && prop.photoUrls.length > 0
    ? prop.photoUrls
    : (prop?.photoUrl ? [prop.photoUrl] : []);
  const heroEffectiveIdx = photoList[heroIdx] != null ? heroIdx : 0;
  const photoUrl = photoList[heroEffectiveIdx] ?? null;
```

(Everything downstream — `lsc-hero--photo` class, the photo layer, jsdom-visible `url()` — keeps using `photoUrl`, so the single-photo hero markup is byte-identical.)

**(d)** Insert the strip immediately after the closing `</header>` tag (before the `{!loanId && loans && loans.length > 1 && (` selector block):

```jsx
      {photoList.length > 1 && (
        <div className="lsc-photo-strip" role="group" aria-label="Property photos">
          {photoList.map((url, i) => (
            <button
              key={`photo-${i}`}
              type="button"
              className={`lsc-photo-thumb${i === heroEffectiveIdx ? ' is-active' : ''}`}
              style={{ backgroundImage: `url("${url}")` }}
              aria-label={`Show photo ${i + 1} of ${photoList.length}`}
              aria-pressed={i === heroEffectiveIdx}
              onClick={() => setHeroIdx(i)}
            />
          ))}
        </div>
      )}
```

- [ ] **Step 4: Append the strip CSS**

At the very END of `frontend/src/pages/statusCenter/LoanStatusCenter.css` (after the Task 1 block):

```css
/* ---------- Borrower Dashboard v2.1: property photo thumbnail strip ---------- */
/* Renders under the hero only when the payload carries >1 photo; horizontal
 * scroll on overflow; the active thumb gets a green ring. Single-photo payloads
 * never render the strip — the hero stays byte-identical to v2. */
.lsc-photo-strip {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  max-width: 1400px;
  margin: 0 auto;
  padding: 14px 36px 0;
  -webkit-overflow-scrolling: touch;
}
.lsc-photo-thumb {
  flex: 0 0 auto;
  width: 84px;
  height: 56px;
  padding: 0;
  border-radius: 12px;
  border: 2px solid transparent;
  background-color: #DDE3DC;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  box-shadow: var(--shadow-sm);
}
.lsc-photo-thumb:hover { border-color: var(--sage); }
.lsc-photo-thumb.is-active {
  border-color: var(--green);
  box-shadow: 0 0 0 3px rgba(41, 194, 78, .25);
}
@media (max-width: 860px) {
  .lsc-photo-strip { padding: 12px 16px 0; }
}
```

(`.lsc-page button` already supplies `cursor: pointer` + `font-family: inherit`.)

- [ ] **Step 5: Run the container tests to verify green**

```bash
cd /Users/zacharyzink/MSFG/worktrees/bdv21-borrower/frontend
CI=true npx react-scripts test --watchAll=false src/pages/statusCenter/LoanStatusCenter.test.js
```

Expected: `Tests: 29 passed, 29 total` — including the two untouched v2 hero tests (`'property.photoUrl renders the hero photo banner layer'`, `'no property.photoUrl → flat forest hero'`), which prove single-/no-photo behavior is unchanged.

- [ ] **Step 6: Run the whole statusCenter scope**

```bash
cd /Users/zacharyzink/MSFG/worktrees/bdv21-borrower/frontend
CI=true npx react-scripts test --watchAll=false src/pages/statusCenter
```

Expected: `Test Suites: 19 passed, 19 total`, `Tests: 123 passed, 123 total`.

- [ ] **Step 7: Commit**

```bash
cd /Users/zacharyzink/MSFG/worktrees/bdv21-borrower
git add frontend/src/pages/statusCenter/LoanStatusCenter.js \
        frontend/src/pages/statusCenter/LoanStatusCenter.test.js \
        frontend/src/pages/statusCenter/LoanStatusCenter.css
git commit -m "feat(status-center): property-photo thumbnail strip with hero swap

- payload.property.photoUrls drives hero + strip; legacy photoUrl fallback
- strip only when >1 photo; click swaps hero client-side (no refetch)
- hero index resets per payload; stale index clamps to first photo"
```

---

### Task 5: Milestone fixture re-sync to the 8 Kanban lanes

**Files:**
- Modify: `frontend/src/pages/statusCenter/sections/StatusRail.test.jsx` (full rewrite, 3 → 5 tests)
- Modify: `frontend/src/pages/statusCenter/sections/StatusRail.jsx` (header comment only)
- Modify: `frontend/src/pages/statusCenter/LoanStatusCenter.test.js` (`FULL_DASHBOARD.milestones`, wait-anchors, 1 new test)

- [ ] **Step 1: Rewrite the StatusRail test file to the wire contract**

Replace the entire contents of `frontend/src/pages/statusCenter/sections/StatusRail.test.jsx` with:

```jsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import StatusRail from './StatusRail';

// v2.1 wire contract: milestones = the 8 pipeline Kanban lanes in board order
// (INACTIVE is never a step). key = KanbanLane.name(), label = lane label().
const MILESTONES = [
  { key: 'PRE_APPROVAL', label: 'Pre-Approval', state: 'DONE', date: '2026-04-20' },
  { key: 'APPLICATION', label: 'Application', state: 'DONE', date: '2026-05-01' },
  { key: 'PROCESSING', label: 'Processing', state: 'DONE', date: '2026-05-20' },
  { key: 'UNDERWRITING', label: 'Underwriting', state: 'CURRENT', date: null },
  { key: 'CONDITIONAL_APPROVAL', label: 'Conditional Approval', state: 'UPCOMING', date: null },
  { key: 'CLEAR_TO_CLOSE', label: 'Clear to Close', state: 'UPCOMING', date: null },
  { key: 'CLOSED', label: 'Closed', state: 'UPCOMING', date: null },
  { key: 'FUNDED', label: 'Funded', state: 'UPCOMING', date: null },
];

test('renders all 8 lane milestones as list items, in payload order', () => {
  render(<StatusRail milestones={MILESTONES} />);
  const items = screen.getAllByRole('listitem');
  expect(items).toHaveLength(8);
  expect(items.map((li) => li.querySelector('.lsc-rl-label').textContent)).toEqual([
    'Pre-Approval', 'Application', 'Processing', 'Underwriting',
    'Conditional Approval', 'Clear to Close', 'Closed', 'Funded',
  ]);
});

test('renders exactly as many entries as the payload sends (no hardcoded count)', () => {
  render(<StatusRail milestones={MILESTONES.slice(0, 3)} />);
  expect(screen.getAllByRole('listitem')).toHaveLength(3);
});

test('marks done and current nodes with state classes', () => {
  render(<StatusRail milestones={MILESTONES} />);
  expect(screen.getByText('Application').closest('li')).toHaveClass('done');
  expect(screen.getByText('Underwriting').closest('li')).toHaveClass('current');
});

test('done milestone shows its date; a null-date DONE shows "Completed"; no literal null', () => {
  const withNullDate = [
    { key: 'PRE_APPROVAL', label: 'Pre-Approval', state: 'DONE', date: null },
    ...MILESTONES.slice(1),
  ];
  render(<StatusRail milestones={withNullDate} />);
  // DONE with a history-derived date renders it (UTC-safe — no off-by-one)
  expect(screen.getByText(/May 1, 2026|May 01, 2026/)).toBeInTheDocument();
  // DONE with no lane-history date renders the "Completed" fallback, never "null"
  expect(screen.getByText('Completed')).toBeInTheDocument();
  expect(screen.queryByText('null')).not.toBeInTheDocument();
});

test('all-UPCOMING/no-CURRENT rail (INACTIVE effective lane) renders without a current node', () => {
  const inactive = MILESTONES.map((m) => ({ ...m, state: m.state === 'CURRENT' ? 'UPCOMING' : m.state }));
  const { container } = render(<StatusRail milestones={inactive} />);
  expect(container.querySelectorAll('.lsc-rl.current')).toHaveLength(0);
  expect(container.querySelectorAll('.lsc-rl.done')).toHaveLength(3);
});
```

- [ ] **Step 2: Run it — expected to PASS (this step VERIFIES StatusRail is count-agnostic)**

```bash
cd /Users/zacharyzink/MSFG/worktrees/bdv21-borrower/frontend
CI=true npx react-scripts test --watchAll=false src/pages/statusCenter/sections/StatusRail.test.jsx
```

Expected: `Tests: 5 passed, 5 total`. `StatusRail.jsx` maps `Array.isArray(milestones) ? milestones : []` with no hardcoded count, so 8 (or any N) entries render generically. **If anything fails here, STOP — that's a real component bug this plan expects not to exist; investigate before proceeding.**

- [ ] **Step 3: Update the stale StatusRail comment**

In `frontend/src/pages/statusCenter/sections/StatusRail.jsx`, replace the header comment (lines 3-10):

```js
/*
 * StatusRail — the left-rail milestone timeline for the Loan Status Center.
 * Ported from the "status rail" (.railcard/.rail/.rl) block of
 * docs/design/loan-status-center/MSFG Loan Status Center.html, rendered as a
 * semantic <ol>/<li>. The container passes the borrower dashboard's
 * `milestones`: exactly 6 { key, label, state, date } where
 * state ∈ {"DONE","CURRENT","UPCOMING"} and date is an ISO date string or null.
 */
```

with:

```js
/*
 * StatusRail — the left-rail milestone timeline for the Loan Status Center.
 * Ported from the "status rail" (.railcard/.rail/.rl) block of
 * docs/design/loan-status-center/MSFG Loan Status Center.html, rendered as a
 * semantic <ol>/<li>. The container passes the borrower dashboard's
 * `milestones`: since v2.1 the 8 pipeline Kanban lanes in board order (key is
 * the lane enum name, e.g. "PRE_APPROVAL"; label is the lane label, e.g.
 * "Pre-Approval") as { key, label, state, date } where state ∈
 * {"DONE","CURRENT","UPCOMING"} and date is an ISO date string or null. The
 * component renders whatever list arrives — no hardcoded count. An INACTIVE
 * effective lane arrives as a rail with no CURRENT entry.
 */
```

- [ ] **Step 4: Re-sync the container fixture and add the rail-order test**

In `frontend/src/pages/statusCenter/LoanStatusCenter.test.js`:

**(a)** Replace the `milestones` array inside `FULL_DASHBOARD` (originally lines 47-51):

```js
  milestones: [
    { key: 'APPLICATION', label: 'Application received', state: 'DONE', date: '2026-05-01' },
    { key: 'PROCESSING', label: 'In processing', state: 'CURRENT', date: null },
    { key: 'CLEAR_TO_CLOSE', label: 'Clear to close', state: 'UPCOMING', date: null },
  ],
```

with (CURRENT = UNDERWRITING, coherent with the fixture's `status: 'IN_UNDERWRITING'`):

```js
  // v2.1: the 8 pipeline Kanban lanes in board order (key = KanbanLane.name(),
  // label = lane label()); CURRENT matches this fixture's IN_UNDERWRITING status.
  milestones: [
    { key: 'PRE_APPROVAL', label: 'Pre-Approval', state: 'DONE', date: '2026-04-20' },
    { key: 'APPLICATION', label: 'Application', state: 'DONE', date: '2026-05-01' },
    { key: 'PROCESSING', label: 'Processing', state: 'DONE', date: '2026-05-20' },
    { key: 'UNDERWRITING', label: 'Underwriting', state: 'CURRENT', date: null },
    { key: 'CONDITIONAL_APPROVAL', label: 'Conditional Approval', state: 'UPCOMING', date: null },
    { key: 'CLEAR_TO_CLOSE', label: 'Clear to Close', state: 'UPCOMING', date: null },
    { key: 'CLOSED', label: 'Closed', state: 'UPCOMING', date: null },
    { key: 'FUNDED', label: 'Funded', state: 'UPCOMING', date: null },
  ],
```

**(b)** Re-point every remaining wait-anchor. Find them:

```bash
cd /Users/zacharyzink/MSFG/worktrees/bdv21-borrower
grep -n "In processing" frontend/src/pages/statusCenter/LoanStatusCenter.test.js
```

Expected: 7 hits, all of the form `screen.findByText('In processing')` (originally lines 217, 253, 277, 299, 341, 356, 371 at `b00b68c` — numbers will have drifted after Tasks 1-4, and the original line-306 hit is gone because Task 1 rewrote that test onto the `'Dana Lender'` anchor; trust the grep). Replace each with `screen.findByText('Underwriting')`. (`humanizeStatus` renders the status pill as `"In underwriting"` — a different exact string — so `findByText('Underwriting')` uniquely matches the rail label.) After the edit, `grep -c "In processing" frontend/src/pages/statusCenter/LoanStatusCenter.test.js` must print `0` (step (a) already removed the fixture-label hit).

**(c)** Add a new test right after the `'full payload: a representative element from every column renders'` test:

```js
  test('milestone rail renders all 8 pipeline lanes in board order', async () => {
    mortgageService.getBorrowerDashboard.mockResolvedValue(FULL_DASHBOARD);
    const { container } = renderPage();
    await screen.findByText('Dana Lender');

    const labels = [...container.querySelectorAll('.lsc-rail .lsc-rl-label')].map((el) => el.textContent);
    expect(labels).toEqual([
      'Pre-Approval', 'Application', 'Processing', 'Underwriting',
      'Conditional Approval', 'Clear to Close', 'Closed', 'Funded',
    ]);
    expect(container.querySelector('.lsc-rl.current .lsc-rl-label')).toHaveTextContent('Underwriting');
  });
```

- [ ] **Step 5: Run the container tests to verify green**

```bash
cd /Users/zacharyzink/MSFG/worktrees/bdv21-borrower/frontend
CI=true npx react-scripts test --watchAll=false src/pages/statusCenter/LoanStatusCenter.test.js
```

Expected: `Tests: 30 passed, 30 total`.

- [ ] **Step 6: Run the whole statusCenter scope**

```bash
cd /Users/zacharyzink/MSFG/worktrees/bdv21-borrower/frontend
CI=true npx react-scripts test --watchAll=false src/pages/statusCenter
```

Expected: `Test Suites: 19 passed, 19 total`, `Tests: 126 passed, 126 total`.

- [ ] **Step 7: Commit**

```bash
cd /Users/zacharyzink/MSFG/worktrees/bdv21-borrower
git add frontend/src/pages/statusCenter/sections/StatusRail.jsx \
        frontend/src/pages/statusCenter/sections/StatusRail.test.jsx \
        frontend/src/pages/statusCenter/LoanStatusCenter.test.js
git commit -m "test(status-center): re-sync milestone fixtures to the 8 Kanban lanes

- key = KanbanLane.name(), label = lane label() per the v2.1 wire contract
- pin StatusRail as count-agnostic + INACTIVE (no-CURRENT) posture
- container fixture: 8 lanes, CURRENT=Underwriting; anchors re-pointed"
```

---

### Task 6: Full verification sweep

**Files:** none (verification only)

- [ ] **Step 1: Run the whole statusCenter scope**

```bash
cd /Users/zacharyzink/MSFG/worktrees/bdv21-borrower/frontend
CI=true npx react-scripts test --watchAll=false src/pages/statusCenter
```

Expected: `Test Suites: 19 passed, 19 total` (baseline 18 + planColumns), `Tests: 126 passed, 126 total` (baseline 105 + 1 ContactCards + 8 planColumns + 4 layout + 5 photos + 2 StatusRail + 1 rail-order). Requirement: zero failures.

- [ ] **Step 2: Run the full frontend test suite**

```bash
cd /Users/zacharyzink/MSFG/worktrees/bdv21-borrower/frontend
CI=true npx react-scripts test --watchAll=false
```

Expected: `Test Suites: 70 passed, 70 total`, `Tests: 639 passed, 639 total` (baseline 69/618 + this plan's 1 suite/21 tests). If anything fails OUTSIDE `src/pages/statusCenter`, compare against `main` (`git stash && CI=true npx react-scripts test --watchAll=false <failing path>` then `git stash pop`) — pre-existing failures are out of scope; do not "fix" unrelated suites on this branch.

- [ ] **Step 3: Production build sanity check**

```bash
cd /Users/zacharyzink/MSFG/worktrees/bdv21-borrower/frontend
npm run build
```

Expected: build succeeds — output ends with "The build folder is ready to be deployed." (pre-existing lint warnings are fine; new errors are not). `frontend/build/` is gitignored — never stage it.

- [ ] **Step 4: Verify the branch is clean and reviewable**

```bash
cd /Users/zacharyzink/MSFG/worktrees/bdv21-borrower
git log --oneline main..feat/borrower-dashboard-v2.1
git status --short
```

Expected: 5 commits (Tasks 1-5). `git status --short` shows only the untracked plan doc (`?? docs/superpowers/plans/2026-07-26-borrower-dashboard-v2.1-borrower-app.md`) — leave it untracked (v2 convention), and **never** stage `frontend/package-lock.json` if it appears modified.

---

## Manual verification

The borrower app renders whatever the payload sends, so full E2E needs the v2.1 API (Part 1 plan) running; everything below the first bullet is deferred until that branch is up.

1. **Back-compat against the CURRENT (v2) API — do this now.** `cd /Users/zacharyzink/MSFG/worktrees/bdv21-borrower/frontend && npm start`, log in as a borrower, open `/dashboard`. The payload has no `layout`, no `photoUrls`, 6-ish status-keyed milestones — verify the page renders exactly as v2 did: default section order in all three columns, single-photo (or flat forest) hero, no thumbnail strip, and the ONE visible difference: contacts now appear as a single "Your loan team" card under the LO card with per-contact eyebrows.
2. **With the v2.1 API branch running:** save a custom section order in the console control page → borrower `/dashboard` reflects it per column; upload 3 property photos → strip renders under the hero, clicking a thumb swaps the hero instantly (no network call), first photo leads after a loan switch; move the loan's Kanban lane → the rail shows 8 lanes with the moved lane CURRENT; drag the lane to Inactive/Hold → no lane is CURRENT, DONEs keep their dates.
3. **Responsive:** narrow to <1180px (rail becomes the horizontal stepper — 8 nodes must fit; sub-lines are hidden at this width by the existing `.lsc-rl-sub { display: none; }`) and <860px (single column; columns concatenate rail→main→side; the strip scrolls horizontally with edge padding 16px).
4. **Accessibility spot-check:** thumbnails are real `<button>`s — Tab reaches them, `aria-pressed` tracks the active one, Enter/Space swaps the hero.
5. Dev-mode photo caveat carried over from v2: the local storage driver serves authed URLs a naked CSS `background-image` can't fetch, so real images only display against S3-presigned URLs (prod/staging); the flat forest hero in dev is expected.
