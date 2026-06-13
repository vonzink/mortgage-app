# MSFG App Brand Restyle — Design Spec

**Date:** 2026-06-13
**Branch:** `feat/msfg-brand-restyle`
**Status:** Approved design, pending spec review → implementation plan

## 1. Goal & constraints

Restyle the entire `frontend/` (the mortgage origination app, served at `app.msfgco.com`) so its look & feel matches the **new MSFG primary website at `staging.msfg.us`** (the green, Hanken-Grotesk design — *not* the old `msfg.us` site).

- **Scope:** whole app — every route, including login/landing, the 1003 form, loan dashboard, pipeline, and admin.
- **Fidelity:** brand-aligned — same palette, font, buttons, cards, radii, spacing, and overall feel, applied to the app's *existing layouts*. No layout rebuilds.
- **Functionality:** unchanged. This is CSS/visual only — colors, fonts, shadows, borders, and the removal of decorative animations. No JS logic, routing, data, or API changes.
- **Primary-button decision (A):** primary actions use the **vibrant spring green** `#1fb463` with **ink `#0b231c` text** and the signature 3D "lip" press — closest to the marketing site.

### Approved calls (this session)
1. **Remove all decorative FX** — animated parchment background, floating orbs, glassmorphism (backdrop-blur), pulse/shimmer animations, gradient buttons. The new brand is flat & clean.
2. **Print/PDF export (`urlaHtmlExport.js`)** — light retheme: forest `#07271e` section headers, Hanken Grotesk w/ Arial fallback, keep black body text for print legibility.
3. **Font loading** — `@fontsource/hanken-grotesk` self-host (no external request, no FOUT).

## 2. Brand tokens (pulled live from staging.msfg.us — Next.js + Tailwind v4)

```
Font:    "Hanken Grotesk" (weights 400/500/600/700/800). Mono: ui-monospace stack.
Forest:  #07271e(900)  #0a3329(850)  #0b3d30(800)  #0e4a39(700)  #135e48(600)  #1d7a55(glow)
Spring:  #1fb463(spring)  #18a359(spring-2)  #34d17e(spring-3)  #7fe3a8(mint)  spring-soft #1fb46324
Neutral: ink #0b231c   paper #fbfbf7   paper-2 #f2f4ef   muted #5a6b61   line #e2e6dd   white #fff
On-dark: #ffffffeb (body)  #ffffff9e (muted)  #fff6 (faint)  hairline #ffffff1f
Radii:   6 / 9 / 12 / 16px  + 999px pills
Shadows: shadow-3d  0 2px 4px #07271e14, 0 8px 18px #07271e1a
         shadow-pop  0 12px 44px #07271e33
Button:  signature 3D — spring fill + ink text + green "lip" shadow 0 3px 0 #0c6b39 that
         presses on :active (shorten lip + translateY). Hover lifts to 0 5px 0 + shadow-pop.
```

## 3. Current state (audit findings)

Pure CSS with CSS custom properties (no Tailwind/styled-components). **Two token layers** that must be reconciled:

- **Legacy** `frontend/src/styles/base/variables.css` — green `#2c5f2d`, animated beige/parchment gradient bg, system font, radii 4/8/12/16. Loaded **last** (via `App.css` → `styles/index.css`).
- **Modern** `frontend/src/styles/design-system.css` — `.msfg`-scoped; forest `#0a2a20…#2a8268`, parchment surfaces, Geist font, copper/amber/rose/azure/moss accents, radii 6/10/14/20. Loaded **first** (via `index.css`).

**570 hardcoded color literals** across 29 files bypass the tokens and will *not* auto-retheme. The whole app is wrapped in `.App.msfg`, so the `.msfg` font/scope rules reach every screen.

## 4. Approach — 4-layer retheme

A token-only swap leaves the app half-converted (570 stale literals). Instead, four layers, each building on the last:

### Layer 1 — Foundation (re-themes ~60% via the cascade)
- Install & load Hanken Grotesk via `@fontsource` (see §7).
- Remap **both** token layers per the table in §5.
- **Reconcile colliding tokens:** `--radius-sm/-md/-lg/-xl` are defined in *both* files; legacy wins globally. Set both files to **6/9/12/16**. After remap, grep both files for any other duplicate `:root` var names and align.
- Retire global off-brand effects: animated gradient bg + floating orbs (`reset.css`); delete the two **dead** stylesheets (`layout/header.css`, `styles/pages/application-list.css`) and their `@import`s in `styles/index.css`.

