# Landing page design canvas

Source artboards for the landing page redesign, published as a Claude Design
canvas. These are the files to edit; the seeded `shift-story-landing.html`
bundle is generated from them and is gitignored.

| File | What it is |
| --- | --- |
| `Main.dc.html` | The landing page, desktop (1440px) |
| `MainMobile.dc.html` | The same page at phone width (390px) |
| `DirectionWarm.dc.html` | Alternate hero — parchment ground, aimed at the nurse manager |
| `DirectionProof.dc.html` | Alternate hero — executive framing, aimed at the CNO |
| `canvas.json` | Frame positions, sizes, sticky notes, and the launch view |

## What this changes about the live page

The shipped page opens on the manager's problem ("I know something is off") and
never mentions patients. This draft leads with the **You said / We did exchange
in the hero** — the artifact a manager gets to post to their unit — and names
the chain from culture to care below the fold: safe to say → acted on → visible
→ caught earlier.

## Design system

Matches `app/globals.css` exactly: Fraunces and Plus Jakarta Sans, ink
`#0b1118`, amber `#f2a65a`, teal `#72b6ad`, parchment `#f3efe7`, 2px radii,
hairline rules, no shadows.

## Placeholders

The unit name, "11 of 14", and "6:45 p.m." are illustrative sample content
carried over from the existing action-loop section. The testimonial is a
bracketed placeholder, not a fabricated quote. Replace both with real material
from the first cohort.

## Frame sizes

`canvas.json` heights must exceed each artboard's rendered content or the frame
clips — the frames neither scale nor shrink. Both flowing boards currently run
~140px of slack. Re-measure after any change that adds vertical rhythm.
