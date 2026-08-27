-- Phase 3: frozen stories, themes, and the destruction of raw responses.
--
-- Run in the Supabase SQL Editor, or with `supabase db push`. Idempotent.

/* -------------------------------------------------------------------------- */
/* Tables                                                                     */
/* -------------------------------------------------------------------------- */

create table if not exists public.stories (
  id              uuid        primary key default gen_random_uuid(),
  -- UNIQUE is the guarantee, not a convenience. A story is written once and
  -- never regenerated: if it refreshed as responses arrived, comparing
  -- consecutive versions would isolate individual contributions.
  cycle_id        uuid        not null unique references public.cycles (id) on delete cascade,
  unit_id         uuid        not null references public.units (id) on delete cascade,
  -- Snapshot: the responses themselves are gone by the time anyone reads this.
  response_count  integer     not null,
  model           text        not null,
  generated_at    timestamptz not null default now()
);

create index if not exists stories_unit_id_idx on public.stories (unit_id, generated_at desc);

create table if not exists public.themes (
  id                        uuid    primary key default gen_random_uuid(),
  story_id                  uuid    not null references public.stories (id) on delete cascade,
  rank                      integer not null,
  label                     text    not null,
  summary                   text    not null,
  -- Paraphrased, never verbatim. On a small unit, phrasing is identity.
  representative_statement  text,
  mention_count             integer not null default 0,
  unique (story_id, rank)
);

create index if not exists themes_story_id_idx on public.themes (story_id, rank);

/* -------------------------------------------------------------------------- */
/* Finalizing a cycle                                                         */
/* -------------------------------------------------------------------------- */

-- Writes the story, its themes, and destroys the raw responses — atomically.
--
-- All of it in one function so the destruction cannot be orphaned from the
-- write that justifies it. If any step fails the whole thing rolls back and the
-- responses are still there to retry with; there is no window in which the text
-- is gone but the story was never recorded.
create or replace function public.finalize_story(
  p_cycle_id uuid,
  p_model    text,
  p_themes   jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cycle    record;
  v_story_id uuid;
  v_deleted  integer;
begin
  -- Lock the cycle so two concurrent closers cannot both pass the checks.
  select * into v_cycle from public.cycles where id = p_cycle_id for update;

  if not found then
    raise exception 'cycle % not found', p_cycle_id;
  end if;

  if v_cycle.status = 'story_ready' then
    raise exception 'cycle % already has a story; stories are never regenerated', p_cycle_id;
  end if;

  if v_cycle.response_count < v_cycle.min_responses then
    raise exception 'cycle % has % responses, below the minimum of %',
      p_cycle_id, v_cycle.response_count, v_cycle.min_responses;
  end if;

  insert into public.stories (cycle_id, unit_id, response_count, model)
  values (p_cycle_id, v_cycle.unit_id, v_cycle.response_count, p_model)
  returning id into v_story_id;

  insert into public.themes (story_id, rank, label, summary, representative_statement, mention_count)
  select
    v_story_id,
    (ordinality)::int,
    t ->> 'label',
    t ->> 'summary',
    nullif(t ->> 'representative_statement', ''),
    coalesce((t ->> 'mention_count')::int, 0)
  from jsonb_array_elements(p_themes) with ordinality as x(t, ordinality);

  -- The point of the whole exercise. Themes persist; what people typed does not.
  delete from public.responses where cycle_id = p_cycle_id;
  get diagnostics v_deleted = row_count;

  update public.cycles set status = 'story_ready' where id = p_cycle_id;

  raise notice 'cycle % finalized: story %, % raw responses destroyed',
    p_cycle_id, v_story_id, v_deleted;

  return v_story_id;
end;
$$;

-- Closes a cycle that fell short and carries its responses into the next one.
--
-- Discarding what staff took the trouble to write would be worse than a story
-- that spans two weeks on a quiet unit. The carried text is destroyed with
-- everything else when the story that finally includes it is written.
create or replace function public.carry_forward_cycle(
  p_cycle_id       uuid,
  p_next_closes_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cycle    record;
  v_next_id  uuid;
begin
  select * into v_cycle from public.cycles where id = p_cycle_id for update;

  if not found then
    raise exception 'cycle % not found', p_cycle_id;
  end if;

  if v_cycle.status <> 'open' then
    raise exception 'cycle % is not open (status %)', p_cycle_id, v_cycle.status;
  end if;

  -- Mark short first: the partial unique index permits only one open cycle per
  -- unit, so the new one cannot be created while this is still 'open'.
  update public.cycles set status = 'insufficient' where id = p_cycle_id;

  insert into public.cycles (unit_id, question, closes_at, min_responses)
  values (v_cycle.unit_id, v_cycle.question, p_next_closes_at, v_cycle.min_responses)
  returning id into v_next_id;

  -- The count trigger moves response_count across with the rows.
  update public.responses set cycle_id = v_next_id where cycle_id = p_cycle_id;

  return v_next_id;
end;
$$;

/* -------------------------------------------------------------------------- */
/* Row-Level Security                                                         */
/* -------------------------------------------------------------------------- */

alter table public.stories enable row level security;
alter table public.themes  enable row level security;

-- Managers read stories for units in their organization. Writes happen only
-- through finalize_story(), which runs as definer.
drop policy if exists stories_select on public.stories;
create policy stories_select on public.stories
  for select to authenticated
  using (
    exists (
      select 1 from public.units u
      where u.id = stories.unit_id and u.org_id = public.current_org_id()
    )
  );

drop policy if exists themes_select on public.themes;
create policy themes_select on public.themes
  for select to authenticated
  using (
    exists (
      select 1
      from public.stories s
      join public.units u on u.id = s.unit_id
      where s.id = themes.story_id and u.org_id = public.current_org_id()
    )
  );