### Layer 2 — Shared primitives
- **Signature button:** rewrite `.btn-primary`/`.btn-success`/`.btn-danger` in `components/buttons.css` *and* `.btn-primary` in `design-system.css` to flat spring `#1fb463` + **ink `#0b231c` text** + lip `0 3px 0 #0c6b39` that presses on `:active`. Danger → flat rose. Remove gradient fills + translateY lifts.
- **`components/shared/bubbleTabStyle.js`** (high-leverage — spread by all 3 form-step tabs): rewrite to spring-active (ink text, lip) + paper-2/muted inactive; drop the translateY lift + colored glow.
- **Centralize one status palette** used consistently by `loanDashboard.css`, `workspace.css`, `recommended-docs.css`, and `DocumentReviewPanel.jsx`: ok→spring/moss, warn→amber, danger→rose, info→azure (dark-text-on-tint pattern).
- **Fix off-brand `var(--x, #oldhex)` fallbacks** everywhere (blue `#2563eb`, grey `#6b7280/#d1d5db`, beige `#f6f4ee`) → brand values.
- **Standardize on-dark tokens** (`#ffffffeb` body / `#ffffff9e` muted / `#ffffff1f` hairline) across topbar, note-amount card, quote sidebar, feature-icon, `AuthControls`.

### Layer 3 — Heavy manual surfaces
Hardcoded sweeps + FX removal (see §6 hotlist & §8 removals): `workspace.css` (117), `main.css` stepper (55, strip glass/pulse → flat spring), `loanDashboard.css` (53, rebuild status pills + hand-edit the data-URI chevron `%23374151`→`%230b231c`), `application-form.css` (alerts/HMDA), `forms.css` (focus ring, num-stepper, data-URI chevron `%236b7280`→`%235a6b61`, strip glass), `document-upload.css`, `recommended-docs.css`, `FolderEvaluationCard.css`, `LoanSearch.css`. Convert the 3 form steps' `onMouseEnter/Leave` DOM-color mutations → CSS `:hover`.

### Layer 4 — Admin, edges, verification
- **Admin pages aren't on the design system** (inline styles): `AdminHome.js`, `DocumentTypesAdmin.js`, `FolderTemplatesAdmin.js`, `AppSettingsAdmin.js`. Extract a **shared tokenized admin stylesheet** (table/th/td/buttons/inputs/badges) and route all admin pages through it; convert `AdminHome`'s `onMouseEnter` blue-border mutation to CSS.
- `AuthControls.js`, `App.js` `AuthCallback` inline screen, recurring inline `#b91c1c`/`#666`/`#f3f4f6`.
- **Print export** `urlaHtmlExport.js` — light retheme per decision 2.
- **Verify:** run the dev server, screenshot every route, run WCAG contrast checks.

## 5. Token remap table (67 tokens)

