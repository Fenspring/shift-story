import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { safeRedirectPath } from "@/lib/auth/safe-redirect";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Email-confirmation landing. Supabase redirects here with a one-time code,
 * which we exchange for a session before sending the manager into the app.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  const next = safeRedirectPath(searchParams.get("next"));

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = createClient(await cookies());
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[auth] code exchange failed:", error.message);
    return NextResponse.redirect(`${origin}/login?error=confirmation_failed`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
