# MSFG App Brand Restyle — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Retheme the entire `frontend/` to match the new MSFG brand at staging.msfg.us (Hanken Grotesk; forest + spring-green palette; flat clean surfaces), with zero functional change.

**Architecture:** Pure-CSS app with two CSS-custom-property token layers (legacy `variables.css` + `.msfg`-scoped `design-system.css`). Strategy is a 4-layer pass: (1) font + token remap reconciling both layers → re-themes ~60% via the cascade; (2) shared primitives (signature button, tab factory, status map); (3) per-file sweeps of 570 hardcoded literals the cascade can't reach; (4) admin/edges + verification. Spec: `docs/superpowers/specs/2026-06-13-msfg-brand-restyle-design.md`.

**Tech Stack:** Create React App (React 18), plain CSS + CSS custom properties, `@fontsource/hanken-grotesk`, CRA dev server for visual verification.

---

## Conventions for this plan

- **Grep-as-test:** Each sweep task's "test" is a `grep` that shows the old value present (RED), then absent after the edit (GREEN). Run greps from the repo root.
- **Tokens over literals:** When sweeping a file, prefer replacing a literal with the matching `var(--token)` rather than a new literal, except inside data-URI SVGs and the standalone print stylesheet (tokens don't apply there → use the literal brand hex).
- **Commit cadence:** one commit per task. Conventional prefix `style(restyle): …`.
- **Brand reference (memorize):** forest `#07271e/#0a3329/#0b3d30/#0e4a39/#135e48/#1d7a55`; spring `#1fb463/#18a359/#34d17e`; mint `#7fe3a8`; spring-soft `#1fb46324`; ink `#0b231c`; paper `#fbfbf7`; paper-2 `#f2f4ef`; muted `#5a6b61`; line `#e2e6dd`; on-dark `#ffffffeb / #ffffff9e / #ffffff1f`; lip `#0c6b39`; radii `6/9/12/16`; shadow-3d `0 2px 4px #07271e14,0 8px 18px #07271e1a`; shadow-pop `0 12px 44px #07271e33`.
- **Primary button (decision A):** flat spring fill + **ink `#0b231c` text** (never white) + lip shadow `0 3px 0 #0c6b39` that presses on `:active`.
- **Do not** change JS logic, routing, props, API calls, or markup structure (class names may change; behavior may not).

---

## Phase 0 — Font + new brand tokens

### Task 1: Install & load Hanken Grotesk (@fontsource)

**Files:**
- Modify: `frontend/package.json` (via npm)
- Modify: `frontend/src/index.js`

- [ ] **Step 1 (RED): confirm Geist is the current font**

Run: `grep -rn "Geist" frontend/src`
Expected: matches in `frontend/src/styles/design-system.css` (the `@import` + font-family rules).

- [ ] **Step 2: install the font package**

```bash
cd frontend && npm install --legacy-peer-deps @fontsource/hanken-grotesk
```

- [ ] **Step 3: import weights at the app entry**

In `frontend/src/index.js`, add at the very top (above `import './index.css'`):

```js
import '@fontsource/hanken-grotesk/400.css';
import '@fontsource/hanken-grotesk/500.css';
import '@fontsource/hanken-grotesk/600.css';
import '@fontsource/hanken-grotesk/700.css';
import '@fontsource/hanken-grotesk/800.css';
```

- [ ] **Step 4 (GREEN): build resolves the import**

Run: `cd frontend && CI=false npm run build 2>&1 | tail -20`
Expected: build completes (no "Module not found: @fontsource/hanken-grotesk").

- [ ] **Step 5: commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/src/index.js
git commit -m "style(restyle): add Hanken Grotesk via @fontsource"
```

### Task 2: Swap font globally + add new brand tokens

**Files:**
- Modify: `frontend/src/index.css`
- Modify: `frontend/src/styles/base/variables.css`
- Modify: `frontend/src/styles/design-system.css`

- [ ] **Step 1: index.css — body + code fonts**

Set `body` font-family to `'Hanken Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`.
Set `code` font-family to `ui-monospace, SFMono-Regular, Menlo, Consolas, 'Courier New', monospace`.

- [ ] **Step 2: variables.css — `--font-family` + new brand tokens**

Set `--font-family: 'Hanken Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;`
Add these new tokens to the same `:root` block (used by later sweeps):

```css
--spring: #1fb463;
--spring-soft: #1fb46324;
--mint: #7fe3a8;
--lip: #0c6b39;
--on-dark: #ffffffeb;
--on-dark-muted: #ffffff9e;
--hairline-dark: #ffffff1f;
```

- [ ] **Step 3: design-system.css — fonts + delete Geist import**

- Delete the Geist + Geist Mono Google-Fonts `@import` (line ~7).
- Change the `.msfg` rule font-family from `'Geist', …` to `'Hanken Grotesk', -apple-system, system-ui, sans-serif`.
- Change the three mono rules (`.mono`, `.kv .v.mono`, `.ph`) from `'Geist Mono', …` to `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`.
- Add the same 7 new tokens (`--spring`, `--spring-soft`, `--mint`, `--lip`, `--on-dark`, `--on-dark-muted`, `--hairline-dark`) to the `.msfg` (or `:root`) token block so `.msfg`-scoped rules can reference them.

- [ ] **Step 4 (GREEN): no Geist remains**

Run: `grep -rn "Geist" frontend/src`
Expected: no matches.

- [ ] **Step 5: commit**

```bash
git add frontend/src/index.css frontend/src/styles/base/variables.css frontend/src/styles/design-system.css
git commit -m "style(restyle): swap global font to Hanken Grotesk, add brand tokens"
```

---

## Phase 1 — Token remap (both layers, reconciled)

### Task 3: Remap `variables.css` color/shadow/radius tokens

**Files:**
- Modify: `frontend/src/styles/base/variables.css`

- [ ] **Step 1: apply this exact remap** (set each token's value):

```
--primary-color   #2c5f2d → #1fb463
--primary-dark     #1a3d1b → #18a359
--primary-light    #4a7c4d → #34d17e
--secondary-color  #5a5a5a → #5a6b61
--success-color    #2e7d32 → #1fb463
--danger-color     #c62828 → #a8423a
--warning-color    #f57c00 → #c08527
--info-color       #0277bd → #2e5d8a
--light-color      #fafafa → #f2f4ef
--dark-color       #2c2c2c → #0b231c
--bg-primary       (beige gradient) → #fbfbf7
--bg-secondary     #fefdfb → #f2f4ef
--bg-card          #ffffff → #ffffff   (unchanged, keep)
--bg-glass         #fcfbf8 → #f2f4ef
--text-primary     #2c2c2c → #0b231c
--text-secondary   #4a4a4a → #2b332e
--text-muted       #757575 → #5a6b61
--text-white       #ffffff → #ffffff   (unchanged, keep)
--border-primary   #d4c5a9 → #e2e6dd
--border-secondary #e0ddd5 → #e2e6dd
--border-light     #e8e6df → #e2e6dd
--shadow-sm  → 0 2px 4px #07271e14, 0 8px 18px #07271e1a
--shadow-md  → 0 2px 4px #07271e14, 0 8px 18px #07271e1a
--shadow-lg  → 0 12px 44px #07271e33
--shadow-glow → 0 0 0 4px #1fb46324
--radius-sm  4px → 6px
--radius-md  8px → 9px
--radius-lg  12px → 12px   (unchanged, keep)
--radius-xl  16px → 16px   (unchanged, keep)
```

- [ ] **Step 2 (GREEN): old legacy values gone from this file**

Run: `grep -nE "2c5f2d|1a3d1b|4a7c4d|d4c5a9|e0ddd5|e8e6df|fefdfb|fcfbf8" frontend/src/styles/base/variables.css`
Expected: no matches.

- [ ] **Step 3: commit**

```bash
git add frontend/src/styles/base/variables.css
git commit -m "style(restyle): remap legacy variables.css tokens to brand palette"
```

### Task 4: Remap `design-system.css` token block

**Files:**
- Modify: `frontend/src/styles/design-system.css`

- [ ] **Step 1: apply this exact remap:**

```
--forest-900 #0a2a20 → #07271e
--forest-800 #0e3a2e → #0b3d30
--forest-700 #154d3d → #0e4a39
--forest-600 #1e6650 → #135e48
--forest-500 #2a8268 → #1d7a55
--forest-50  #e8f0ec → #e7f6ee
--forest-25  #f1f6f2 → #f2f4ef
--parchment      #f6f2e8 → #f2f4ef
--parchment-soft #faf7ef → #fbfbf7
--cream          #fbf9f3 → #f2f4ef
--paper          #ffffff → #ffffff   (keep)
--ink-line       #e8e3d4 → #e2e6dd
--ink-line-soft  #efeadb → #eef0ea
--ink-900 #131815 → #0b231c
--ink-700 #2b332e → #2b332e   (keep)
--ink-500 #5a625b → #5a6b61
--ink-400 #828a83 → #828f86
--ink-300 #a8aea7 → #a8b0a8
--copper    #b16b3a → #1fb463
--copper-bg #f6e9dc → #1fb46324
--amber/-bg #c08527/#faecd0   (keep)
--rose/-bg  #a8423a/#f6dfdd   (keep)
--azure/-bg #2e5d8a/#dee9f4   (keep)
--moss    #3f7553 → #18a359
--moss-bg #dde9df → #1fb46324
--sh-1 → 0 1px 0 #07271e0f, 0 1px 2px #07271e14
--sh-2 → 0 2px 4px #07271e14, 0 8px 18px #07271e1a
--sh-3 → 0 12px 44px #07271e33
--radius-sm 6px → 6px   (keep)
--radius-md 10px → 9px
--radius-lg 14px → 12px
--radius-xl 20px → 16px
```

- [ ] **Step 2 (GREEN): old parchment/forest token values gone**

Run: `grep -nE "0a2a20|154d3d|1e6650|2a8268|f6f2e8|faf7ef|fbf9f3|e8e3d4|b16b3a" frontend/src/styles/design-system.css`
Expected: no matches in the token `:root`/`.msfg` block (note: `--rose #a8423a` legitimately remains — that's intended).

- [ ] **Step 3: commit**

```bash
git add frontend/src/styles/design-system.css
git commit -m "style(restyle): remap design-system.css tokens to brand palette"
```

### Task 5: Reconcile the two token layers

**Files:**
- Inspect/align: `frontend/src/styles/base/variables.css`, `frontend/src/styles/design-system.css`

- [ ] **Step 1 (RED): list duplicate token names across both files**

Run:
```bash
grep -hoE "^\s*--[a-z0-9-]+:" frontend/src/styles/base/variables.css frontend/src/styles/design-system.css | sort | uniq -d
```
Expected: at least `--radius-sm/-md/-lg/-xl` appear (defined in both).

- [ ] **Step 2: confirm colliding values are identical**

For every duplicate name, verify both files now hold the same value (radii must both be `6/9/12/16`). Legacy loads last so it wins globally — they MUST match. Fix any mismatch.

Run: `grep -nE "radius-(sm|md|lg|xl):" frontend/src/styles/base/variables.css frontend/src/styles/design-system.css`
Expected: `6px / 9px / 12px / 16px` in BOTH files.

- [ ] **Step 3: commit (if any alignment edit was needed)**

```bash
git add frontend/src/styles/base/variables.css frontend/src/styles/design-system.css
git commit -m "style(restyle): align colliding radius tokens across both layers"
```

---

## Phase 2 — Global off-brand FX removal + dead files

### Task 6: Strip animated background + floating orbs (`reset.css`)

**Files:**
- Modify: `frontend/src/styles/base/reset.css`

- [ ] **Step 1: edit**
- In the `body` rule: remove `background-size: 400% 400%`, any `background-attachment`, and `animation: gradientShift …`. Set `background: var(--bg-primary);` (now flat paper).
- Delete the entire `body::before` floating-orb rule (the 3 green radial-gradients).
- Delete `@keyframes gradientShift` and `@keyframes floatingOrbs`.

- [ ] **Step 2 (GREEN): animations gone**

Run: `grep -nE "gradientShift|floatingOrbs|400% 400%" frontend/src/styles/base/reset.css`
Expected: no matches.

- [ ] **Step 3: commit**

```bash
git add frontend/src/styles/base/reset.css
git commit -m "style(restyle): flatten body background, remove animated gradient + orbs"
```

### Task 7: Delete the two dead stylesheets

**Files:**
- Delete: `frontend/src/styles/layout/header.css`
- Delete: `frontend/src/styles/pages/application-list.css`
- Modify: `frontend/src/styles/index.css` (remove their `@import` lines)

- [ ] **Step 1 (RED): confirm they're unreferenced**

Run: `grep -rnE "className=[\"'](header|nav|logo|applications-container|application-card)\b" frontend/src`
Expected: no matches (the classes these files style are unused; real chrome is `<TopBar/>` `.msfg .topbar` and the `.pipe-*` pipeline).

- [ ] **Step 2: delete files + their imports**

```bash
git rm frontend/src/styles/layout/header.css frontend/src/styles/pages/application-list.css
```
Then remove the two corresponding `@import` lines from `frontend/src/styles/index.css`.

- [ ] **Step 3 (GREEN): no dangling import**

Run: `grep -nE "layout/header.css|pages/application-list.css" frontend/src/styles/index.css`
Expected: no matches.

- [ ] **Step 4: build still compiles**

Run: `cd frontend && CI=false npm run build 2>&1 | tail -5`
Expected: success.

- [ ] **Step 5: commit**

```bash
git add -A frontend/src/styles
git commit -m "style(restyle): delete dead header.css + application-list.css and their imports"
```

---

## Phase 3 — Shared primitives

### Task 8: Signature button — `components/buttons.css`

**Files:**
- Modify: `frontend/src/styles/components/buttons.css`

- [ ] **Step 1: rewrite the primary/success/danger button rules** (replace gradient fills + `translateY(-2px)` hover lifts):

```css
.btn-primary, .btn-success {
  background: var(--primary-color);   /* spring #1fb463 */
  color: #0b231c;                     /* ink — NOT white */
  border: none;
  box-shadow: 0 3px 0 var(--lip), 0 8px 18px #07271e1a;
  transition: transform .12s cubic-bezier(0,0,.2,1), box-shadow .12s cubic-bezier(0,0,.2,1);
}
.btn-primary:hover, .btn-success:hover {
  background: var(--primary-color);
  box-shadow: 0 5px 0 var(--lip), 0 12px 44px #07271e33;
  transform: translateY(-1px);
}
.btn-primary:active, .btn-success:active {
  box-shadow: 0 1px 0 var(--lip), 0 4px 10px #07271e14;
  transform: translateY(2px);
}
.btn-danger {
  background: var(--danger-color);    /* rose #a8423a */
  color: #fff;
  border: none;
  box-shadow: 0 3px 0 #7e2f29, 0 8px 18px #07271e1a;
  transition: transform .12s cubic-bezier(0,0,.2,1), box-shadow .12s cubic-bezier(0,0,.2,1);
}
.btn-danger:hover { box-shadow: 0 5px 0 #7e2f29, 0 12px 44px #07271e33; transform: translateY(-1px); }
.btn-danger:active { box-shadow: 0 1px 0 #7e2f29, 0 4px 10px #07271e14; transform: translateY(2px); }
```

- [ ] **Step 2 (GREEN): no gradient/lift left in this file**

Run: `grep -nE "linear-gradient|translateY\(-2px\)|#e74c3c|#c82333" frontend/src/styles/components/buttons.css`
Expected: no matches.

- [ ] **Step 3: commit**

```bash
git add frontend/src/styles/components/buttons.css
git commit -m "style(restyle): flat spring 3D buttons (ink text, lip press), flat rose danger"
```

### Task 9: `design-system.css` in-rule fixes (button, on-dark, glows)

**Files:**
- Modify: `frontend/src/styles/design-system.css`

- [ ] **Step 1: apply these in-rule edits** (these are NOT behind tokens):
- `.btn-primary` fill → `background: var(--primary-color); color: #0b231c; box-shadow: 0 3px 0 var(--lip), 0 8px 18px #07271e1a;` + `:hover`/`:active` lip-press as in Task 8 (so legacy and `.msfg` primaries match).
- On-dark cream `#f1ede0` (topbar/brand/top-user/av-brand text) → `var(--on-dark)`; `rgba(241,237,224,.7)` nav text → `var(--on-dark-muted)`.
- Copper gradients `#cfa15b`/`#d8b878`/`#8d5a26` in `.brand-mark`/`.top-user .av`/`.av-copper`/`.topnav.active::before` → spring gradient `linear-gradient(135deg, #34d17e, #18a359)` (or flat `var(--spring)`).
- Topbar hairlines `rgba(255,255,255,.04–.3)` → `var(--hairline-dark)`.
- `.pill.muted` bg `#ece8da` → `var(--bg-secondary)`.
- `.btn-danger` tint trio `#ecd6d3/#fbf1f0/#f6e3e1` → `var(--rose-bg)` / `var(--rose)` as appropriate.

- [ ] **Step 2: remove ambient glows + stripes** (per spec §8):
- Delete the `.topbar::after` radial-gradient white-tint glows.
- `.page` background → flat `var(--parchment-soft)` (now `#fbfbf7`); remove its two radial-gradient layers.
- `.ph` placeholder → flat `var(--bg-secondary)` + keep the dashed `var(--ink-line)` border; remove the `repeating-linear-gradient` stripes.

- [ ] **Step 3 (GREEN): off-brand literals + glows gone**

Run: `grep -nE "f1ede0|cfa15b|d8b878|8d5a26|ece8da|repeating-linear-gradient" frontend/src/styles/design-system.css`
Expected: no matches.

- [ ] **Step 4: commit**

```bash
git add frontend/src/styles/design-system.css
git commit -m "style(restyle): design-system spring button + on-dark tokens, remove glows/stripes"
```

### Task 10: Tab factory + form-step hover handlers

**Files:**
- Modify: `frontend/src/components/shared/bubbleTabStyle.js`
- Modify: `frontend/src/components/forms/BorrowerInformationStep.js`
- Modify: `frontend/src/components/forms/EmploymentStep.js`
- Modify: `frontend/src/components/forms/AssetsLiabilitiesStep.js`

- [ ] **Step 1: rewrite `bubbleTabStyle.js`** — active tab: `background: '#1fb463'`, `color: '#0b231c'`, `boxShadow: '0 3px 0 #0c6b39'`, no `translateY` lift, no colored glow; inactive tab: `background: '#f2f4ef'`, `color: '#5a6b61'`, `border: '1px solid #e2e6dd'`. Keep the function signature/exports identical.

- [ ] **Step 2: in each of the 3 step files** — remove the per-tab vendor gradient literals (`linear-gradient(135deg,#fa709a…)` etc.) and **delete the `onMouseEnter`/`onMouseLeave` handlers** that set `e.target.style.background`. Express hover with a CSS `:hover` class instead (add a `.form-tab:hover { background: #e7f6ee; }` rule to `forms.css` or `application-form.css` and apply the class). Do not change tab click behavior or state.

- [ ] **Step 3 (GREEN): no DOM-mutation hovers or vendor gradients remain in the steps**

Run: `grep -nE "onMouseEnter|onMouseLeave|fa709a|4facfe|f093fb|667eea" frontend/src/components/forms/BorrowerInformationStep.js frontend/src/components/forms/EmploymentStep.js frontend/src/components/forms/AssetsLiabilitiesStep.js frontend/src/components/shared/bubbleTabStyle.js`
Expected: no matches.

- [ ] **Step 4: commit**

```bash
git add frontend/src/components/shared/bubbleTabStyle.js frontend/src/components/forms/BorrowerInformationStep.js frontend/src/components/forms/EmploymentStep.js frontend/src/components/forms/AssetsLiabilitiesStep.js frontend/src/styles/components/forms.css
git commit -m "style(restyle): spring tab factory, convert form-step hovers to CSS"
```

### Task 11: Fix off-brand `var(--x, #fallback)` time-bombs

**Files:**
- Modify (fallback hexes only): `frontend/src/components/forms/LoanInformationStep.js`, `frontend/src/pages/admin/AdminHome.js`, `frontend/src/workspace/workspace.css`, `frontend/src/styles/components/forms.css`, `frontend/src/components/design/LoanSearch.css`, `frontend/src/workspace/DocumentReviewPanel.jsx`

- [ ] **Step 1: update every `var(--token, #oldhex)` fallback** so the fallback is the NEW brand value:
- `var(--primary-color, #2563eb)` → `var(--primary-color, #1fb463)`
- `var(--text-secondary, #666)` / `#6b7280` → `… #5a6b61`
- `var(--border-color, #e5e7eb)` → `… #e2e6dd`
- beige fallbacks (`#f6f4ee`) → `… #f2f4ef`

- [ ] **Step 2 (GREEN): no off-brand fallbacks remain**

Run: `grep -rnE "var\(--[a-z-]+, ?#(2563eb|666|6b7280|e5e7eb|f6f4ee)\b" frontend/src`
Expected: no matches.

- [ ] **Step 3: commit**

```bash
git add -A frontend/src
git commit -m "style(restyle): update off-brand var() fallbacks to brand values"
```

---

## Phase 4 — Heavy manual surfaces (per-file sweeps)

> For each sweep: read the file, replace each listed old value with the mapped target (prefer `var(--token)`), remove the listed FX, then run the grep gate. Commit per task.

### Task 12: Stepper — `styles/layout/main.css` (55)

- [ ] **Step 1: edit** — strip glassmorphism (`backdrop-filter`, white insets, `::before` sheen), delete `@keyframes pulse` + `@keyframes shimmer` and the rules invoking them, remove `translateY(-4px)/scale(1.15)` hover transforms and the h2 `text-shadow`. Replace bootstrap-green `rgba(40,167,69,*)` → `var(--spring)` / `var(--spring-soft)`; step-icon gradients → flat `var(--primary-color)` (active/done) and `var(--bg-secondary)`/`var(--border-light)` (todo); muted border `rgba(108,117,125,.3)` → `var(--border-light)`.
- [ ] **Step 2 (GREEN):** `grep -nE "backdrop-filter|@keyframes (pulse|shimmer)|40, ?167, ?69|108, ?117, ?125" frontend/src/styles/layout/main.css` → no matches.
- [ ] **Step 3: commit** — `style(restyle): flat brand stepper (remove glass/pulse/shimmer)`

### Task 13: Workspace — `workspace/workspace.css` (117)

- [ ] **Step 1: edit** — `#2c5f2d` → `var(--primary-color)`; off-brand blue `#2563eb` → `var(--primary-color)`; beige `#f6f4ee` → `var(--bg-secondary)`; pale-green `#e6efe7/#d1e7d2` → `var(--spring-soft)`; rebuild the Tailwind status-badge block (default→`var(--border-light)`/`var(--text-muted)`, ok→`var(--moss-bg)`/`var(--moss)`, warn→`var(--amber-bg)`/`var(--amber)`, danger→`var(--rose-bg)`/`var(--rose)`, neutral→`var(--azure-bg)`/`var(--azure)`); glow `rgba(44,95,45,.18)` → `var(--spring-soft)`.
- [ ] **Step 2 (GREEN):** `grep -nE "2c5f2d|2563eb|f6f4ee|e6efe7|d1e7d2|44, ?95, ?45" frontend/src/workspace/workspace.css` → no matches.
- [ ] **Step 3: commit** — `style(restyle): brand sweep of workspace.css`

### Task 14: Loan dashboard CSS — `pages/loanDashboard.css` (53)

- [ ] **Step 1: edit** — `#2c5f2d` → `var(--primary-color)`; Tailwind grays `#6b7280/#111827/#e5e7eb/#f3f4f6` → `var(--text-muted)`/`var(--ink-900)`/`var(--ink-line)`/`var(--bg-secondary)`; rebuild status-pill palette on the brand status scale (see Task 25 status map); **hand-edit the data-URI chevron** `fill='%23374151'` → `fill='%230b231c'` (or `%235a6b61`).
- [ ] **Step 2 (GREEN):** `grep -nE "2c5f2d|%23374151|dbeafe|fef3c7|d1fae5|ede9fe" frontend/src/pages/loanDashboard.css` → no matches.
- [ ] **Step 3: commit** — `style(restyle): brand sweep of loanDashboard.css + status pills`

### Task 15: Loan dashboard on-dark — `pages/LoanDashboardPage.design.css` (7) + `pages/LoanDashboardPage.js` inline

- [ ] **Step 1: edit** — on-dark whites `#fff`/`rgba(255,255,255,.72–.85)` → `var(--on-dark)`/`var(--on-dark-muted)`; copper glow `rgba(177,107,58,.12)` → `var(--spring-soft)`; beige hints `#ece8da/#f5f2e8/#fbeede` → `var(--bg-secondary)`/`var(--spring-soft)`. In `LoanDashboardPage.js`: inline `#b91c1c` → `var(--danger-color)` (or rose hex if no token in scope), `#f3f4f6` divider → `var(--ink-line)`.
- [ ] **Step 2 (GREEN):** `grep -nE "177, ?107, ?58|ece8da|f5f2e8|fbeede" frontend/src/pages/LoanDashboardPage.design.css` → no matches.
- [ ] **Step 3: commit** — `style(restyle): brand sweep of loan dashboard on-dark surfaces`

### Task 16: Form fields — `styles/components/forms.css` (13)

- [ ] **Step 1: edit** — focus ring `rgba(40,167,69,.1)` → `var(--spring-soft)`; num-stepper literals `#d1d5db/#f9fafb/#e5e7eb/#111827` → `var(--border-light)`/`var(--bg-secondary)`/`var(--ink-line)`/`var(--ink-900)`; `#2c5f2d` focus outline → `var(--primary-color)`; **data-URI chevron** `stroke='%236b7280'` → `%235a6b61`; remove `backdrop-filter` blur on `.input`/`.form-section` (solid `var(--bg-card)` fills).
- [ ] **Step 2 (GREEN):** `grep -nE "40, ?167, ?69|%236b7280|2c5f2d|backdrop-filter" frontend/src/styles/components/forms.css` → no matches.
- [ ] **Step 3: commit** — `style(restyle): brand sweep of forms.css (focus, stepper, chevron, glass)`

### Task 17: Application form — `styles/pages/application-form.css` (18) + `pages/ApplicationForm.design.css` (6)

- [ ] **Step 1: edit application-form.css** — rebuild `.alert-*`: warning→`var(--amber-bg)`/`var(--amber)`, danger→`var(--rose-bg)`/`var(--rose)`, success→`var(--spring-soft)`/`var(--primary-color)` (replace the bootstrap `rgba(255,193,7)/rgba(220,53,69)/rgba(40,167,69)` + `#856404/#721c24/#155724`); flatten the address-display green gradient to `var(--bg-secondary)`; HMDA parchment `#f6f4ee` → `var(--bg-secondary)`, beige border `#e5e2d6` → `var(--ink-line)`.
- [ ] **Step 2: edit ApplicationForm.design.css** — on-dark cream `#f1ede0` → `var(--on-dark)`; hairline `rgba(255,255,255,.08)` → `var(--hairline-dark)`; forest focus glow `rgba(30,102,80,.06)` → `var(--spring-soft)`; `#fff` card/icon → `var(--paper)`.
- [ ] **Step 3 (GREEN):** `grep -nE "f6f4ee|e5e2d6|f1ede0|856404|721c24|155724" frontend/src/styles/pages/application-form.css frontend/src/pages/ApplicationForm.design.css` → no matches.
- [ ] **Step 4: commit** — `style(restyle): brand sweep of application form (alerts, HMDA, on-dark)`

### Task 18: Doc upload + recommended docs — `styles/components/document-upload.css` (18) + `styles/components/recommended-docs.css` (11)

- [ ] **Step 1: edit document-upload.css** — beige/copper hover/focus `rgba(101,84,57,*)` → `var(--spring-soft)`; named `white` → `var(--bg-card)`; danger `#c0392b` → `var(--rose)`; remove `translateY` hover lifts; re-tint shadows to forest (`var(--shadow-md)`).
- [ ] **Step 2: edit recommended-docs.css** — status/coverage tints `rgba(46,125,50,*)/rgba(245,124,0,*)/rgba(198,40,40,*)/rgba(2,119,189,*)` → `var(--spring-soft)`/`var(--amber-bg)`/`var(--rose-bg)`/`var(--azure-bg)` (+ matching text tokens); strip overlay `backdrop-filter`; keep `#000`/white inside `@media print`.
- [ ] **Step 3 (GREEN):** `grep -nE "101, ?84, ?57|c0392b|46, ?125, ?50|198, ?40, ?40" frontend/src/styles/components/document-upload.css frontend/src/styles/components/recommended-docs.css` → no matches.
- [ ] **Step 4: commit** — `style(restyle): brand sweep of document-upload + recommended-docs`

### Task 19: Pipeline table — `pages/ApplicationList.design.css` (10)

- [ ] **Step 1: edit** — parchment grays `#f0ece0/#f6f4ee/#fafaf5` → `var(--bg-secondary)`/`var(--ink-line)`/a faint paper hover; `#fff` → `var(--paper)`; alarm red `#b54040` → `var(--rose)`; `#e5e7eb` border → `var(--ink-line)`.
- [ ] **Step 2 (GREEN):** `grep -nE "f0ece0|f6f4ee|fafaf5|b54040" frontend/src/pages/ApplicationList.design.css` → no matches.
- [ ] **Step 3: commit** — `style(restyle): brand sweep of pipeline table`

### Task 20: Folder eval + search — `workspace/FolderEvaluationCard.css` (6) + `components/design/LoanSearch.css` (4)

- [ ] **Step 1: edit FolderEvaluationCard.css** — `#2d5c2a` → `var(--primary-color)` (or `var(--moss)` for "ok"); warn `#f5f2e8` → `var(--spring-soft)`/`var(--amber-bg)`; code/meta beige `#f0ece0` → `var(--bg-secondary)`/`var(--ink-line)`; `#fff` → `var(--paper)`.
- [ ] **Step 2: edit LoanSearch.css** — `#f6f4ee` → `var(--bg-secondary)`; copper `<mark>` `rgba(177,107,58,.22)` → `var(--spring-soft)`; panel shadow → `var(--shadow-lg)`; `#fff` → `var(--paper)`.
- [ ] **Step 3 (GREEN):** `grep -nE "2d5c2a|f5f2e8|f0ece0|f6f4ee|177, ?107, ?58" frontend/src/workspace/FolderEvaluationCard.css frontend/src/components/design/LoanSearch.css` → no matches.
- [ ] **Step 4: commit** — `style(restyle): brand sweep of folder-eval + loan-search`

### Task 21: Workspace JS palettes + inline danger cluster

**Files:** `frontend/src/workspace/DocumentReviewPanel.jsx` (11), `frontend/src/workspace/DocumentHistory.jsx`, `frontend/src/components/UploadTypeModal.jsx`, `frontend/src/App.js`, `frontend/src/components/RequireAuth.js`

- [ ] **Step 1: edit DocumentReviewPanel.jsx** — the `palette` object literal: accept → `{bg:'#1fb46324', text:'#135e48', border:'#1fb463'}`, revision → `{bg:'#faecd0', text:'#92400e', border:'#c08527'}`, reject → `{bg:'#f6dfdd', text:'#991b1b', border:'#a8423a'}`; `#b91c1c` → `#a8423a`.
- [ ] **Step 2: edit the inline danger/grey cluster** — `#b91c1c` → `#a8423a` (App.js, RequireAuth.js, DocumentHistory.jsx), `#666` → `#5a6b61` (UploadTypeModal.jsx, DocumentHistory.jsx), `#f3f4f6` → `#e2e6dd`.
- [ ] **Step 3 (GREEN):** `grep -rnE "#b91c1c|dcfce7|166534" frontend/src/workspace frontend/src/App.js frontend/src/components/RequireAuth.js frontend/src/components/UploadTypeModal.jsx` → no matches.
- [ ] **Step 4: commit** — `style(restyle): brand sweep of workspace JS palettes + inline danger`

---

## Phase 5 — Admin, edges, print

### Task 22: Shared admin stylesheet

**Files:**
- Create: `frontend/src/pages/admin/adminStyles.js` (shared inline style constants OR a `.css` module)
- Modify: `frontend/src/pages/admin/AdminHome.js`, `DocumentTypesAdmin.js`, `FolderTemplatesAdmin.js`, `AppSettingsAdmin.js`

- [ ] **Step 1: create a single tokenized admin style source** — export `tableStyle/th/td/primaryBtn/secondaryBtn/linkBtn/dangerLinkBtn/input/badge(kind)` using brand values: `primaryBtn` = spring `#1fb463` bg + ink `#0b231c` text + lip `box-shadow:0 3px 0 #0c6b39`; danger = rose `#a8423a`; grays → `#5a6b61`/`#e2e6dd`; mono → `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`; `badge` pairs → rose-bg/rose, amber-bg/amber, spring-soft/spring.
- [ ] **Step 2: route all four admin pages through it** — replace their local inline style objects with imports from the shared source. **Convert `AdminHome`'s `onMouseEnter/Leave` blue-border mutation** to a CSS `:hover` (or set the hover border to `#1fb463`). Replace blue `#2563eb` and `#b91c1c` everywhere in these files.
- [ ] **Step 3 (GREEN):** `grep -rnE "#2563eb|#b91c1c|onMouseEnter" frontend/src/pages/admin` → no matches.
- [ ] **Step 4: commit** — `style(restyle): tokenized shared admin styles, brand admin pages`

### Task 23: Auth controls + callback

**Files:** `frontend/src/components/AuthControls.js` (4), `frontend/src/App.js` (AuthCallback inline)

- [ ] **Step 1: edit AuthControls.js** — border `rgba(255,255,255,.4)` → `var(--hairline-dark)` (or `#ffffff1f`); loading `rgba(255,255,255,.7)` → `#ffffff9e`; button/username `'white'` → `#ffffffeb`.
- [ ] **Step 2: edit AuthCallback inline (App.js)** — any inline color literals → brand muted/ink; it inherits Hanken via body.
- [ ] **Step 3 (GREEN):** `grep -nE "255, ?255, ?255, ?0\.(4|7)" frontend/src/components/AuthControls.js` → no matches.
- [ ] **Step 4: commit** — `style(restyle): brand on-dark auth controls + callback`

### Task 24: Print/PDF export — `exporters/urla/urlaHtmlExport.js` (light retheme)

**Files:** `frontend/src/exporters/urla/urlaHtmlExport.js`

- [ ] **Step 1: edit** — section-header `#2c5f2d` → `#07271e` (forest, print-safe); `font-family` → `'Hanken Grotesk', Arial, Helvetica, sans-serif`; **keep `#000` body text** + table chrome legible for print.
- [ ] **Step 2 (GREEN):** `grep -nE "2c5f2d" frontend/src/exporters/urla/urlaHtmlExport.js` → no matches.
- [ ] **Step 3: commit** — `style(restyle): light brand retheme of URLA print export`

### Task 25: Centralized status map + last edges

**Files:**
- Create: `frontend/src/utils/statusColors.js` (single source for loan-status → brand hue)
- Modify: consumers that derive status colors (`loanDashboard.css` is CSS; for JS-driven pills add/import the map), `frontend/src/pages/LandingPage.design.css` (1), `frontend/src/components/forms/LoanInformationStep.js`, `frontend/src/components/forms/EmploymentStep.js`

- [ ] **Step 1: define the 11-stage status → hue map** (used wherever a loan-status pill renders, so the same status looks identical everywhere):

```js
// statusColors.js — {bg, text} brand tints
export const STATUS_COLORS = {
  REGISTERED:        { bg: '#dee9f4', text: '#2e5d8a' }, // azure
  APPLICATION:       { bg: '#dee9f4', text: '#2e5d8a' }, // azure
  DISCLOSURES_SENT:  { bg: '#faecd0', text: '#92400e' }, // amber
  DISCLOSURES_SIGNED:{ bg: '#faecd0', text: '#92400e' }, // amber
  UNDERWRITING:      { bg: '#1fb46324', text: '#135e48' }, // spring-soft
  APPROVED:          { bg: '#1fb46324', text: '#135e48' }, // spring
  APPRAISAL:         { bg: '#dee9f4', text: '#2e5d8a' }, // azure
  INSURANCE:         { bg: '#dee9f4', text: '#2e5d8a' }, // azure
  CTC:               { bg: '#1fb46324', text: '#18a359' }, // moss/spring
  DOCS_OUT:          { bg: '#dee9f4', text: '#2e5d8a' }, // azure
  FUNDED:            { bg: '#1fb463',  text: '#07271e' }, // solid spring (terminal-positive)
  DISPOSITIONED:     { bg: '#f6dfdd', text: '#991b1b' }, // rose
};
```

- [ ] **Step 2:** route any JS-rendered status pill through `STATUS_COLORS`; ensure `loanDashboard.css` pill classes use the same tints. Fix `LandingPage.design.css` `#f1ede0` → `var(--on-dark)`. In `LoanInformationStep.js`/`EmploymentStep.js`, change toggle/pill `color:'white'`/`'#fff'` on spring fill → `'#0b231c'` (ink) for contrast; keep white only on rose/azure solid fills.
- [ ] **Step 3 (GREEN):** `grep -rnE "f1ede0" frontend/src/pages/LandingPage.design.css` → none; `grep -rn "color: *'white'" frontend/src/components/forms` → only on non-spring fills.
- [ ] **Step 4: commit** — `style(restyle): centralized status palette + ink text on spring, last edges`

---

## Phase 6 — Verification

### Task 26: Global grep sweep (no stragglers)

- [ ] **Step 1: run the full sweep**

```bash
grep -rnE "#2c5f2d|#2563eb|#f6f2e8|#f6f4ee|Geist|backdrop-filter|gradientShift|floatingOrbs" frontend/src \
  --include=*.js --include=*.jsx --include=*.css
```
Expected: no matches (a `backdrop-filter` hit only acceptable if intentionally kept and noted; otherwise fix). Investigate and clean any straggler, commit as `style(restyle): clean straggler brand literals`.

### Task 27: Build + visual + contrast verification

- [ ] **Step 1: production build**

Run: `cd frontend && CI=false npm run build 2>&1 | tail -8`
Expected: success, no new warnings-as-errors.

- [ ] **Step 2: dev server + screenshots** — start the CRA dev server (`preview_start`) and capture every route in spec §9 (`/`, `/apply` in new/edit/view, `/applications`, `/applications/:id` incl. workspace tab, `/loan/:loanId`, `/admin`, `/admin/document-types`, `/admin/folder-templates`, `/admin/settings`). Confirm: Hanken Grotesk everywhere, flat paper bg (no animated parchment/orbs), forest topbar with on-dark text, spring 3D primary buttons with ink text, flat spring stepper, hairline borders.

- [ ] **Step 3: contrast checks (WCAG AA)** — verify: spring primary button uses ink text (≥4.5:1); amber/rose/azure status pills use dark-text-on-tint; muted text on paper ≥4.5:1; on-dark text on forest topbar ≥4.5:1. Fix any failure.

- [ ] **Step 4: functional smoke** — 1003 new/edit/view, dashboard status advance, pipeline filters, admin CRUD, one document upload — confirm behavior unchanged.

### Task 28: Finalize

- [ ] **Step 1:** ensure all changes committed; branch `feat/msfg-brand-restyle` is clean (`git status`).
- [ ] **Step 2:** summarize the diff stat (`git diff --stat main...feat/msfg-brand-restyle`) and report. (PR/merge per user instruction — do not push unless asked.)

---

## Self-review notes

- **Spec coverage:** font (T1–2), both token layers + reconcile (T3–5), global FX removal + dead files (T6–7), signature button both layers (T8–9), tab factory + DOM-hover conversion (T10), var fallbacks (T11), all 29 hotlist files across T9/T12–25, status centralization (T25), admin off-system pages (T22), print export (T24), on-dark (T9/T15/T17/T23/T25), data-URI chevrons (T14/T16), verification incl. contrast (T26–28). All spec §5/§6/§8/§9/§10 items mapped.
- **Contrast invariant:** every spring fill pairs with ink `#0b231c` text (T8, T9, T22, T25) — the one WCAG hazard, enforced in three tasks + verified in T27.
- **No placeholders:** each sweep names the specific literals → targets; FX removals name the exact keyframes/rules; greps are concrete with expected output.