### `styles/base/variables.css` (legacy)
| Token | Current → New |
|---|---|
| `--primary-color` | `#2c5f2d` → `#1fb463` (spring; where it backs a button fill, add ink text + lip) |
| `--primary-dark` | `#1a3d1b` → `#18a359` |
| `--primary-light` | `#4a7c4d` → `#34d17e` |
| `--secondary-color` | `#5a5a5a` → `#5a6b61` |
| `--success-color` | `#2e7d32` → `#1fb463` |
| `--danger-color` | `#c62828` → `#a8423a` |
| `--warning-color` | `#f57c00` → `#c08527` |
| `--info-color` | `#0277bd` → `#2e5d8a` |
| `--light-color` | `#fafafa` → `#f2f4ef` |
| `--dark-color` | `#2c2c2c` → `#0b231c` |
| `--bg-primary` | beige gradient → `#fbfbf7` (flat; remove animation) |
| `--bg-secondary` | `#fefdfb` → `#f2f4ef` |
| `--bg-card` | `#ffffff` → `#ffffff` |
| `--bg-glass` | `#fcfbf8` → `#f2f4ef` (also strip backdrop-filter) |
| `--text-primary` | `#2c2c2c` → `#0b231c` |
| `--text-secondary` | `#4a4a4a` → `#2b332e` |
| `--text-muted` | `#757575` → `#5a6b61` |
| `--text-white` | `#ffffff` → `#ffffff` |
| `--border-primary` | `#d4c5a9` → `#e2e6dd` |
| `--border-secondary` | `#e0ddd5` → `#e2e6dd` |
| `--border-light` | `#e8e6df` → `#e2e6dd` |
| `--shadow-sm` | `0 1px 3px rgba(0,0,0,.08)` → `0 2px 4px #07271e14,0 8px 18px #07271e1a` |
| `--shadow-md` | `0 2px 6px rgba(0,0,0,.1)` → `0 2px 4px #07271e14,0 8px 18px #07271e1a` |
| `--shadow-lg` | `0 4px 12px rgba(0,0,0,.12)` → `0 12px 44px #07271e33` |
| `--shadow-glow` | `0 0 0 1px rgba(44,95,45,.1)` → `0 0 0 4px #1fb46324` |
| `--radius-sm` | `4px` → `6px` |
| `--radius-md` | `8px` → `9px` |
| `--radius-lg` | `12px` → `12px` |
| `--radius-xl` | `16px` → `16px` |
| `--font-family` | system stack → `'Hanken Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif` |

### `styles/design-system.css` (.msfg)
| Token | Current → New |
|---|---|
| `--forest-900` | `#0a2a20` → `#07271e` |
| `--forest-800` | `#0e3a2e` → `#0b3d30` |
| `--forest-700` | `#154d3d` → `#0e4a39` |
| `--forest-600` | `#1e6650` → `#135e48` |
| `--forest-500` | `#2a8268` → `#1d7a55` |
| `--forest-50` | `#e8f0ec` → `#e7f6ee` |
| `--forest-25` | `#f1f6f2` → `#f2f4ef` |
| `--parchment` | `#f6f2e8` → `#f2f4ef` |
| `--parchment-soft` | `#faf7ef` → `#fbfbf7` |
| `--cream` | `#fbf9f3` → `#f2f4ef` |
| `--paper` | `#ffffff` → `#ffffff` |
| `--ink-line` | `#e8e3d4` → `#e2e6dd` |
| `--ink-line-soft` | `#efeadb` → `#eef0ea` |
| `--ink-900` | `#131815` → `#0b231c` |
| `--ink-700` | `#2b332e` → `#2b332e` (unchanged) |
| `--ink-500` | `#5a625b` → `#5a6b61` |
| `--ink-400` | `#828a83` → `#828f86` |
| `--ink-300` | `#a8aea7` → `#a8b0a8` |
| `--copper` | `#b16b3a` → `#1fb463` (copper accent → spring) |
| `--copper-bg` | `#f6e9dc` → `#1fb46324` |
| `--amber` / `--amber-bg` | `#c08527` / `#faecd0` (unchanged) |
| `--rose` / `--rose-bg` | `#a8423a` / `#f6dfdd` (unchanged) |
| `--azure` / `--azure-bg` | `#2e5d8a` / `#dee9f4` (unchanged) |
| `--moss` | `#3f7553` → `#18a359` |
| `--moss-bg` | `#dde9df` → `#1fb46324` |
| `--sh-1` | → `0 1px 0 #07271e0f,0 1px 2px #07271e14` |
| `--sh-2` | → `0 2px 4px #07271e14,0 8px 18px #07271e1a` |
| `--sh-3` | → `0 12px 44px #07271e33` |
| `--radius-sm` | `6px` → `6px` |
| `--radius-md` | `10px` → `9px` |
| `--radius-lg` | `14px` → `12px` |
| `--radius-xl` | `20px` → `16px` |
| `.msfg` font-family | `'Geist',…` → `'Hanken Grotesk', -apple-system, system-ui, sans-serif` |
| `.mono` / `.kv .v.mono` / `.ph` | `'Geist Mono',…` → `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace` |

## 6. Hardcoded hotlist — manual sweeps (29 files, 570 literals)

Ranked by literal count. Each needs in-rule edits the token remap can't reach.

