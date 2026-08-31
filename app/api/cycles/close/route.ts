import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";

import { detectThemes, STORY_MODEL } from "@/lib/stories/detect";
import { createAdminClient } from "@/utils/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Theme detection runs at effort "high" and several units may close together.
export const maxDuration = 300;

type CycleRow = {
  id: string;
  unit_id: string;
  response_count: number;
  min_responses: number;
  closes_at: string;
  units: { timezone: string } | null;
};

type Outcome =
  | { cycleId: string; result: "story"; themes: number | null; narrative: boolean; responsesDestroyed: number }
  | { cycleId: string; result: "carried"; reason: string }
  | { cycleId: string; result: "failed"; reason: string };

function authorized(request: Request): boolean {
  const expected = process.env.CRON_SECRET?.trim();
  // Refuse rather than run open: this endpoint destroys data.
  if (!expected) return false;

  const header = request.headers.get("authorization") ?? "";
  const provided = header.startsWith("Bearer ") ? header.slice(7) : "";

  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  // Compare lengths separately — timingSafeEqual throws on a length mismatch.
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data: due, error } = await admin
    .from("cycles")
    .select("id, unit_id, response_count, min_responses, closes_at, units(timezone)")
    .eq("status", "open")
    .lte("closes_at", new Date().toISOString())
    .order("closes_at", { ascending: true })
    .limit(25)
    .overrideTypes<CycleRow[]>();

  if (error) {
    console.error("[close] could not list due cycles:", error);
    return NextResponse.json({ ok: false, error: "Could not list cycles." }, { status: 500 });
  }

  const outcomes: Outcome[] = [];

  for (const cycle of due ?? []) {
    try {
      outcomes.push(await closeCycle(admin, cycle));
    } catch (err) {
      console.error(`[close] cycle ${cycle.id} failed:`, err);
      outcomes.push({
        cycleId: cycle.id,
        result: "failed",
        reason: err instanceof Error ? err.message : "unknown",
      });
    }
  }

  return NextResponse.json({ ok: true, processed: outcomes.length, outcomes });
}

async function closeCycle(
  admin: ReturnType<typeof createAdminClient>,
  cycle: CycleRow,
): Promise<Outcome> {
  const timezone = cycle.units?.timezone ?? "UTC";

  // Short week: no story is possible without narrowing who said what, so the
  // responses carry into the next cycle rather than being discarded.
  if (cycle.response_count < cycle.min_responses) {
    const { data: nextClose, error: closeErr } = await admin.rpc("next_cycle_close", {
      tz: timezone,
    });
    if (closeErr || !nextClose) {
      throw new Error(`could not compute next deadline: ${closeErr?.message ?? "no value"}`);
    }

    const { error: carryErr } = await admin.rpc("carry_forward_cycle", {
      p_cycle_id: cycle.id,
      p_next_closes_at: nextClose,
    });
    if (carryErr) throw new Error(`carry forward failed: ${carryErr.message}`);

    return {
      cycleId: cycle.id,
      result: "carried",
      reason: `${cycle.response_count} of ${cycle.min_responses} responses`,
    };
  }

  // Ordered by id — a random uuid — so the sequence handed to the model carries
  // no trace of who submitted when.
  const { data: responses, error: readErr } = await admin
    .from("responses")
    .select("body")
    .eq("cycle_id", cycle.id)
    .order("id")
    .overrideTypes<Array<{ body: string }>>();

  if (readErr) throw new Error(`could not read responses: ${readErr.message}`);

  const bodies = (responses ?? []).map((r) => r.body);

  // A narrative story is enrichment, not the point. The point is that the cycle
  // closes and the raw text is destroyed — so that must not depend on an
  // optional API being configured, reachable, or willing. When Claude is
  // available its themes are richer and get used; when it is not, the
  // deterministic counts already in response_themes are frozen instead.
  let narrative: Awaited<ReturnType<typeof detectThemes>> | null = null;

  if (process.env.ANTHROPIC_API_KEY?.trim()) {
    try {
      narrative = await detectThemes(bodies);
      if (!narrative.ok) {
        console.warn(
          `[close] narrative unavailable for ${cycle.id} (${narrative.reason}: ${narrative.detail}) — closing on deterministic themes`,
        );
      }
    } catch (err) {
      console.warn(`[close] narrative threw for ${cycle.id}, closing on deterministic themes:`, err);
    }
  }

  // Either way this writes the story and its themes, destroys the raw
  // responses, and flips the status atomically in one Postgres function, so the
  // destruction cannot be orphaned from the write that justifies it.
  const { error: finalizeErr } =
    narrative?.ok
      ? await admin.rpc("finalize_story", {
          p_cycle_id: cycle.id,
          p_model: narrative.model || STORY_MODEL,
          p_themes: narrative.themes,
        })
      : await admin.rpc("finalize_story_from_counts", { p_cycle_id: cycle.id });

  if (finalizeErr) throw new Error(`finalize failed: ${finalizeErr.message}`);

  // Open next week's cycle so the unit keeps collecting without intervention.
  const { data: nextClose } = await admin.rpc("next_cycle_close", { tz: timezone });
  if (nextClose) {
    const { data: question } = await admin
      .from("cycles")
      .select("question, min_responses")
      .eq("id", cycle.id)
      .single<{ question: string; min_responses: number }>();

    await admin.from("cycles").insert({
      unit_id: cycle.unit_id,
      question: question?.question ?? "",
      closes_at: nextClose,
      min_responses: question?.min_responses ?? cycle.min_responses,
    });
  }

  return {
    cycleId: cycle.id,
    result: "story",
    themes: narrative?.ok ? narrative.themes.length : null,
    narrative: Boolean(narrative?.ok),
    responsesDestroyed: bodies.length,
  };
}
