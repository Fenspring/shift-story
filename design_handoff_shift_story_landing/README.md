# Handoff: Shift Story Landing Page

## Overview
Waitlist landing page for Shift Story, an anonymous operational-listening product for nurse leaders. Primary goal: convert nurse leaders (CNOs, DONs, nurse managers, ANMs, clinical educators, quality/ops leaders) into founding-cohort waitlist signups. Secondary goal: explain the "one question → recurring theme → leader action → visible update" loop.

## About the Design Files
The bundled file (`shift-story-landing.dc.html`) is a **design reference built in HTML** with inline styles — a working prototype of layout, copy, motion, and interaction, not production code to paste in. Recreate it in the target codebase's existing environment (React/Vue/Next/etc., using its component and styling conventions) or, if no environment exists yet, choose the most suitable framework and implement there. Preserve exact colors, type, spacing, and motion timing described below.

## Fidelity
**High-fidelity.** Treat colors, typography, spacing, copy, and animation timings as final. Layout should be recreated pixel-close using the target stack's layout primitives (flex/grid), not by embedding the HTML directly.

## Screens / Views
Single long-scroll page, sections in order:

### 1. Nav (fixed/sticky)
- Full-width bar, fixed top, `padding: 18px clamp(20px,5vw,64px)`, background `rgba(11,17,24,0.86)` with `backdrop-filter: blur(10px)`, bottom hairline `1px solid rgba(243,239,231,0.08)`.
- Left: wordmark "Shift Story", Fraunces 500, `clamp(18px,2vw,21px)`, color `#F3EFE7`.
- Right: text links "How it works" (`#how-it-works`), "Why anonymity" (`#why-anonymity`) — 14px, `#B7C0CC`. Then CTA button "Join waitlist" — solid `#F2A65A` background, `#0B1118` text, 600 weight, 14px, `10px 20px` padding, `border-radius:2px`, hover `#f5b975`.

### 2. Hero
- Top padding `clamp(130px,16vw,180px)`, max-width 1200px centered.
- Eyebrow: "Anonymous operational listening for nurse leaders" — 12px uppercase, letter-spacing 0.14em, color `#72B6AD`. *(Currently hidden via `display:none` per latest direct edit — keep hidden unless product asks to restore it.)*
- Headline block (min-height `clamp(120px,18vw,208px)` to prevent layout shift):
  - Small label above: "A nurse manager says…" — 0.5em of parent, color `#6E7B89`.
  - Large quoted line, Fraunces 400, `clamp(30px,4.6vw,52px)`, line-height 1.28, color `#F3EFE7`, max-width 17ch. Content is a **typewriter animation** cycling through three quotes (see Interactions).
- Supporting paragraph: "Shift Story turns one anonymous weekly question into a clear view of the operational friction your team is carrying—and the next action that can make work better." — 16–19px, `#B7C0CC`, max-width 460px.
- CTA row: primary button "Join the founding waitlist" (`#F2A65A` bg / `#0B1118` text, 16px 28px padding, 600 weight, 15px, radius 2px, hover `#f5b975`) + secondary text link "See how it works" with underline `rgba(243,239,231,0.3)`, hover color `#72B6AD`.
- Microcopy: "Built for nurse leaders. No EHR integration. No patient data required." — 13px, `#6E7B89`.

### 3. Problem statement
- Two-column responsive grid (`repeat(auto-fit,minmax(320px,1fr))`, gap `clamp(40px,6vw,64px)`), top hairline border, padding `clamp(60px,8vw,110px)`.
- Left: large statement, Fraunces 500, `clamp(28px,3.6vw,42px)`, line-height 1.22: "The most valuable operational intelligence in your hospital is already happening in the break room."
- Right: body copy (16px, `#B7C0CC`, line-height 1.7) + a "Noise → Signal" indicator: label "Noise" (`#6E7B89`) — dashed 1px line — arrow — solid teal 1px line — label "Signal" (`#72B6AD`).

### 4. How Shift Story works (`#how-it-works`)
- Max-width 1000px. Eyebrow "How Shift Story works" (12px uppercase teal).
- Three stacked rows, each: large ghost numeral (Fraunces, 60px, `rgba(114,182,173,0.28)` for 01/02, `rgba(242,166,90,0.35)` for 03) + content column, separated by hairline borders (`rgba(243,239,231,0.08)`), `padding: 52px 0` between.
  - 01 Ask one question — italic quote "What made it harder to deliver a good shift this week?" + "Staff respond from a QR code or secure link in under a minute."
  - 02 See the pattern — "Shift Story organizes anonymous feedback into recurring operational themes, trends, and de-identified signals."
  - 03 Close the loop — "Turn a theme into an action, then share a clear "You said / We did" update with the team."

