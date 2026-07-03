# Handoff: MSFG Application — Frontend Restyle (visual only)

## ⚠️ Read this first — scope & non-negotiables

This task is a **visual / styling refresh of the existing mortgage-application frontend so its
header and chrome match the MSFG marketing site** (staging.msfg.us / app.msfgco.com).

**DO NOT change any functionality.** Specifically, you must NOT:

- Change form behavior, field logic, or the set/order/names of any form fields.
- Touch `react-hook-form` wiring (`register`, `control`, `useFieldArray`, `watch`, validation rules, resolvers).
- Change autosave / draft logic, routing, API calls, auth, or state management.
- Rename props, change component APIs, or alter the data shape passed between components.
- Add or remove steps, inputs, selects, or buttons (other than restyling the ones that exist).
- Introduce new dependencies or a UI framework. Use the project's existing CSS files and patterns.

**You MAY:**

- Edit CSS (the files under `src/styles/**`) — this is where the bulk of the work lives.
- Add semantic wrapper elements and `className`s to JSX **purely for layout/styling**, as long as
  the rendered fields, handlers, and structure stay functionally identical.
- Update copy in the header title/subtitle/eyebrow if it is presentational only (see notes).

When in doubt: **change the look, never the behavior.** If a change risks behavior, prefer a CSS-only solution.

---

## Overview

The application currently renders on a cream background with a small logo and plain dark heading —
it looks like a generic form tool and is visually disconnected from the MSFG website. The website is
**immersive**: a deep forest-green canvas, oversized mint-green display headings, bright-green pill
CTAs, and white rounded cards with soft shadows.

The redesign brings that language into the application's **top zone only** (header band + title +
step indicator + section headings). **The form fields themselves stay exactly as they are** — only
their container card and section headers are restyled.

## About the design files

The file **`MSFG Application — Header Redesign.html`** (in this bundle) is a **high-fidelity design
reference built in plain HTML/CSS** — it shows the intended look and proportions. It is **not**
production code to copy verbatim. Recreate its appearance inside the existing **React (CRA) +
plain-CSS** codebase using the project's established component and stylesheet structure.

**Fidelity: high-fidelity (hifi).** Match colors, typography, spacing, radii, and shadows precisely.

---

## Design tokens

Add/update these in `src/styles/base/variables.css` (keep existing variable names where the codebase
already uses them; add new ones alongside).

### Color
| Token | Hex | Use |
|---|---|---|
| `--forest` | `#0E3B2C` | Hero band + suite-bar background (deep forest green) |
| `--forest-deep` | `#0A2C20` | Suite top-bar background (slightly darker) |
| `--green` | `#29C24E` | Primary CTA pills, active accents, progress ring |
| `--green-hover` | `#22A843` | Primary CTA hover |
| `--mint` | `#82E2A6` | Display headings on dark, "Back" link, saved-pill text |
| `--sage` | `#9FBCAC` | Muted body text on the dark hero |
| `--cream` | `#F5F4ED` | Light page background (content area) |
| `--ink` | `#10271E` | Primary text on light |
| `--ink-soft` | `#516A5C` | Secondary text on light |
| `--card` | `#FFFFFF` | Cards |
| `--line` | `#E5E8E2` | Card borders / dividers |
| `--field-line` | `#D9DDD5` | Input borders (already roughly in use — keep) |
| `--forest-line` | `rgba(255,255,255,.10)` | Hairlines on dark |

### Typography
- Family: a geometric humanist sans. The site uses one close to **Plus Jakarta Sans** — if the
  codebase already loads a brand font, use that; otherwise Plus Jakarta Sans is a good match.
- Hero `h1`: weight **800**, `font-size: 46px`, `line-height: 1.04`, `letter-spacing: -1px`, color `--mint`.
- Hero sub-line: weight 500, `16.5px`, `line-height: 1.5`, color `--sage`.
- Eyebrow ("NEW APPLICATION"): weight 700, `12.5px`, `letter-spacing: 2.5px`, uppercase, color `--green`.
- Section badge label ("Loan Information"): weight 700, `18px`, color `--forest`.

