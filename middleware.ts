import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { updateSession } from "@/utils/supabase/middleware";

export async function middleware(request: NextRequest) {
  try {
    return await updateSession(request);
  } catch (error) {
    // Supabase being unreachable must not take the site down. Let the request
    // through unrefreshed — the pages themselves re-check auth server-side, so
    // a failure here costs a stale session, not an open door.
    console.error("[middleware] session refresh failed:", error);
    return NextResponse.next({ request });
  }
}

export const config = {
  // Scoped deliberately. The landing page, the waitlist endpoint, and the
  // public pages must not depend on Supabase being up, so they are not matched.
  matcher: ["/app/:path*", "/login", "/signup"],
};
