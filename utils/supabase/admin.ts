import "server-only";

import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

/**
 * Server-only Supabase client holding the secret key, which bypasses RLS.
 *
 * Used where there is no request to derive a session from — server actions, and
 * the one path that writes to `responses`, a table no session-scoped client can
 * touch by design. Never import this into a Client Component.
 *
 * (The waitlist route builds its admin client through `@supabase/server`
 * instead, which needs a `Request`; server actions do not have one.)
 */
export function createAdminClient(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.SUPABASE_URL?.trim();
  const secret = process.env.SUPABASE_SECRET_KEY?.trim();

  if (!url || !secret) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_SECRET_KEY must both be set. Writes bypass " +
        "Row-Level Security and the publishable key cannot perform them.",
    );
  }

  cached = createSupabaseClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return cached;
}