### 5. Action loop
- Dark panel `#0d151f`, bordered top/bottom hairline, padding `clamp(70px,9vw,120px)`.
- Headline (Fraunces 500, `clamp(28px,3.6vw,42px)`): "Feedback is only useful when staff can see what changed."
- Subline: "Shift Story helps leaders earn trust through visible follow-through—not another report."
- Four-column flex row (wraps on narrow), top hairline, vertical dividers between columns, each column top-padded 32px:
  1. Staff signal (italic Fraunces quote, 17px)
  2. Recurring theme (15.5px)
  3. Leader action (15.5px, key time value underlined amber)
  4. Visible update (Fraunces 19px, "You said" in teal / "We did" in amber)
- Column label color animates: active column's uppercase label turns `#F2A65A`, inactive `#6E7B89`, cycling every 2s (see Interactions).

### 6. Trust / anonymity (`#why-anonymity`)
- Light panel, background `#F3EFE7`, text `#0B1118`, padding `clamp(70px,9vw,120px)`, max-width 900px.
- Small mono tag "Privacy, by design" — `ui-monospace`, 11px uppercase, color `#8a6a3f`.
- Headline (Fraunces 500, `clamp(30px,3.8vw,44px)`): "Safe enough for staff to tell the truth."
- Subline: "Shift Story is designed to protect the signal, not identify the person." (17px, `#3a3530`).
- Numbered list (six items, hairline dividers `rgba(11,17,24,0.15)`, Fraunces numeral in `#8a6a3f`, body 15.5px):
  01 No names, employee IDs, emails, or staff logins required
  02 No patient information or clinical-event reporting
  03 Minimum response thresholds before unit insights appear
  04 De-identified themes and comments only
  05 No raw-response downloads for leaders
  06 Clear routing to existing safety-event and HR channels

### 7. Who it's for
- Max-width 1100px, headline (Fraunces 500, `clamp(28px,3.6vw,42px)`): "Built for the leaders closest to the work."
- Subline (15px, `#8B99A8`): "Begin with one unit. Build trust. Make visible improvements. Expand when the team asks for more."
- Bordered band (top/bottom hairline `rgba(243,239,231,0.14)`, padding `36px 0`) containing one italic Fraunces line (`clamp(19px,2.4vw,27px)`, line-height 1.75) listing all six roles separated by a dim middot: Chief Nursing Officers · Directors of Nursing · Nurse Managers · Assistant Nurse Managers · Clinical Educators · Quality and Operations Leaders.

### 8. Founder note
- Max-width 760px, top hairline border, padding `clamp(60px,8vw,100px)`.
- Italic Fraunces headline (`clamp(24px,2.8vw,32px)`): "Built by a nurse who understands the shift."
- Body copy (16px, `#B7C0CC`, line-height 1.7).
- Small link "Built by MydBrain" (13px, `#6E7B89`).

### 9. Waitlist (`#waitlist`)
- Gradient background `linear-gradient(180deg,#0B1118,#0d151f)`, top hairline, padding `clamp(70px,9vw,120px)`.
- Two-column grid (`repeat(auto-fit,minmax(320px,1fr))`, gap 56px), max-width 960px.
- Left: headline (Fraunces 500, `clamp(28px,3.6vw,40px)`): "Be among the first nurse leaders to hear the real story of the shift." + supporting paragraph + privacy microcopy (13px, `#6E7B89`).
- Right: the form (see Interactions/State) or, after submit, a success panel: `#111b26` bg, `1px solid rgba(114,182,173,0.4)` border, radius 2px, padding 32px — "You're on the list." (Fraunces 22px) + "We'll be in touch when the founding cohort opens." (15px, `#B7C0CC`).

### 10. Footer
- Padding 48px, top hairline. Left: "Shift Story" wordmark (Fraunces 18px) + tagline "Hear the shift. Fix the work." (13px, `#6E7B89`). Right: links "Built by MydBrain", "Privacy", "Contact" (13px, `#6E7B89`).

## Interactions & Behavior

