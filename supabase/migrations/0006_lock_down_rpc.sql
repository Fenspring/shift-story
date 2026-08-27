-- Closes the API surface on functions that were never meant to be called
-- directly. Found by the Supabase security advisor after 0005.
--
-- Every function in `public` is exposed at /rest/v1/rpc/<name> and granted to
-- anon and authenticated by default. finalize_story DELETES a cycle's raw
-- responses, so leaving it anon-callable meant anyone on the internet with a
-- cycle id could destroy a unit's week. All of these are invoked by the server
-- with the secret key (service_role), which keeps its grant.

/* -------------------------------------------------------------------------- */
/* Server-only: destructive or trigger-internal                               */
/* -------------------------------------------------------------------------- */

revoke all on function public.finalize_story(uuid, text, jsonb) from public, anon, authenticated;
revoke all on function public.carry_forward_cycle(uuid, timestamptz) from public, anon, authenticated;
revoke all on function public.next_cycle_close(text) from public, anon, authenticated;

-- Trigger functions. Postgres checks EXECUTE when the trigger is created, not
-- when it fires, so revoking here does not stop them running.
revoke all on function public.sync_response_count() from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;

/* -------------------------------------------------------------------------- */
/* Leader-facing: authenticated only                                          */
/* -------------------------------------------------------------------------- */

-- These self-guard (they compare the cycle's org against current_org_id() and
-- return nothing on a mismatch), so anon already got an empty set. Revoking is
-- belt and braces, and removes them from the anonymous API surface entirely.
revoke all on function public.cycle_theme_counts(uuid) from public, anon;
revoke all on function public.cycle_safe_excerpts(uuid, integer) from public, anon;
grant execute on function public.cycle_theme_counts(uuid) to authenticated;
grant execute on function public.cycle_safe_excerpts(uuid, integer) to authenticated;

-- current_org_id() is deliberately NOT revoked from authenticated: every RLS
-- policy calls it during policy evaluation, and revoking EXECUTE would make
-- those policies fail with permission denied rather than simply return no rows.
revoke all on function public.current_org_id() from public, anon;
grant execute on function public.current_org_id() to authenticated;

/* -------------------------------------------------------------------------- */
/* Pin the one function with a mutable search_path                            */
/* -------------------------------------------------------------------------- */

-- Flagged by the advisor: a function without a fixed search_path can be steered
-- by whatever the caller has set.
alter function public.next_cycle_close(text) set search_path = public;
