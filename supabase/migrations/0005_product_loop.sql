-- Milestone: the complete product loop.
-- Ask -> listen -> see the signal -> act -> show -> repeat.
--
-- Run in the Supabase SQL Editor, or with `supabase db push`. Idempotent.

/* -------------------------------------------------------------------------- */
/* Units gain setup detail                                                    */
/* -------------------------------------------------------------------------- */

alter table public.units add column if not exists unit_type   text;
alter table public.units add column if not exists staff_count integer;

do $$ begin
  alter table public.units add constraint units_staff_count_sane
    check (staff_count is null or (staff_count > 0 and staff_count <= 2000));
exception when duplicate_object then null; end $$;

/* -------------------------------------------------------------------------- */
/* Responses gain optional context                                            */
/* -------------------------------------------------------------------------- */

-- Coarse buckets only. Anything finer (exact shift date, role, tenure) would
-- narrow a response toward one person on a small unit.
alter table public.responses add column if not exists shift  text;
alter table public.responses add column if not exists impact text;

-- A conservative, de-identified excerpt computed at submission time. NULL when
-- the text could not be confidently de-identified — the leader-facing path
-- reads only this column and never `body`.
alter table public.responses add column if not exists safe_excerpt text;

do $$ begin
  alter table public.responses add constraint responses_shift_valid
    check (shift is null or shift in ('day', 'evening', 'night'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.responses add constraint responses_impact_valid
    check (impact is null or impact in ('a_little', 'some', 'a_lot'));
exception when duplicate_object then null; end $$;

/* -------------------------------------------------------------------------- */
/* Response tokens: hashed lookup                                             */
/* -------------------------------------------------------------------------- */

-- The submit path verifies by hash. The plaintext stays for QR display: this
-- token is printed and taped to a break-room wall, so it is public by
-- construction and hashing it would protect nothing. Per-recipient single-use
-- tokens (the SMS milestone) are the ones that will be stored hash-only.
alter table public.response_tokens add column if not exists token_hash text;

-- Backfill for rows created before this column existed. pgcrypto lives in
-- `public` on a stock Postgres but in `extensions` on Supabase, so the search
-- path covers both; if digest() is reachable from neither, the backfill is
-- skipped. New tokens get their hash from the application at creation time, so
-- nothing depends on this succeeding.
do $$
begin
  perform set_config('search_path', 'public, extensions', true);
  update public.response_tokens
     set token_hash = encode(digest(token, 'sha256'), 'hex')
   where token_hash is null;
exception
  when undefined_function or invalid_schema_name then
    raise notice 'token_hash backfill skipped: digest() unavailable';
end $$;

create index if not exists response_tokens_hash_idx on public.response_tokens (token_hash);

/* -------------------------------------------------------------------------- */
/* Theme catalog + per-response links                                         */
/* -------------------------------------------------------------------------- */

create table if not exists public.theme_catalog (
  key       text primary key,
  label     text not null,
  sort      integer not null
);

insert into public.theme_catalog (key, label, sort) values
  ('staffing',      'Staffing & workload',   1),
  ('equipment',     'Equipment & supplies',  2),
  ('communication', 'Communication',         3),
  ('workflow',      'Workflow',              4),
  ('documentation', 'Documentation',         5),
  ('scheduling',    'Scheduling',            6),
  ('environment',   'Environment',           7),
  ('other',         'Other',                 8)
on conflict (key) do update set label = excluded.label, sort = excluded.sort;

-- A response may carry more than one theme.
create table if not exists public.response_themes (
  response_id uuid not null references public.responses (id) on delete cascade,
  theme_key   text not null references public.theme_catalog (key),
  primary key (response_id, theme_key)
);

create index if not exists response_themes_theme_idx on public.response_themes (theme_key);

/* -------------------------------------------------------------------------- */
/* Leader actions and You Said / We Did                                       */
/* -------------------------------------------------------------------------- */

create table if not exists public.leader_actions (
  id           uuid        primary key default gen_random_uuid(),
  unit_id      uuid        not null references public.units (id) on delete cascade,
  cycle_id     uuid        references public.cycles (id) on delete set null,
  theme_key    text        not null references public.theme_catalog (key),
  description  text        not null check (length(trim(description)) > 0),
  owner        text,
  status       text        not null default 'planned'
                 check (status in ('planned', 'in_progress', 'done')),
  target_date  date,
  created_by   uuid        references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now()
);

create index if not exists leader_actions_unit_idx on public.leader_actions (unit_id, created_at desc);

create table if not exists public.team_updates (
  id           uuid        primary key default gen_random_uuid(),
  unit_id      uuid        not null references public.units (id) on delete cascade,
  action_id    uuid        references public.leader_actions (id) on delete set null,
  you_said     text        not null check (length(trim(you_said)) > 0),
  we_did       text        not null check (length(trim(we_did)) > 0),
  status       text        not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  created_by   uuid        references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists team_updates_unit_idx on public.team_updates (unit_id, created_at desc);

/* -------------------------------------------------------------------------- */
/* Threshold enforcement — server side, in the database                       */
/* -------------------------------------------------------------------------- */

-- Aggregate theme counts for a cycle, or NOTHING below the threshold.
--
-- This is where the privacy rule actually lives. `response_themes` carries no
-- select policy, so there is no query a leader can write that counts around
-- this function — hiding the panel in the UI is not the control.
create or replace function public.cycle_theme_counts(p_cycle_id uuid)
returns table (theme_key text, label text, mentions bigint)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_cycle record;
begin
  select c.*, u.org_id into v_cycle
  from public.cycles c
  join public.units u on u.id = c.unit_id
  where c.id = p_cycle_id;

  if not found then return; end if;

  -- Tenant check inside the definer function: it runs with elevated rights, so
  -- it must re-establish what the caller is entitled to see.
  if v_cycle.org_id is distinct from public.current_org_id() then return; end if;

  if v_cycle.response_count < v_cycle.min_responses then return; end if;

  return query
    select tc.key, tc.label, count(rt.response_id) as mentions
    from public.theme_catalog tc
    join public.response_themes rt on rt.theme_key = tc.key
    join public.responses r on r.id = rt.response_id
    where r.cycle_id = p_cycle_id
    group by tc.key, tc.label, tc.sort
    having count(rt.response_id) > 0
    order by count(rt.response_id) desc, tc.sort;
end;
$$;

-- De-identified excerpts, or NOTHING below the threshold.
--
-- Returns only `safe_excerpt`, never `body`. A response whose text could not be
-- confidently de-identified has a NULL excerpt and is simply absent.
create or replace function public.cycle_safe_excerpts(p_cycle_id uuid, p_limit integer default 6)
returns table (theme_key text, excerpt text)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_cycle record;
begin
  select c.*, u.org_id into v_cycle
  from public.cycles c
  join public.units u on u.id = c.unit_id
  where c.id = p_cycle_id;

  if not found then return; end if;
  if v_cycle.org_id is distinct from public.current_org_id() then return; end if;
  if v_cycle.response_count < v_cycle.min_responses then return; end if;

  return query
    select coalesce(rt.theme_key, 'other') as theme_key, r.safe_excerpt
    from public.responses r
    left join lateral (
      -- Qualified: an unqualified `theme_key` here is ambiguous against this
      -- function's own OUT column of the same name, and Postgres rejects it.
      select x.theme_key from public.response_themes x
      where x.response_id = r.id limit 1
    ) rt on true
    where r.cycle_id = p_cycle_id
      and r.safe_excerpt is not null
    -- Random ordering: presenting excerpts in row order would leak the
    -- sequence responses arrived in.
    order by random()
    limit greatest(p_limit, 0);
end;
$$;

/* -------------------------------------------------------------------------- */
/* Row-Level Security                                                         */
/* -------------------------------------------------------------------------- */

alter table public.theme_catalog   enable row level security;
alter table public.response_themes enable row level security;
alter table public.leader_actions  enable row level security;
alter table public.team_updates    enable row level security;

-- The catalog is reference data, readable by any signed-in leader.
drop policy if exists theme_catalog_select on public.theme_catalog;
create policy theme_catalog_select on public.theme_catalog
  for select to authenticated using (true);

-- response_themes: NO POLICIES, deliberately. Counting rows here would be a
-- way around the threshold. Aggregates come only from cycle_theme_counts().

drop policy if exists leader_actions_select on public.leader_actions;
create policy leader_actions_select on public.leader_actions
  for select to authenticated
  using (exists (select 1 from public.units u
                 where u.id = leader_actions.unit_id and u.org_id = public.current_org_id()));

drop policy if exists leader_actions_insert on public.leader_actions;
create policy leader_actions_insert on public.leader_actions
  for insert to authenticated
  with check (exists (select 1 from public.units u
                      where u.id = leader_actions.unit_id and u.org_id = public.current_org_id()));

drop policy if exists leader_actions_update on public.leader_actions;
create policy leader_actions_update on public.leader_actions
  for update to authenticated
  using (exists (select 1 from public.units u
                 where u.id = leader_actions.unit_id and u.org_id = public.current_org_id()))
  with check (exists (select 1 from public.units u
                      where u.id = leader_actions.unit_id and u.org_id = public.current_org_id()));

drop policy if exists team_updates_select on public.team_updates;
create policy team_updates_select on public.team_updates
  for select to authenticated
  using (exists (select 1 from public.units u
                 where u.id = team_updates.unit_id and u.org_id = public.current_org_id()));

drop policy if exists team_updates_insert on public.team_updates;
create policy team_updates_insert on public.team_updates
  for insert to authenticated
  with check (exists (select 1 from public.units u
                      where u.id = team_updates.unit_id and u.org_id = public.current_org_id()));

drop policy if exists team_updates_update on public.team_updates;
create policy team_updates_update on public.team_updates
  for update to authenticated
  using (exists (select 1 from public.units u
                 where u.id = team_updates.unit_id and u.org_id = public.current_org_id()))
  with check (exists (select 1 from public.units u
                      where u.id = team_updates.unit_id and u.org_id = public.current_org_id()));