**Hero typewriter** — cycles through three quotes, typing at ~45ms/char, pauses 2.4s at full phrase, deletes at ~22ms/char, 400ms pause before next phrase, loops indefinitely:
1. "I know something is off, but I do not know where to start."
2. "My team thinks leadership does not listen."
3. "I only hear about problems when they become a crisis."
A blinking amber `|` cursor (500ms interval) follows the text. Under `prefers-reduced-motion: reduce`, freeze on phrase 1, no blink.

**Action-loop column highlight** — every 2s, advance to the next of the 4 columns (staff signal → theme → action → update) and set its label color to amber (`#F2A65A`); others return to muted `#6E7B89`. Disabled under reduced motion / when motion toggle is off (see Design Tokens/props note).

**Hero entrance** — on load, elements slide up (`translateY(16px)` → `0`) with staggered delays (0, 0.08s, 0.2s, 0.32s, 0.42s, 0.5s); opacity stays at 1 throughout (transform-only, so text never disappears if animation is skipped).

**Background grain** — a fixed, full-viewport `repeating-linear-gradient` scanline texture at 5% opacity slowly drifts (`translate(-40px,-30px)` over 14s, linear, infinite) for the paper/night-shift texture.

**Waitlist form** — controlled inputs; on submit, disable button (label → "Submitting…"), after ~700ms mock delay swap to the success panel. Validation: required — first name, last name, work email (type=email), organization, role (select). Optional — primary unit, and a free-text question ("What is one issue that makes your team's shifts harder than they need to be?").

**Focus states** — all interactive elements (nav links excluded) get a visible `2px solid` outline in `#72B6AD` (form fields) or `#F3EFE7` (buttons), `1–2px` offset, on `:focus-visible`.

**prefers-reduced-motion: reduce`** — globally disables all `animation`/`transition` (grain drift, cursor blink, column-highlight cycling); typewriter freezes on the first quote.

## State Management
- `formData`: `{ firstName, lastName, email, org, role, unit, issue }` — plain controlled-input state.
- `submitting: boolean`, `submitted: boolean` — drives button label and the form ⇄ success-panel swap.
- `typedText: string`, `cursorOn: boolean` — typewriter state (current substring, cursor blink toggle).
- `activeStage: 0-3` — which action-loop column is highlighted.
- No real backend call — submit handler is a mock (`setTimeout` → success). Wire to actual signup endpoint in production.

## Design Tokens

**Colors**
- Background (ink): `#0B1118`
- Background panel (slightly lighter): `#0d151f`, `#111b26`, `#151f2b`
- Primary text (bone/ivory): `#F3EFE7`
- Secondary text (blue-gray): `#B7C0CC`
- Tertiary/muted text: `#8B99A8`, `#6E7B89`
- Rule/line (dim): `#3d4c5a`
- Accent — amber/safety-orange: `#F2A65A` (hover `#f5b975`)
- Accent — sea-glass teal: `#72B6AD`
- Light panel (trust section): background `#F3EFE7`, text `#0B1118`, secondary text `#3a3530`, numeral accent `#8a6a3f`
- Hairline borders: `rgba(243,239,231,0.08–0.18)` on dark; `rgba(11,17,24,0.15)` on light

**Typography**
- Display/serif: **Fraunces** (weights 300–600, plus italic 400) — headlines, numerals, quotes.
- Body/sans: **Plus Jakarta Sans** (400–700) — body copy, UI, form.
- Base body size 16px; hero headline scales `clamp(30px,4.6vw,52px)`; section headlines `clamp(28px,3.6vw,42px)`; line-height 1.5–1.75 for body, 1.03–1.3 for display.

**Spacing scale** (approx.): 4, 8, 12, 14, 16, 20, 22, 24, 28, 32, 36, 44, 48, 52, 56, 64, then fluid `clamp()` section paddings between 60–180px.

**Border radius**: 2px everywhere (buttons, inputs, panels) — intentionally sharp, not the typical rounded-SaaS look.

**Shadows**: none used — flat, editorial, hairline-rule based rather than shadow-based depth.

## Assets
No images or icons — the design is entirely typography, hairline rules, flat color fields, and one CSS-drawn scanline grain texture (no external asset). Fonts loaded via Google Fonts (`Fraunces`, `Plus Jakarta Sans`).

## Files
- `shift-story-landing.dc.html` — the full design reference (structure, inline styles, and the typewriter/action-loop/form logic written as plain JS in a `<script>` at the bottom). Read this file top to bottom as the source of truth for exact markup order, copy, and computed style values referenced above.
