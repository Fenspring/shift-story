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

Waitlist signups go through a `WaitlistStore` interface in
[`lib/waitlist/store.ts`](lib/waitlist/store.ts). The backend is chosen from the
environment, in this order:

1. **Supabase** — when `SUPABASE_URL` is set. This is the intended production
   backend.
2. **Direct Postgres** — when `DATABASE_URL` is set and Supabase is not.
3. **Local JSONL file** at `.data/waitlist.jsonl` — development only. In
   production the app throws on the first submission rather than accept signups
   onto an ephemeral serverless filesystem.

### Supabase setup

**1. Create the table.** Run
[`supabase/migrations/0001_waitlist_signups.sql`](supabase/migrations/0001_waitlist_signups.sql)
in the Supabase SQL Editor (or `supabase db push`). It is idempotent.

**2. Set the environment.** Copy `.env.example` to `.env.local` and fill in:

```
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=sb_secret_...
```

`SUPABASE_SECRET_KEY` is required. Writes use the secret key so they bypass
Row-Level Security — the publishable key cannot write this table, and the app
says so explicitly rather than failing with an opaque permission error.

### Why the table has RLS on and no policies

The migration enables Row-Level Security and defines **no** policies. That is
deliberate, and it is the security boundary for this table:

- The only writer is the server, using the secret key, which bypasses RLS.
- With RLS on and no policy, `anon` and `authenticated` can neither read nor
  write the table through the public API.

Do not add an `anon` insert policy to "make the form work" — that would let
anyone POST straight to PostgREST, skipping the rate limit, honeypot, and
validation in `/api/waitlist`. And any read policy would expose the work email
of every nurse leader who signed up. The table holds PII; treat it that way.

### Direct Postgres (alternative)

```bash
createdb shiftstory
SUPABASE_URL= DATABASE_URL=postgres://localhost:5432/shiftstory DATABASE_SSL=false npm run dev
```

The `waitlist_signups` table is created on first write. Set `DATABASE_SSL=false`
for a local server; leave it on for hosted providers with a self-signed chain.

### Other backends

Implement `WaitlistStore` and return it from `getWaitlistStore()`. Nothing else
in the app touches storage.

## The manager app (Phase 1)

Authenticated surface at `/app`, backed by `supabase/migrations/0002_core_schema.sql`.

| Route | Purpose |
| --- | --- |
| `/signup` · `/login` | Email + password. Signup provisions an organization and profile via the `handle_new_user` trigger |
| `/auth/callback` | Exchanges the email-confirmation code for a session |
| `/app` | The manager's units |
| `/app/units/new` · `/app/units/[id]` | Create and view a unit |

Every table has RLS enabled and is scoped to the caller's organization through
`current_org_id()` — a `SECURITY DEFINER` function, because reading the caller's
org through a normal query would re-enter the very policy asking the question and
Postgres would raise `infinite recursion detected in policy`.

`middleware.ts` refreshes the Supabase session, and its matcher is scoped to
`/app`, `/login`, and `/signup` on purpose: the landing page, the waitlist
endpoint, and the public pages must keep working when Supabase is down. Pages
re-check auth server-side with `getUser()` (never `getSession()`, which reads the
cookie without verifying it), so protected routes fail closed while public ones
fail open.

Product rules that are commitments rather than configuration live in
[`lib/cycle-policy.ts`](lib/cycle-policy.ts) and the reasoning behind them is in
[`docs/decisions.md`](docs/decisions.md).

### Verifying the schema without Supabase

The RLS policies can be exercised against a local Postgres by stubbing the parts
of Supabase they depend on — an `auth.users` table and an `auth.uid()` that reads
the JWT subject from a session setting. That is how the org-isolation behavior in
this repo was checked: two organizations, a unit each, then confirming neither
can see, insert into, or move itself into the other.

## Cycles and responses (Phase 2)

Backed by `supabase/migrations/0003_cycles_and_responses.sql`.

