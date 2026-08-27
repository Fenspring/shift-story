import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/**
 * Supabase client for Server Components and Route Handlers, scoped to the
 * caller's session. Row-Level Security applies, so this only ever sees what the
 * signed-in user is allowed to see.
 *
 * The waitlist does not use this — it writes with the secret key through
 * `lib/waitlist/store.ts`. This is here for authenticated pages.
 */
export const createClient = (cookieStore: Awaited<ReturnType<typeof cookies>>) => {
  return createServerClient(supabaseUrl!, supabaseKey!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // `setAll` was called from a Server Component, which cannot write
          // cookies. Safe to ignore when middleware refreshes sessions.
        }
      },
    },
  });
};