| File | # | Action summary |
|---|---|---|
| `workspace/workspace.css` | 117 | legacy green→spring; off-brand blue `#2563eb`→spring/forest; beige `#f6f4ee`→paper-2; rebuild Tailwind status-badge block onto brand semantics; rgba glow→shadow-pop/spring-soft; fix all `var(--x,#fallback)` to brand. |
| `styles/layout/main.css` | 55 | rewrite stepper: strip glassmorphism + delete pulse/shimmer keyframes; bootstrap-green `rgba(40,167,69,*)`→spring; step-icon gradients→flat spring/line; remove h2 text-shadow. |
| `pages/loanDashboard.css` | 53 | `#2c5f2d`→spring; Tailwind grays→ink/muted/line; rebuild status-pill palette on brand scale; **hand-edit data-URI chevron `%23374151`→`%230b231c`**. |
| `styles/design-system.css` | 39 | `.btn-primary`→spring+ink+lip; on-dark cream `#f1ede0`→`#ffffffeb`; copper gradients→spring; topbar hairlines→`#ffffff1f`; `pill.muted`→paper-2; remove `.topbar::after` + `.page` radial glows + `.ph` stripes. |
| `styles/pages/application-form.css` | 18 | rebuild `.alert-*` on brand semantics; flatten address-display green gradient; HMDA parchment→paper-2, beige borders→line. |
| `styles/components/document-upload.css` | 18 | beige/copper hover `rgba(101,84,57,*)`→spring-soft; white→`var(--bg-card)`; danger→rose; remove translateY lifts; forest-tint shadows. |
| `styles/components/forms.css` | 13 | focus ring→spring-soft; num-stepper literals→brand; `#2c5f2d`→token; **data-URI chevron `%236b7280`→`%235a6b61`**; strip backdrop-filter. |
| `components/forms/AssetsLiabilitiesStep.js` | 12 | vendor gradient tab→`bubbleTabStyle`; **convert `onMouseEnter/Leave` DOM mutation→CSS `:hover`**; card chrome→brand. |
| `exporters/urla/urlaHtmlExport.js` | 12 | print stylesheet: `#2c5f2d`→forest `#07271e`; font→Hanken w/ Arial fallback; keep black body text. |
| `pages/admin/FolderTemplatesAdmin.js` | 11 | inline blue `#2563eb`→spring; danger→rose; badges→brand; extract shared admin stylesheet. |
| `workspace/DocumentReviewPanel.jsx` | 11 | palette literal → brand status map (accept→spring/moss, revision→amber, reject→rose). |
| `styles/components/recommended-docs.css` | 11 | status/coverage tints→brand semantics; strip overlay backdrop-filter; keep print B/W. |
| `components/forms/EmploymentStep.js` | 10 | vendor gradient tab + 2 DOM-mutation handlers→CSS; status pill: ink text where contrast needs it. |
| `pages/ApplicationList.design.css` | 10 | parchment table grays→paper-2/line; alarm red `#b54040`→rose; white→`--paper`. |
| `pages/admin/DocumentTypesAdmin.js` | 8 | same as FolderTemplatesAdmin; shared admin stylesheet. |
| inline danger cluster (`App.js`, `RequireAuth.js`, `LoanDashboardPage.js`, `DocumentHistory.jsx`, `UploadTypeModal.jsx`) | 8 | recurring `#b91c1c`→rose, `#666`→muted, `#f3f4f6`→line; shared error-text style. |
| `components/forms/BorrowerInformationStep.js` | 7 | vendor gradient tab + DOM-mutation→CSS (fixed via `bubbleTabStyle`). |
| `pages/LoanDashboardPage.design.css` | 7 | on-dark whites→brand tokens; copper glow→spring-soft; beige hints→paper-2. |
| `components/shared/bubbleTabStyle.js` | 6 | **high-leverage** — rewrite to spring active (ink, lip) + paper-2/muted inactive. |
| `components/forms/LoanInformationStep.js` | 6 | `var(--primary-color,#2563eb)`→brand fallback; muted fallbacks. |
| `pages/admin/AdminHome.js` | 6 | `onMouseEnter` blue-border mutation→CSS; fix var fallbacks; danger→rose. |
| `workspace/FolderEvaluationCard.css` | 6 | `#2d5c2a`→spring/moss; warn parchment→spring-soft/amber-bg; beige→paper-2. |
| `pages/ApplicationForm.design.css` | 6 | on-dark cream→`#ffffffeb`; hairline→`#ffffff1f`; forest focus glow→spring-soft. |
| `components/AuthControls.js` | 4 | on-dark header controls→brand on-dark tokens; verify contrast on forest topbar. |
| `components/design/LoanSearch.css` | 4 | `#f6f4ee`→paper-2; copper `<mark>`→spring-soft; panel shadow→shadow-pop. |
| `pages/admin/AppSettingsAdmin.js` | 2 | `#888`→muted; copper note→amber/spring. |
| `index.css` | 2 | font entry point — body→Hanken stack, code→ui-monospace. |
| `styles/components/buttons.css` | 2 (structural) | rewrite `.btn` primary/success/danger to flat spring+ink+lip / flat rose. |
| `pages/LandingPage.design.css` | 1 | `#f1ede0`→`#ffffffeb`. |