### Radius / shadow / spacing
- Card radius: **22px**. Inputs / pills inside: 12px. Step chips: 13px. Full pill buttons: `999px`.
- `--shadow` (stepper, floats over hero): `0 24px 60px -20px rgba(8,40,28,.45)`
- `--shadow-sm` (form card): `0 1px 2px rgba(16,39,30,.06), 0 4px 16px -8px rgba(16,39,30,.10)`
- Content max-width: **1120px**, horizontal padding 32px.

---

## Screens / views

This is a **single reusable header treatment that wraps all seven application steps.** The body of
each step (the fields) is unchanged. Likely files:

- Suite top bar → `src/components/Header.js` (+ `src/styles/layout/header.css`)
- Title band + actions + stepper → `src/components/forms/ApplicationForm.js`,
  `src/components/shared/ProgressIndicator.js`, `src/components/shared/StepNavigation.js`
  (+ `src/styles/pages/application-form.css`)
- Section heading → `src/components/shared/FormSection.js` (+ `src/styles/components/forms.css`)
- Fields → `src/components/forms/*Step.js` and `src/components/form-fields/*` — **styling only, no markup/logic change**

### 1. Suite top bar (`Header.js`)
- Background `--forest-deep`, height ~58px, bottom hairline `--forest-line`.
- **Left:** the real MSFG logo (see Assets). Replace the current "M" mark.
- Then a 1px vertical divider `rgba(255,255,255,.18)`, then "MORTGAGE SUITE" in muted uppercase
  (`rgba(255,255,255,.45)`, 11px, letter-spacing 1.5px).
- Nav links (Apply / Applications / Admin): 13.5px, weight 600, `rgba(255,255,255,.62)`; the active
  link gets a `rgba(41,194,78,.16)` pill, white text, and a small green status dot.
- Search field: translucent `rgba(255,255,255,.07)`, 11px radius, "Find a loan… ⌘K".
- Right: round green avatar (initials), username, gear. Keep whatever real user data already binds here.

### 2. Dark hero band (title zone) — replaces the cream title block
- Full-bleed background `--forest`. Add a subtle **concentric-ring texture** with layered radial
  gradients (decorative, `::before`, `pointer-events:none`) — see the HTML for the exact values:
  ```css
  background:
    radial-gradient(120% 150% at 50% -20%, rgba(130,226,166,.10), transparent 55%),
    repeating-radial-gradient(circle at 50% -10%, transparent 0 78px, rgba(255,255,255,.022) 78px 79px);
  ```
- Padding ~`46px 0 96px` (extra bottom padding so the stepper card can overlap into it).
- **Left column:** a pill "‹ Back" link (mint text, translucent bg), the eyebrow "NEW APPLICATION",
  the `h1` "Let's build your mortgage application" in `--mint`, and the sub-line
  "Seven short sections. Your progress saves automatically — pick up anywhere, any time." in `--sage`.
- **Right column (actions):** stack, right-aligned —
  - "Saved locally just now" pill: `rgba(41,194,78,.14)` bg, `rgba(41,194,78,.32)` border, mint text,
    a pulsing green dot. **Bind to the existing autosave state — do not change the autosave logic.**
  - "↓ Save & exit" ghost pill: `rgba(255,255,255,.07)` bg, `--forest-line` border, white text.
  - "Continue ›" primary pill: `--green` bg, `#06281A` text, green glow shadow. **Keep its existing
    onClick / step-advance handler.**

### 3. Step indicator (`ProgressIndicator.js`) — floats over the hero
- A white card (`--card`, radius 22px, `--shadow`, `--line` border) pulled **up ~64px** so it overlaps
  the bottom of the hero (like the payment card on msfg.us). `position: relative; z-index: 3`.
- **Left:** a 62px circular SVG progress ring — track `#E4E9E3`, progress stroke `--green`, rounded
  cap; center shows "N/7". Drive the ring offset and the "N/7" from the existing current-step state.
- **Right:** the seven steps in a flex row. **Critical layout rule (this was the one bug to avoid):**
  do **not** force seven equal columns — long labels ("Declarations", "Employment") clip below ~1120px.
  Instead:
  - **Active step:** `flex: 1 1 auto` (takes remaining width), green-tinted bg `#EAF7EE`,
    `rgba(41,194,78,.4)` border, dark icon chip with mint glyph, shows **label + sub-label**.
  - **Inactive / completed steps:** `flex: 0 0 auto`, collapse to an **icon chip only** (no text label) —
    show the step **number** (2–7) for upcoming steps and a check for completed steps, with the full
    "Label — sub-label" in a `title` tooltip. Completed chip = `--green` bg; upcoming chip = `#E4E9E3`
    bg, muted glyph.
  - This keeps every visible label fully readable at any desktop width (verified down to ~960px).
