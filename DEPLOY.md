# Deploying Shift Story to Netlify

## 1. Rotate the Supabase secret key first

The current key was pasted into a chat transcript. Roll it in **Project
Settings → API Keys** before it goes into any hosting environment, and update
`.env.local` with the new one.

## 2. Apply the outstanding migration

`supabase/migrations/0007_deterministic_close.sql` has not been applied to the
project yet. Run it in the SQL Editor. Without it the hourly close job cannot
finalize a cycle unless `ANTHROPIC_API_KEY` is set — see "Why the close job no
longer needs AI" below.

Confirm all seven are present:

```sql
select count(*) from pg_proc where proname = 'finalize_story_from_counts';  -- 1
```

## 3. Connect the repository

In Netlify: **Add new project → Import an existing project → GitHub →
`Fenspring/shift-story`**. `netlify.toml` supplies the build command, publish
directory, Node version and the Next.js runtime plugin, so leave the build
settings at their detected defaults.

## 4. Environment variables

**Project configuration → Environment variables.** Mark the two secrets as
secret so they are hidden in the UI and build logs.

| Variable | Value | Secret |
| --- | --- | --- |
| `SUPABASE_URL` | `https://<ref>.supabase.co` | no |
| `SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_…` | no |
| `SUPABASE_SECRET_KEY` | `sb_secret_…` (the rotated one) | **yes** |
| `NEXT_PUBLIC_SUPABASE_URL` | same as `SUPABASE_URL` | no |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | same as the publishable key | no |
| `NEXT_PUBLIC_SITE_URL` | your real domain, e.g. `https://shiftstory.app` | no |
| `CRON_SECRET` | a long random string | **yes** |
| `ANTHROPIC_API_KEY` | optional — see below | **yes** |
| `NEXT_PUBLIC_CONTACT_EMAIL` | address shown on `/contact` | no |

Generate the cron secret with:

```bash
openssl rand -base64 48
```

### `NEXT_PUBLIC_SITE_URL` is the one that bites

QR codes encode whatever origin the app resolves at generation time, and
`currentOrigin()` falls back to the request host. Generate a QR from a deploy
preview and it encodes the *preview* URL — which then gets **printed and taped
to a break-room wall**. A wrong origin at print time means physically
distributed dead links you cannot recall.

Set this to the real domain before anyone prints a poster, and re-check it after
any domain change.

## 5. Supabase auth redirect URLs

**Authentication → URL Configuration:**

- Site URL: your production domain
- Redirect URLs: add `https://<your-domain>/auth/callback`

Email confirmation links point at these. Miss this step and signup completes but
the confirmation link fails.

While you are there, turn on **leaked password protection** (Authentication →
Policies) — flagged by the Supabase security advisor.

## 6. Verify the deploy

```bash
SUPABASE_URL=… SUPABASE_SECRET_KEY=… SUPABASE_PUBLISHABLE_KEY=… npm run verify
```

Then a real click-through: sign up, confirm by email, create a unit, open the
week's question, scan the QR from a phone, submit a response.

## The hourly close job

`netlify/functions/cycle-close.mts` runs `@hourly` and POSTs to
`/api/cycles/close` with the bearer `CRON_SECRET`. The function holds no product
logic — only the schedule and the secret — so the same endpoint serves the
schedule, CI, and manual runs.

Hourly rather than weekly because a cycle closes at Friday 23:59:59 **in its own
unit's timezone**, and units can sit in different zones. The sweep picks each one
up shortly after its own deadline; the endpoint is idempotent, so the other 167
runs a week are no-ops.

**Scheduled functions only run on published production deploys** — never on
deploy previews or branch deploys. To test before going live:

```bash
netlify functions:invoke cycle-close
```

### Why the close job no longer needs AI

Closing a cycle used to require a Claude call: the only route to
`finalize_story()` went through the model, so an unset `ANTHROPIC_API_KEY` or a
failed request left the cycle open and **the raw responses undeleted**. Deletion
is the promise the whole privacy model rests on, and it cannot hang off an
optional dependency.

The close path now freezes the deterministic theme counts already sitting in
`response_themes` and deletes the raw text regardless. When `ANTHROPIC_API_KEY`
is set the narrative themes are richer and get used instead; when it is absent
or the call fails, the cycle still closes and the originals are still destroyed.

Stories written without the model are tagged `deterministic-keyword-v1` and
carry no representative statement — a keyword match cannot honestly paraphrase.

## Still open before real nurses use this

- **One organization per signup, no invite flow.** Two managers at the same
  hospital get two separate organizations that cannot see each other.
- **No account deletion path.** Deleting a user orphans their organization and
  everything under it; `organizations` has no foreign key to `auth.users`.
- **`/privacy` is marked pre-launch.** You would be collecting real work emails
  and real staff free text against a placeholder policy.
- **The rate limiter is in-process**, so it resets per instance. Move it to a
  shared store before traffic spreads across several.
- **No CI.** Netlify builds catch build failures, but `lint`, `typecheck` and
  `npm run verify` should gate merges.