## 7. Font plan (@fontsource self-host)

1. `cd frontend && npm install --legacy-peer-deps @fontsource/hanken-grotesk`
2. In `frontend/src/index.js` (top, where `import './index.css'` lives) add weights 400/500/600/700/800 imports.
3. `index.css` — `body` → `'Hanken Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`; `code` → `ui-monospace, SFMono-Regular, Menlo, Consolas, 'Courier New', monospace`.
4. `variables.css` — `--font-family` → Hanken stack (retargets the entire legacy layer).
5. `design-system.css` — `.msfg` font-family `'Geist'`→`'Hanken Grotesk'`; three mono rules→ui-monospace; **delete the Geist Google-Fonts `@import` on line 7**.
6. Optional polish: bump `.msfg h1–h4` and legacy `typography.css` headings from 600→700 (Hanken at 600 reads lighter than Geist 600; brand supports 400–800).

## 8. Removals (12 off-brand effects)

1. `reset.css` — body animated `gradientShift` (background-size 400% + 15s animation) + `@keyframes gradientShift`. Set body to flat `var(--bg-primary)` (now flat paper).
2. `reset.css` — `body::before` floating-orb pseudo-element (3 green radial-gradients) + `@keyframes floatingOrbs`. Delete.
3. `layout/header.css` — **entire file is dead** (`.header/.nav/.logo` unreferenced; real chrome is `<TopBar/>`). Delete file + its `@import` in `styles/index.css`. Removes a green-glow animation + shimmer sweep + glassmorphism.
4. `styles/pages/application-list.css` — **entire file is dead** (`.applications-container/.application-card` unreferenced; pipeline uses `.pipe-*`). Delete file + `@import`.
5. `layout/main.css` — `@keyframes pulse` (active step-icon glow) + `@keyframes shimmer` (container top-border). Delete both + invoking rules.
6. `layout/main.css` — glassmorphism on stepper (backdrop-blur, white insets, `::before` sheen, translateY/scale hover, h2 text-shadow). Replace with flat spring/line.
7. `design-system.css` — `.topbar::after` radial glow + `.page` two radial glows. Remove; flat `var(--parchment-soft)` (now `#fbfbf7`).
8. `design-system.css` — `.ph` repeating-linear-gradient stripes. Flat paper-2 + dashed line border.
9. `components/forms.css` — backdrop-filter blur on `.input`/`.form-section` + `var(--bg-glass)` translucent fills → solid.
10. `components/buttons.css` — gradient fills + translateY lift on `.btn-primary/.btn-danger/.btn-success` → flat spring/rose + lip-press.
11. `AssetsLiabilitiesStep.js`/`BorrowerInformationStep.js`/`EmploymentStep.js` — `onMouseEnter/Leave` DOM color mutations → CSS `:hover`.
12. `design-system.css` — Geist + Geist Mono Google-Fonts `@import` (replaced by Hanken via @fontsource).

## 9. Route coverage (13 routes)

