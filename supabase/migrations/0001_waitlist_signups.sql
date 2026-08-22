-- Waitlist signups for the Shift Story landing page.
--
-- Run this in the Supabase SQL Editor, or with `supabase db push` if you use
-- the CLI. It is idempotent — safe to run more than once.

create table if not exists public.waitlist_signups (
  id            uuid        primary key default gen_random_uuid(),
  first_name    text        not null,
  last_name     text        not null,
  email         text        not null unique,
  organization  text        not null,
  role          text        not null,
  unit          text,
  issue         text,
  created_at    timestamptz not null default now()
);

comment on table public.waitlist_signups is
  'Founding-cohort waitlist signups. Contains PII (name, work email, employer). Written only by the server using the secret key.';

create index if not exists waitlist_signups_created_at_idx
  on public.waitlist_signups (created_at desc);

-- Row-Level Security is enabled with NO policies, and that is deliberate.
--
-- With RLS on and no policy, the anon and authenticated roles can neither read
-- nor write this table through the public API. The only writer is the server,
-- which uses the secret key and bypasses RLS entirely.
--
-- Do not add an anon insert policy to "make the form work". That would let
-- anyone POST straight to PostgREST, skipping the rate limit, the honeypot and
-- the validation in /api/waitlist — and any read policy would expose the work
-- emails of every nurse leader who signed up.
alter table public.waitlist_signups enable row level security;

-- Verify after running:
--   select relrowsecurity from pg_class where relname = 'waitlist_signups';
--   -> must be true
--   select count(*) from pg_policies where tablename = 'waitlist_signups';
--   -> must be 0
