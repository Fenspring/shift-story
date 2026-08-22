# Shift Story

Waitlist landing page for **Shift Story** — anonymous operational listening for
nurse leaders. One anonymous weekly question becomes a recurring theme, a leader
action, and a visible "You said / We did" update.

Built with Next.js (App Router), React, TypeScript, and Tailwind CSS v4.

## Getting started

```bash
npm install
cp .env.example .env.local   # optional for local dev, see Storage below
npm run dev                  # http://localhost:3000
```

| Script              | What it does                          |
| ------------------- | ------------------------------------- |
| `npm run dev`       | Dev server with hot reload            |
| `npm run build`     | Production build                      |
| `npm start`         | Serve the production build            |
| `npm run lint`      | ESLint (`eslint-config-next`)         |
| `npm run typecheck` | `tsc --noEmit`                        |

## Storage

Waitlist signups are written through a small store interface in
[`lib/waitlist/store.ts`](lib/waitlist/store.ts), which picks a backend from the
environment:

- **`DATABASE_URL` set** → Postgres. The `waitlist_signups` table is created on
  first write, so there is no migration step. Emails are stored lowercased with
  a unique constraint.
- **`DATABASE_URL` unset** → a local JSONL file at `.data/waitlist.jsonl`.
  **Development only.** In production the app throws on the first submission
  rather than accepting signups into an ephemeral serverless filesystem.

Set `DATABASE_SSL=false` for a local Postgres; leave it on for hosted providers
(Supabase, Neon, RDS) that present a self-signed chain.

To use a different backend — Supabase client, Airtable, an email service —
implement `WaitlistStore` and return it from `getWaitlistStore()`. Nothing else
in the app touches storage.

### Local Postgres

```bash
createdb shiftstory
DATABASE_URL=postgres://localhost:5432/shiftstory DATABASE_SSL=false npm run dev
```

## The waitlist endpoint

`POST /api/waitlist` — see [`app/api/waitlist/route.ts`](app/api/waitlist/route.ts).

- Validates with Zod ([`lib/waitlist/schema.ts`](lib/waitlist/schema.ts)) and
  returns per-field errors the form renders inline.
- Rate limits to 5 submissions per IP per 10 minutes. The limiter is in-process
  ([`lib/rate-limit.ts`](lib/rate-limit.ts)); move it to a shared store if the
  app runs on more than one instance.
- Carries a honeypot field. A tripped honeypot returns success and stores
  nothing, so the bot gets no signal about what it hit.
- Treats a duplicate email as success and writes no second row, so the form
  cannot be used to probe whether an address is already on the list.
- Logs failures without the submitted payload, which is PII.
- Optionally POSTs new signups to `WAITLIST_WEBHOOK_URL` (Slack, Zapier).
  A webhook failure is logged and never blocks the signup.

## Environment variables

See [`.env.example`](.env.example). All are optional in development.

| Variable                    | Purpose                                     |
| --------------------------- | ------------------------------------------- |
| `DATABASE_URL`              | Postgres connection string. Required in prod |
| `DATABASE_SSL`              | `false` to disable TLS (local Postgres)     |
| `WAITLIST_WEBHOOK_URL`      | Notify on each new signup                    |
| `NEXT_PUBLIC_SITE_URL`      | Canonical origin for metadata and sitemap    |
| `NEXT_PUBLIC_CONTACT_EMAIL` | Address shown on `/contact`                  |

## Project layout

```
app/
  page.tsx              Landing page composition
  layout.tsx            Fonts, metadata, theme
  globals.css           Tailwind v4 @theme design tokens
  api/waitlist/route.ts Signup endpoint
  privacy/  contact/    Standalone pages linked from the footer
  robots.ts sitemap.ts  SEO routes
components/             One component per landing-page section
lib/                    Validation, storage, rate limiting, hooks
design_handoff_shift_story_landing/
                        Original design reference (not built or linted)
```

## Design

Rebuilt from the design handoff in `design_handoff_shift_story_landing/`.
Colors, type, spacing, and motion timings carry over as Tailwind theme tokens in
`app/globals.css`. Notable deviations from that reference, all deliberate:

- **Fonts are self-hosted** through `next/font` rather than requested from
  Google Fonts at runtime — no third-party request, no layout shift.
- **The typewriter headline is hidden from assistive tech**, with one stable
  sentence rendered for screen readers and crawlers. The reference put
  `aria-live="polite"` on the animated text, which announces every keystroke.
- **The action-loop row stacks cleanly below `lg`.** The reference kept its
  column dividers and gutters when the columns wrapped.
- **Dead state was dropped.** The reference cycled an `activeTheme` value and
  three `themeNFill` colors that no markup consumed.
- The waitlist form posts to a real endpoint instead of a mocked `setTimeout`.

Motion honours `prefers-reduced-motion`: the grain drift, cursor blink, and
action-loop cycling stop, and the headline settles on its first phrase.

## Accessibility

Skip link, labelled form controls, `aria-invalid` and `aria-describedby` on
errored fields, an `alert` role on the form-level error, visible focus rings,
and a reduced-motion path. Worth re-checking with a screen reader before launch.

## Before going live

- Point `DATABASE_URL` at a real Postgres instance.
- Replace `/privacy` with a reviewed policy. The current page describes waitlist
  handling only and is explicitly marked pre-launch.
- Confirm the six anonymity commitments in the "Safe enough for staff to tell
  the truth" section are ones the product can actually keep — they are promises,
  not just copy.
- Set `NEXT_PUBLIC_SITE_URL` so metadata, `robots.txt`, and `sitemap.xml` use
  the real origin, and add an Open Graph image.