| Route | Strategy | Notes |
|---|---|---|
| `/` (Landing) | both | token remap + 1 manual on-dark cream fix; CTA picks up spring. |
| `/login`, `/signup` | token-remap | `AuthRedirect` inherits flat paper + Hanken. Cognito Hosted UI itself is **out of scope** (not themeable here). |
| `/auth/callback` | manual | inline transient screen in `App.js`; minor. |
| `/apply` | both | **heavy** — 3 form-step tabs (`bubbleTabStyle` + vendor gradients + DOM mutations), `forms.css`, `application-form.css`, quote sidebar. Verify all 3 modes: new, `?edit=ID`, `?view=1`. |
| `/applications` | both | parchment table chrome→paper-2/line; alarm red→rose; verify chip contrast. |
| `/applications/:id` | both | **heaviest** — embeds `workspace.css` (117) + `FolderEvaluationCard.css` + `DocumentReviewPanel.jsx`/`DocumentHistory.jsx`/`UploadTypeModal.jsx`. |
| `/loan/:loanId` | both | `LoanDashboardPage.design.css` (on-dark) + `loanDashboard.css` (53); rebuild status pills. |
| `/admin`, `/admin/document-types`, `/admin/folder-templates` | manual | **not on design system** — inline styles; needs component edits + shared admin stylesheet. |
| `/admin/settings` | both | inline `#888`/copper note manual; `.btn-primary` re-themes via buttons.css. |
| `/admin/app-settings` | token-remap | pure redirect, renders nothing. |

## 10. Risks & gotchas

- **Two-layer reconciliation (#1 risk):** colliding `:root` var names — legacy wins globally for `--radius-*`. Set both files to identical brand values or screens silently diverge.
- **Primary-button divergence:** if only the token is remapped (not the in-rule `.btn-primary` fill in `design-system.css`), the design-system button stays forest while legacy goes spring — two primaries on screen. Rewrite both.
- **Contrast (WCAG):** spring `#1fb463` + white text ≈ 2.3:1 (**fails AA**). Primary buttons **must use ink `#0b231c` text** — fix the white-text spots (`EmploymentStep` pill, `LoanInformationStep` toggle, admin `primaryBtn`). Amber `#c08527` + white ≈ 2.6:1 — use ink/dark-text-on-tint for warnings.
- **`var(--x,#fallback)` time-bombs:** off-brand fallbacks (blue `#2563eb`, grey, beige) silently render old colors if a token is unset/renamed. Update fallback hexes too.
- **Un-rethemeable imperative styling:** the 3 form steps + `AdminHome` mutate `element.style` via `onMouseEnter/Leave` — CSS can't reach them. Must convert to `:hover` classes.
- **Data-URI SVG fills:** `loanDashboard.css` (`%23374151`) and `forms.css` (`%236b7280`) embed colors inside url-encoded SVGs — hand-edit.
- **Status-palette consistency:** 4 files hardcode their own status palette — centralize so "approved" looks identical on dashboard vs. workspace vs. docs modal.
- **On-dark surfaces:** standardize ad-hoc whites to brand on-dark tokens; re-verify contrast on the new (slightly darker) forest.
- **Glassmorphism removal:** after dropping backdrop-blur, ensure now-solid fills use `var(--bg-card)`/paper so text isn't left on a transparent background.
- **Heading weight:** Hanken 600 reads lighter than Geist 600 — bump to 700 if headings look weak.
- **Print export:** webfont unavailable in the print window — Arial fallback.

## 11. Out of scope

- Any functional/logic/routing/data/API change.
- Cognito Hosted UI sign-in screens (themed in Cognito, not this repo).
- Layout restructuring or new components/features.
- Backend, infra, MISMO.

## 12. Verification plan

- Run the CRA dev server; screenshot every route in §9 (light + the on-dark surfaces).
- WCAG AA contrast check on: spring primary button, amber/rose/azure status pills, muted text on paper, on-dark text on forest topbar.
- Grep sweep confirming zero remaining `#2c5f2d`, `#2563eb`, `#f6f2e8/#f6f4ee` parchment, Geist references, and `backdrop-filter` outside intended spots.
- `CI=false npm run build` succeeds (no new warnings-as-errors).
- Manual smoke: 1003 in new/edit/view modes, dashboard status advance, pipeline filters, admin pages, a document upload — confirm functionality unchanged.
