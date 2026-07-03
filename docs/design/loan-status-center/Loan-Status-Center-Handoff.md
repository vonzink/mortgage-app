# Handoff: MSFG Borrower Loan Status Center

## ⚠️ Scope & non-negotiables

Build a new **borrower-facing Loan Status Center page** in the existing mortgage-app frontend
(React CRA + plain CSS, `react-hook-form`, `react-dropzone`, `react-icons` already installed —
**no new dependencies**). This page is additive: do not modify existing application-form pages,
routing behavior, autosave, or auth beyond adding the new route.

Follow the same MSFG brand system as `MSFG-Frontend-Restyle-Handoff.md` (same tokens). The
hifi visual source of truth is **`MSFG Loan Status Center.html`** in this bundle — open it in a
browser and match it. All colors/spacing/radii below are taken from it.

## Design tokens (same as app restyle)
`--forest:#0E3B2C · --forest-deep:#0A2C20 · --green:#29C24E · --green-hover:#22A843 ·
--mint:#82E2A6 · --sage:#9FBCAC · --cream:#F5F4ED · --ink:#10271E · --ink-soft:#516A5C ·
--line:#E5E8E2 · --field-line:#D9DDD5 · --amber:#E8A13C (outstanding) · --amber-bg:#FBF3E4`
Font: Plus Jakarta Sans (400–800). Cards: white, radius 20px, border `--line`,
shadow `0 1px 2px rgba(16,39,30,.06), 0 4px 16px -8px rgba(16,39,30,.10)`.

## Page structure
- **Top bar** (`--forest-deep`, 56px): MSFG logo on white chip, "BORROWER PORTAL", avatar + name.
- **Hero band** (`--forest` + ring texture): eyebrow "LOAN #… · FHA 30-YEAR FIXED · 5.990%",
  mint H1 "Loan status center", address + est. closing sub-line, green pill "Upload documents ›".
- **Three columns** (max 1400px): `290px rail | flexible main | 330px sidebar`, gap 22px.

### Left rail — status ("Where you are")
Dark `--forest` card, vertical timeline of 6 milestones: Application → Processing → Underwriting
→ Conditional approval → Clear to close → Closing. Done = green check node + green connector;
current = mint node with glow; upcoming = translucent. Each has a date/status sub-line.
Drive from real loan-milestone data.

### Main column
1. **Your to-do list** (outstanding conditions): rows with amber icon chip, condition title +
   requester/due sub-line, "Needed" amber tag, "Upload" pill button. Conditions already submitted
   show blue "In review" tag (no button).
2. **Dropzone — dark hero style** (bottom of the to-do card): `--forest` panel, radius 16,
   inset 2px-dashed mint border (`rgba(130,226,166,.4)`), centered green circular ⇪ icon with glow,
   white "Drop your documents here", sage sub-line, ghost "or browse your files" pill.
   Wire with **react-dropzone**; on dragover add a solid green outline. Files route to the
   condition-matching flow the backend provides (or a generic upload endpoint for now).
3. **Cleared items**: same row anatomy, green check chips + "Cleared" tags + cleared dates.
4. **Document history**: chronological file rows — filetype chip (PDF/JPG), filename (ellipsize),
   "condition · uploaded date" sub-line, status tag (In review / Cleared).

### Right sidebar (top → bottom)
1. **Rate lock countdown** — dark `--forest` card: 74px SVG progress ring (track
   `rgba(255,255,255,.14)`, green arc = fraction of lock period remaining), center "17 / DAYS LEFT";
   right side "Rate lock active", "5.990% · locked Jun 19", "Expires Jul 19 · 30-day lock".
   Compute days from real lock data. **Urgency**: ≤5 days → arc & label switch to amber.
2. **Key dates** — date-chip rows (day number + month) for: conditions due, appraisal inspection,
   rate-lock expiry (highlighted: forest chip, mint text), estimated closing. Below: full-width
   outline button **"Open calendar"**.
3. **Appraisal** — 4-segment progress bar (Ordered → Scheduled → Inspected → Report) with the
   completed segments green; rows for ordered date, inspection date/time, purchase price
   ($675,000.00), appraised value ("Pending" until received).
4. **Your loan at a glance** — key/value rows: Program, Note rate, Purchase price, Base loan,
   Up-front MIP financed, **Total loan amount (highlighted row `#F4F7F3`)**, Est. cash to close.
5. **Estimated monthly payment** — P&I, taxes, insurance, MI, HOA, **Total /mo highlighted**.
6. **Loan officer contact** — 52px round initials avatar (forest bg, mint text), name,
   "Senior Loan Officer · NMLS #", phone + email rows with small green icon chips,
   full-width green pill "Message {name}".
7. **Notifications** — three rows (Condition updates / Status changes / Key-date reminders),
   each with Email/SMS choice chips (selected = forest bg, mint text) + a toggle switch
   (44×26, green when on). Persist to user preferences.

### Calendar modal (popup)
- Trigger: "Open calendar". Overlay `rgba(10,44,32,.55)` + slight blur; card 460px, radius 22.
- Header: `--forest`, mint month title, ‹ › month nav, ✕ close. Esc and backdrop-click close it.
- 7-col day grid; event days get `#EAF7EE` pill + green dot; **urgent** events (conditions due,
  rate-lock expiry) get forest bg + mint text. Below the grid, a list of that month's events
  (dot + title + date), urgent dot = amber.
- Events to plot (from loan data): application, processing complete, rate locked, appraisal
  ordered, conditions due, appraisal inspection, rate-lock expiry, estimated closing.

## Responsive (required)
- **≤1180px**: sidebar keeps its column; the status rail moves above the main column full-width
  and becomes a **horizontal stepper** (nodes + connecting bar, labels under nodes, sub-lines hidden).
- **≤860px**: single column, order = rail → to-do/dropzone → cleared → history → sidebar cards;
  hero CTA goes full-width; calendar modal becomes **full-screen**; hide username in top bar;
  condition rows wrap. All touch targets ≥44px.

## Data notes
Every number in the reference (rates, amounts, dates, names) is sample data from the LOS —
bind to real loan/condition/document/appraisal/lock endpoints. Don't hardcode.

## Reference files in this bundle
- `MSFG Loan Status Center.html` — hifi source of truth (interactive: modal, toggles, dropzone hover).
- `MSFG-Frontend-Restyle-Handoff.md` / `README.md` — shared brand tokens & app-header restyle spec.
