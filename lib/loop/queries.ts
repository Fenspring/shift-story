import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type ThemeCount = { theme_key: string; label: string; mentions: number };
export type SafeExcerpt = { theme_key: string; excerpt: string };

export type LeaderAction = {
  id: string;
  theme_key: string;
  description: string;
  owner: string | null;
  status: "planned" | "in_progress" | "done";
  target_date: string | null;
  created_at: string;
};

export type TeamUpdate = {
  id: string;
  action_id: string | null;
  you_said: string;
  we_did: string;
  status: "draft" | "published";
  published_at: string | null;
  created_at: string;
};

/**
 * Aggregate theme counts for a cycle.
 *
 * Goes through the `cycle_theme_counts` function rather than querying the link
 * table, because the threshold is enforced inside that function. Below the
 * threshold it returns nothing — there is no query the app could write instead
 * that would get around it.
 */
export async function getThemeCounts(
  supabase: SupabaseClient,
  cycleId: string,
): Promise<ThemeCount[]> {
  const { data, error } = await supabase.rpc("cycle_theme_counts", { p_cycle_id: cycleId });
  if (error) {
    console.error("[loop] theme counts failed:", error.message);
    return [];
  }
  return (data ?? []) as ThemeCount[];
}

/** De-identified excerpts, also threshold-gated inside the database. */
export async function getSafeExcerpts(
  supabase: SupabaseClient,
  cycleId: string,
  limit = 6,
): Promise<SafeExcerpt[]> {
  const { data, error } = await supabase.rpc("cycle_safe_excerpts", {
    p_cycle_id: cycleId,
    p_limit: limit,
  });
  if (error) {
    console.error("[loop] excerpts failed:", error.message);
    return [];
  }
  return (data ?? []) as SafeExcerpt[];
}

export async function getActions(
  supabase: SupabaseClient,
  unitId: string,
): Promise<LeaderAction[]> {
  const { data } = await supabase
    .from("leader_actions")
    .select("id, theme_key, description, owner, status, target_date, created_at")
    .eq("unit_id", unitId)
    .order("created_at", { ascending: false });
  return (data ?? []) as LeaderAction[];
}

export async function getUpdates(
  supabase: SupabaseClient,
  unitId: string,
): Promise<TeamUpdate[]> {
  const { data } = await supabase
    .from("team_updates")
    .select("id, action_id, you_said, we_did, status, published_at, created_at")
    .eq("unit_id", unitId)
    .order("created_at", { ascending: false });
  return (data ?? []) as TeamUpdate[];
}