| Route | Who | Purpose |
| --- | --- | --- |
| `/app/units/[id]` | Manager | Cycle status, response count, QR code, rotate link |
| `/app/units/[id]/poster` | Manager | Printable QR for the break room |
| `/r/[token]` | Staff | The response form. No auth, no index |
| `/api/respond` | Staff | Validates, checks the deadline, writes the response |

A cycle opens with the fixed weekly question and closes Friday 23:59:59 in the
unit's own timezone, computed by `next_cycle_close()` in Postgres so DST is
handled correctly. `cycles.response_count` is maintained by a trigger, which is
what lets a manager read a count while having no path at all to the responses.

**`responses` has no policies.** RLS is on and the policy list is empty, so
neither `anon` nor `authenticated` can read or write it through the API — the
only access is the server holding the secret key. The table also has no author
column, no IP, no user agent and no submission timestamp; a timestamp alone
would sign a response on a unit running two nurses overnight.

Verify after migrating:

```sql
select count(*) from pg_policies where tablename = 'responses';  -- must be 0
select relrowsecurity from pg_class where relname = 'responses';  -- must be true
```

## Supabase client helpers

[`utils/supabase/`](utils/supabase) holds the standard session-aware clients:
`server.ts` for Server Components and Route Handlers, `client.ts` for Client
Components, and `middleware.ts` for refreshing auth sessions.

**None of these are used yet.** The app has no authenticated routes — the
waitlist writes server-side with the secret key and never touches a user
session. They are scaffolding for when authenticated pages arrive (a leader
dashboard, for instance).

In particular there is no root `middleware.ts` invoking `updateSession`, because
that would add a hop to every request for no benefit today. To activate it:

```ts
// middleware.ts
export { updateSession as middleware } from "@/utils/supabase/middleware";
export const config = { matcher: ["/dashboard/:path*"] };
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

| Variable                            | Purpose                                       |
| ----------------------------------- | --------------------------------------------- |
| `SUPABASE_URL`                      | Project URL. Selects the Supabase backend      |
| `SUPABASE_SECRET_KEY`               | **Secret.** Server-side writes, bypasses RLS   |
| `SUPABASE_PUBLISHABLE_KEY`          | Public key for session-scoped clients          |
| `SUPABASE_JWKS_URL`                 | JWKS endpoint for JWT verification             |
| `NEXT_PUBLIC_SUPABASE_URL`          | Browser-visible project URL                    |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Browser-visible publishable key            |
| `DATABASE_URL`                      | Direct Postgres, used when Supabase is unset   |
| `DATABASE_SSL`                      | `false` to disable TLS (local Postgres)        |
| `WAITLIST_WEBHOOK_URL`              | Notify on each new signup                      |
| `NEXT_PUBLIC_SITE_URL`              | Canonical origin for metadata and sitemap      |
| `NEXT_PUBLIC_CONTACT_EMAIL`         | Address shown on `/contact`                    |

Never prefix `SUPABASE_SECRET_KEY` with `NEXT_PUBLIC_`. Anything so prefixed is
inlined into the client bundle and served to every visitor.

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
utils/supabase/         Session-aware Supabase clients (unused until auth)
supabase/migrations/    SQL for the waitlist table and its RLS posture
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

- Run `supabase/migrations/0001_waitlist_signups.sql` against the project, then
  confirm RLS is on and the table has zero policies (the migration ends with the
  two queries to check).
- Set `SUPABASE_SECRET_KEY` in the deployment environment, not just locally.
- Replace `/privacy` with a reviewed policy. The current page describes waitlist
  handling only and is explicitly marked pre-launch.
- Confirm the six anonymity commitments in the "Safe enough for staff to tell
  the truth" section are ones the product can actually keep — they are promises,
  not just copy.
- Set `NEXT_PUBLIC_SITE_URL` so metadata, `robots.txt`, and `sitemap.xml` use
  the real origin, and add an Open Graph image.
