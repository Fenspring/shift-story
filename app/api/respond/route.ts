import { NextResponse } from "next/server";
import { z } from "zod";

import { clientIp, rateLimit } from "@/lib/rate-limit";
import { respondedCookieName } from "@/lib/cycles/cookie";
import { createAdminClient } from "@/utils/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * A hospital sits behind a handful of egress IPs — a whole unit scanning the
 * QR looks like one address. So this limit is a flood backstop, set far above
 * what a real unit produces, and deliberately NOT a per-person control. The
 * cookie below is what discourages repeat submissions.
 */
const FLOOD_LIMIT = { limit: 60, windowMs: 60 * 60 * 1000 };

/** Ceiling per cycle, so a scripted flood cannot drown a unit's real signal. */
const MAX_RESPONSES_PER_CYCLE = 500;

const schema = z.object({
  token: z.string().min(20, "That link looks incomplete.").max(200, "That link looks wrong."),
  body: z
    .string()
    .trim()
    .min(1, "Write a sentence or two before sending.")
    .max(2000, "Please keep it under 2000 characters."),
});

function fail(status: number, error: string) {
  return NextResponse.json({ ok: false, error }, { status });
}

export async function POST(request: Request) {
  const limit = rateLimit(`respond:${clientIp(request.headers)}`, FLOOD_LIMIT);
  if (!limit.ok) {
    return NextResponse.json(
      { ok: false, error: "Too many responses from this network right now. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return fail(400, "Could not read that response.");
  }

  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return fail(400, parsed.error.issues[0]?.message ?? "Please check your response.");
  }

  const { token, body } = parsed.data;
  const admin = createAdminClient();

  try {
    const { data: tokenRow } = await admin
      .from("response_tokens")
      .select("unit_id")
      .eq("token", token)
      .is("revoked_at", null)
      .maybeSingle<{ unit_id: string }>();

    if (!tokenRow) {
      return fail(404, "This link is no longer active. Ask your manager for the current one.");
    }

    const { data: cycle } = await admin
      .from("cycles")
      .select("id, closes_at, response_count")
      .eq("unit_id", tokenRow.unit_id)
      .eq("status", "open")
      .maybeSingle<{ id: string; closes_at: string; response_count: number }>();

    if (!cycle) {
      return fail(409, "This unit is not collecting responses right now.");
    }

    // The deadline is enforced here, not just in the UI — the status flip is a
    // scheduled job that does not exist yet, so the timestamp is the authority.
    if (new Date(cycle.closes_at).getTime() <= Date.now()) {
      return fail(409, "This week's responses have closed. Look out for the next question.");
    }

    if (cycle.response_count >= MAX_RESPONSES_PER_CYCLE) {
      return fail(409, "This week's responses are full.");
    }

    const { error } = await admin.from("responses").insert({ cycle_id: cycle.id, body });

    if (error) {
      // Never log the payload: this is the most sensitive text in the product.
      console.error("[respond] insert failed:", error.code, error.message);
      return fail(500, "Something went wrong sending that. Please try again.");
    }

    const response = NextResponse.json({ ok: true });

    // A soft marker, not authentication. It stops accidental double-sends and
    // casual repeats; it is trivially cleared, and the response page offers an
    // explicit way past it because break-room computers are shared.
    response.cookies.set(respondedCookieName(cycle.id), "1", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires: new Date(cycle.closes_at),
    });

    return response;
  } catch (err) {
    console.error("[respond] failed:", err);
    return fail(500, "Something went wrong sending that. Please try again.");
  }
}