- Step list (labels / sub-labels, in order): Loan Info / Purpose & amount · Borrower / Personal details ·
  Property / Subject property · Employment / Income sources · Finances / Assets & liabilities ·
  Declarations / Legal questions · Submit / Review & sign. **Use whatever the component already
  derives these from — don't hardcode if the data already exists.**

### 4. Form card + section heading (`FormSection.js`, `forms.css`)
- The step body sits in a white card: `--card`, radius 22px, `--shadow-sm`, `--line` border,
  padding ~`44px 48px`, on the `--cream` page background, max-width 1120px.
- **Section heading** (currently a bright-green link-style heading): replace with a centered **badge** —
  an inline pill, `#EAF7EE` bg, `rgba(41,194,78,.3)` border, `--forest` text (700/18px), with a small
  square `--green` icon chip on the left. Sub-line below in `--ink-soft`.

### 5. Fields — **styling only**
Keep all fields, their order, labels, validation, and handlers exactly as-is. Only ensure they inherit
the refreshed tokens:
- Inputs: height ~50px, `1.5px solid --field-line`, radius 12px, white bg, 15px text.
- Error state: `#E2A0A0` border, `#FDF4F4` bg, message in `#C0392B` (keep existing validation triggers).
- Two-column grid `1fr 1fr`, gap ~`22px 26px`; full-width fields span both columns.
- The $/% toggle, steppers, currency prefixes, etc. keep their current markup and behavior — restyle visuals only.

---

## Interactions & behavior (preserve exactly)
- Step navigation (Continue / Back / clicking a step), autosave + "Saved" indicator, validation and
  error display, the $/% and dependent-field toggles, currency formatting, draft restore, routing.
- All of the above already work — the redesign must not alter their triggers, timing, or logic.
- New visual-only motion is fine if it respects `prefers-reduced-motion`: a subtle entrance on the hero,
  the pulsing saved-dot. Keep it tasteful; no infinite loops on content.

## Responsive
- The header/stepper must stay readable from ~960px up. Below ~1080px, drop the active step's sub-label
  first (keep the label). Stack the hero actions under the title on narrow widths. The existing field
  grid's responsive behavior should be preserved.

## Assets
- **MSFG logo:** `https://msfg-media.s3.us-west-2.amazonaws.com/Assets/LOGOS/MSFG+Home+Loans/MSFG-Color-Transparent.png`
  - ⚠️ This is the **color-on-light** version; its "HOME LOANS" text is dark and **disappears on the
    dark forest bar**. In the reference it's placed on a small **white rounded chip** (`padding: 7px 12px;
    border-radius: 10px; background:#fff`) so it reads. **Preferred:** if MSFG has a reversed/white logo
    variant, use that on the dark bar and drop the chip. Ask the team for `…/MSFG-White-Transparent.png`
    or equivalent.
- Icons: use the project's existing icon set (`react-icons` is already a dependency) — home, user,
  building, briefcase, etc. for the step chips. Don't add a new icon library.

## Files to touch (expected)
- `src/components/Header.js` + `src/styles/layout/header.css` — suite bar + logo
- `src/components/forms/ApplicationForm.js` — hero band + actions wrapper
- `src/components/shared/ProgressIndicator.js` — stepper card (the adaptive layout above)
- `src/components/shared/StepNavigation.js` — Save & exit / Continue pill styling
- `src/components/shared/FormSection.js` — section badge
- `src/styles/base/variables.css` — tokens
- `src/styles/base/typography.css` — heading scale
- `src/styles/components/buttons.css`, `forms.css` — pills, inputs, section badge
- `src/styles/pages/application-form.css` — hero, stepper overlap, content layout
- `src/styles/layout/responsive.css` — the narrow-width rules above

## Reference files in this bundle
- `MSFG Application — Header Redesign.html` — the hifi visual source of truth. Open it in a browser and
  match it. Every value above is taken from it.
- `screenshots/01-header-hero-stepper.png` — suite bar, dark hero, and the floating step indicator.
- `screenshots/02-form-card.png` — section badge + form card with fields (fields unchanged).
