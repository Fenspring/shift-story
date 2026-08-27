-- Phase 2: weekly cycles, anonymous responses, and the QR tokens staff scan.
--
-- Run in the Supabase SQL Editor, or with `supabase db push`. Idempotent.

/* -------------------------------------------------------------------------- */
/* Units gain a timezone                                                      */
/* -------------------------------------------------------------------------- */

-- The deadline is "Friday" in the unit's own time. Without this, a Friday close
-- computed in UTC lands on Thursday evening for most of the US.
alter table public.units
  add column if not exists timezone text not null default 'UTC';

/* -------------------------------------------------------------------------- */
/* Cycles                                                                     */
/* -------------------------------------------------------------------------- */

create table if not exists public.cycles (
  id              uuid        primary key default gen_random_uuid(),
  unit_id         uuid        not null references public.units (id) on delete cascade,
  question        text        not null,
  opens_at        timestamptz not null default now(),
  closes_at       timestamptz not null,
  min_responses   integer     not null default 8 check (min_responses > 0),
  -- Maintained by a trigger so a manager can read the count without any path
  -- to the responses themselves.
  response_count  integer     not null default 0,
  status          text        not null default 'open'
                    check (status in ('open', 'closed', 'insufficient', 'story_ready')),
  created_at      timestamptz not null default now(),
  check (closes_at > opens_at)
);

create index if not exists cycles_unit_id_idx on public.cycles (unit_id, opens_at desc);

-- At most one collecting cycle per unit. Two open cycles would split responses
-- and could push both below the threshold.
create unique index if not exists cycles_one_open_per_unit
  on public.cycles (unit_id) where status = 'open';

/* -------------------------------------------------------------------------- */
/* Responses                                                                  */
/* -------------------------------------------------------------------------- */

-- Deliberately impoverished. There is no author column, no IP, no user agent,
-- no session, and no submission timestamp — not nullable, absent. A timestamp
-- alone would sign a response on a unit running two nurses overnight.
--
-- The id is a random v4 uuid rather than a sequence, so ordering by id does not
-- reveal submission order either.
create table if not exists public.responses (
  id        uuid primary key default gen_random_uuid(),
  cycle_id  uuid not null references public.cycles (id) on delete cascade,
  body      text not null check (length(trim(body)) > 0 and length(body) <= 2000)
);

create index if not exists responses_cycle_id_idx on public.responses (cycle_id);

/* -------------------------------------------------------------------------- */
/* Response tokens (the QR target)                                            */
/* -------------------------------------------------------------------------- */

create table if not exists public.response_tokens (
  id          uuid        primary key default gen_random_uuid(),
  unit_id     uuid        not null references public.units (id) on delete cascade,
  token       text        not null unique check (length(token) >= 20),
  created_at  timestamptz not null default now(),
  revoked_at  timestamptz
);

create unique index if not exists response_tokens_one_active_per_unit
  on public.response_tokens (unit_id) where revoked_at is null;

/* -------------------------------------------------------------------------- */
/* Counting                                                                   */
/* -------------------------------------------------------------------------- */

-- Keeps cycles.response_count in step with the responses table.
--
-- DELETE is deliberately not handled: raw responses are destroyed once their
-- story is written, and the count has to survive that as the historical record
-- of how many people spoke up.
create or replace function public.sync_response_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.cycles
       set response_count = response_count + 1
     where id = new.cycle_id;
  elsif tg_op = 'UPDATE' and new.cycle_id is distinct from old.cycle_id then
    -- A cycle that closes short carries its responses into the next one.
    update public.cycles
       set response_count = greatest(response_count - 1, 0)
     where id = old.cycle_id;
    update public.cycles
       set response_count = response_count + 1
     where id = new.cycle_id;
  end if;
  return new;
end;
$$;

drop trigger if exists responses_sync_count on public.responses;
create trigger responses_sync_count
  after insert or update on public.responses
  for each row execute function public.sync_response_count();

/* -------------------------------------------------------------------------- */
/* Deadline arithmetic                                                        */
/* -------------------------------------------------------------------------- */

-- The next Friday 23:59:59 in the unit's own timezone, as an absolute instant.
--
-- Kept in SQL because Postgres does timezone arithmetic correctly across DST
-- boundaries, which hand-rolled JavaScript date maths reliably does not.
create or replace function public.next_cycle_close(tz text)
returns timestamptz
language plpgsql
stable
as $$
declare
  local_now timestamp;
  friday    timestamp;
begin
  local_now := now() at time zone tz;

  -- date_trunc('week') lands on Monday 00:00; +4 days reaches Friday.
  friday := date_trunc('week', local_now)
            + interval '4 days'
            + interval '23 hours 59 minutes 59 seconds';

  -- Already past this week's close (Friday night, Saturday, Sunday) — go to the
  -- next one rather than opening a cycle that is born closed.
  if friday <= local_now then
    friday := friday + interval '7 days';
  end if;

  return friday at time zone tz;
end;
$$;

/* -------------------------------------------------------------------------- */
/* Row-Level Security                                                         */
/* -------------------------------------------------------------------------- */

alter table public.cycles          enable row level security;
alter table public.responses       enable row level security;
alter table public.response_tokens enable row level security;

-- cycles: managers read their own units' cycles. That exposes the count, the
-- question and the deadline — never a response. Writes go through the server.
drop policy if exists cycles_select on public.cycles;
create policy cycles_select on public.cycles
  for select to authenticated
  using (
    exists (
      select 1 from public.units u
      where u.id = cycles.unit_id and u.org_id = public.current_org_id()
    )
  );

-- response_tokens: managers read their own units' tokens, to render the QR.
drop policy if exists response_tokens_select on public.response_tokens;
create policy response_tokens_select on public.response_tokens
  for select to authenticated
  using (
    exists (
      select 1 from public.units u
      where u.id = response_tokens.unit_id and u.org_id = public.current_org_id()
    )
  );

-- responses: NO POLICIES. None, for any role, ever.
--
-- RLS is on and the policy list is empty, so anon and authenticated can neither
-- read nor write this table through the API. The only access is the server
-- holding the secret key, and the only read is the one that feeds theme
-- detection. There is deliberately no path from a manager to this text.
--
-- Verify:
--   select count(*) from pg_policies where tablename = 'responses';  -- must be 0
