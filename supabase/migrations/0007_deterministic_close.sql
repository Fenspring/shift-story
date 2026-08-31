-- Lets a cycle close without any AI dependency.
--
-- Until now the only path to finalize_story() went through the model call, so
-- an unset ANTHROPIC_API_KEY or a failed request meant the cycle stayed open
-- and the raw responses were never deleted. Deletion is the promise the whole
-- privacy model rests on; it cannot hang off an optional dependency.
--
-- This builds the story from the deterministic theme counts already sitting in
-- response_themes, then hands off to finalize_story() so the atomic write,
-- delete and status flip stay in exactly one place.

create or replace function public.finalize_story_from_counts(p_cycle_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total  integer;
  v_themes jsonb;
begin
  select response_count into v_total from public.cycles where id = p_cycle_id;
  if v_total is null then
    raise exception 'cycle % not found', p_cycle_id;
  end if;

  select coalesce(
           jsonb_agg(
             jsonb_build_object(
               'label',   t.label,
               'summary', t.mentions || ' of ' || v_total ||
                          ' responses touched ' || lower(t.label) || '.',
               -- No representative statement: a paraphrase is the model's job,
               -- and inventing one from a keyword match would be a fabrication.
               'representative_statement', '',
               'mention_count', t.mentions
             )
             order by t.mentions desc, t.sort
           ),
           '[]'::jsonb
         )
    into v_themes
  from (
    select tc.label, tc.sort, count(*)::int as mentions
    from public.response_themes rt
    join public.responses r      on r.id = rt.response_id
    join public.theme_catalog tc on tc.key = rt.theme_key
    where r.cycle_id = p_cycle_id
    group by tc.label, tc.sort
  ) t;

  return public.finalize_story(p_cycle_id, 'deterministic-keyword-v1', v_themes);
end;
$$;

-- Server-only, like everything else that destroys data.
revoke all on function public.finalize_story_from_counts(uuid) from public, anon, authenticated;
