-- Phase 1: organizations, manager profiles, units, and unit membership.
--
-- Run in the Supabase SQL Editor, or with `supabase db push`. Idempotent.

/* -------------------------------------------------------------------------- */
/* Tables                                                                     */
/* -------------------------------------------------------------------------- */

create table if not exists public.organizations (
  id          uuid        primary key default gen_random_uuid(),
  name        text        not null check (length(trim(name)) > 0),
  created_at  timestamptz not null default now()
);

-- One row per signed-in manager, keyed to the Supabase auth user.
create table if not exists public.profiles (
  id          uuid        primary key references auth.users (id) on delete cascade,
  org_id      uuid        not null references public.organizations (id) on delete cascade,
  full_name   text        not null check (length(trim(full_name)) > 0),
  job_title   text,
  created_at  timestamptz not null default now()
);

create index if not exists profiles_org_id_idx on public.profiles (org_id);

-- A unit is the boundary of trust: responses, thresholds and stories are all
-- scoped to one unit, and staff decide whether to answer based on it.
create table if not exists public.units (
  id          uuid        primary key default gen_random_uuid(),
  org_id      uuid        not null references public.organizations (id) on delete cascade,
  name        text        not null check (length(trim(name)) > 0),
  created_by  uuid        references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  unique (org_id, name)
);

create index if not exists units_org_id_idx on public.units (org_id);

-- Who may see a unit's stories. Deliberately explicit rather than implied by
-- org membership: whether a DON or CNO can read a unit's themes is a trust
-- decision, and it should be a row someone created, not a default.
create table if not exists public.unit_members (
  unit_id     uuid        not null references public.units (id) on delete cascade,
  profile_id  uuid        not null references public.profiles (id) on delete cascade,
  role        text        not null default 'manager' check (role in ('manager', 'viewer')),
  created_at  timestamptz not null default now(),
  primary key (unit_id, profile_id)
);

create index if not exists unit_members_profile_id_idx on public.unit_members (profile_id);

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

-- SECURITY DEFINER on purpose. Every policy below needs the caller's org, and
-- reading it through a normal query would re-enter the profiles policy that is
-- asking the question — Postgres raises "infinite recursion detected in policy".
-- A definer function reads past RLS once and breaks the cycle.
create or replace function public.current_org_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select org_id from public.profiles where id = auth.uid()
$$;

-- Provisions an organization and profile for a newly confirmed signup, reading
-- the values the signup form passed as user metadata. Runs as definer so it can
-- write both tables before the user has any profile (and therefore any org) to
-- be authorized against.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_org_id uuid;
begin
  insert into public.organizations (name)
  values (
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'organization'), ''),
      'My organization'
    )
  )
  returning id into new_org_id;

  insert into public.profiles (id, org_id, full_name, job_title)
  values (
    new.id,
    new_org_id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
      split_part(coalesce(new.email, 'there@'), '@', 1)
    ),
    nullif(trim(new.raw_user_meta_data ->> 'job_title'), '')
  );

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

/* -------------------------------------------------------------------------- */
/* Row-Level Security                                                         */
/* -------------------------------------------------------------------------- */

alter table public.organizations enable row level security;
alter table public.profiles      enable row level security;
alter table public.units         enable row level security;
alter table public.unit_members  enable row level security;

-- organizations: readable by its own members. No insert policy — organizations
-- are created only by handle_new_user(), which bypasses RLS as definer.
drop policy if exists organizations_select on public.organizations;
create policy organizations_select on public.organizations
  for select to authenticated
  using (id = public.current_org_id());

-- profiles: colleagues are visible within an org; you may edit only your own
-- row, and may not move yourself to another org.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (org_id = public.current_org_id());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and org_id = public.current_org_id());

-- units: fully scoped to the caller's organization in both directions, so a
-- forged org_id in an insert is rejected by the check rather than silently
-- writing into someone else's org.
drop policy if exists units_select on public.units;
create policy units_select on public.units
  for select to authenticated
  using (org_id = public.current_org_id());

drop policy if exists units_insert on public.units;
create policy units_insert on public.units
  for insert to authenticated
  with check (org_id = public.current_org_id());

drop policy if exists units_update on public.units;
create policy units_update on public.units
  for update to authenticated
  using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());

drop policy if exists units_delete on public.units;
create policy units_delete on public.units
  for delete to authenticated
  using (org_id = public.current_org_id());

-- unit_members: reachable only through a unit the caller's org owns.
drop policy if exists unit_members_select on public.unit_members;
create policy unit_members_select on public.unit_members
  for select to authenticated
  using (
    exists (
      select 1 from public.units u
      where u.id = unit_members.unit_id and u.org_id = public.current_org_id()
    )
  );

drop policy if exists unit_members_insert on public.unit_members;
create policy unit_members_insert on public.unit_members
  for insert to authenticated
  with check (
    exists (
      select 1 from public.units u
      where u.id = unit_members.unit_id and u.org_id = public.current_org_id()
    )
    and exists (
      select 1 from public.profiles p
      where p.id = unit_members.profile_id and p.org_id = public.current_org_id()
    )
  );

drop policy if exists unit_members_delete on public.unit_members;
create policy unit_members_delete on public.unit_members
  for delete to authenticated
  using (
    exists (
      select 1 from public.units u
      where u.id = unit_members.unit_id and u.org_id = public.current_org_id()
    )
  );
