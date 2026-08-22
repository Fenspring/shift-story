import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/**
 * Refreshes the Supabase auth session and returns a response carrying the
 * updated cookies.
 *
 * Not wired up yet: this app has no authenticated routes, so there is no root
 * `middleware.ts` invoking it — that would add a hop to every request for no
 * benefit. When auth arrives, add `middleware.ts` at the repo root:
 *
 *     export { updateSession as middleware } from "@/utils/supabase/middleware";
 *     export const config = { matcher: ["/dashboard/:path*"] };
 */
export const updateSession = async (request: NextRequest) => {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl!, supabaseKey!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  // This call is what actually refreshes an expired token and triggers the
  // `setAll` above. Without it the helper is a no-op that just copies cookies.
  await supabase.auth.getUser();

  return supabaseResponse;
};
