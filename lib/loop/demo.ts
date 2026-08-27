"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { WEEKLY_QUESTION, MIN_RESPONSES } from "@/lib/cycle-policy";
import { ensureToken } from "@/lib/cycles/actions";
import { keywordClassifier } from "@/lib/themes/classify";
import { safeExcerptOrNull } from "@/lib/themes/deidentify";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

/**
 * Synthetic responses for the demo unit.
 *
 * Deliberately fictional and deliberately mixed: some are clean operational
 * text that survives de-identification, others name a person or a room so the
 * excerpt filter visibly withholds them. Twelve responses clears the threshold
 * of eight with room to spare.
 */
const DEMO_RESPONSES: Array<{ body: string; shift: string; impact: string }> = [
  { body: "Admissions kept arriving before the rooms were cleaned, so we held people in the hallway.", shift: "day", impact: "a_lot" },
  { body: "Could not find a working IV pump for two admissions and ended up borrowing from another pod.", shift: "day", impact: "a_lot" },
  { body: "We were short staffed again on nights and nobody got a proper break.", shift: "night", impact: "a_lot" },
  { body: "Handoff at seven keeps slipping because the day team is still charting.", shift: "evening", impact: "some" },
  { body: "Ran out of linens overnight for the third week running.", shift: "night", impact: "some" },
  { body: "Double charting every admission between the flowsheet and the paper packet.", shift: "day", impact: "some" },
  { body: "Shift swaps sit unapproved for so long that people stop asking.", shift: "evening", impact: "a_little" },
  { body: "The break room has been freezing all week and there is nowhere else to sit.", shift: "night", impact: "a_little" },
  { body: "Pharmacy turnaround on stat orders was slow every single evening this week.", shift: "evening", impact: "some" },
  { body: "Nobody told us the transport team was down two people until we were already waiting.", shift: "day", impact: "some" },
  // These two are withheld from excerpts on purpose — a name and a room number.
  { body: "Marcus never restocks the admission cart before he leaves for the night.", shift: "night", impact: "some" },
  { body: "The call light in room 412 has been broken for over a week now.", shift: "day", impact: "a_little" },
];

/**
 * Creates a fully populated demo unit inside the signed-in leader's own
 * organization.
 *
 * Scoped to their org on purpose: a separate demo tenant would either need
 * cross-org access to be visible, or would be unreachable. Everything is
 * labelled as demo data so it is never mistaken for a real ward.
 */
export async function seedDemoUnit(): Promise<void> {
  const supabase = createClient(await cookies());

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id")
    .eq("id", user.id)
    .single<{ org_id: string }>();
  if (!profile) redirect("/app");

  const admin = createAdminClient();
  const name = `ICU — Demo Medical Center`;

  // Idempotent: reuse the demo unit if it is already there.
  const { data: existing } = await admin
    .from("units")
    .select("id")
    .eq("org_id", profile.org_id)
    .eq("name", name)
    .maybeSingle<{ id: string }>();

  if (existing) {
    revalidatePath("/app");
    redirect(`/app/units/${existing.id}`);
  }

  const { data: unit, error: unitError } = await admin
    .from("units")
    .insert({
      org_id: profile.org_id,
      name,
      unit_type: "ICU / Critical care",
      staff_count: 42,
      timezone: "America/New_York",
      created_by: user.id,
    })
    .select("id")
    .single<{ id: string }>();

  if (unitError || !unit) throw new Error(`demo unit failed: ${unitError?.message}`);

  const { data: closesAt } = await admin.rpc("next_cycle_close", { tz: "America/New_York" });

  const { data: cycle, error: cycleError } = await admin
    .from("cycles")
    .insert({
      unit_id: unit.id,
      question: WEEKLY_QUESTION,
      closes_at: closesAt,
      min_responses: MIN_RESPONSES,
    })
    .select("id")
    .single<{ id: string }>();

  if (cycleError || !cycle) throw new Error(`demo cycle failed: ${cycleError?.message}`);

  // Insert through the same classification and de-identification path the real
  // submit route uses, so the demo exercises the actual code.
  const { data: inserted, error: responseError } = await admin
    .from("responses")
    .insert(
      DEMO_RESPONSES.map((r) => ({
        cycle_id: cycle.id,
        body: r.body,
        shift: r.shift,
        impact: r.impact,
        safe_excerpt: safeExcerptOrNull(r.body),
      })),
    )
    .select("id, body")
    .overrideTypes<Array<{ id: string; body: string }>>();

  if (responseError) throw new Error(`demo responses failed: ${responseError.message}`);

  const links = (inserted ?? []).flatMap((row) =>
    keywordClassifier.classify(row.body).map((theme_key) => ({
      response_id: row.id,
      theme_key,
    })),
  );
  await admin.from("response_themes").insert(links);

  const { data: action } = await admin
    .from("leader_actions")
    .insert({
      unit_id: unit.id,
      cycle_id: cycle.id,
      theme_key: "equipment",
      description: "Create a dedicated IV pump location for admissions in the east equipment room.",
      owner: "Unit educator",
      status: "in_progress",
      created_by: user.id,
    })
    .select("id")
    .single<{ id: string }>();

  await admin.from("team_updates").insert({
    unit_id: unit.id,
    action_id: action?.id ?? null,
    you_said:
      "Several of you said that finding an IV pump during an admission was slowing the whole shift down.",
    we_did:
      "We created a dedicated IV pump location in the east equipment room, stocked and checked before every evening shift.",
    status: "published",
    published_at: new Date().toISOString(),
    created_by: user.id,
  });

  await ensureToken(unit.id);

  revalidatePath("/app");
  redirect(`/app/units/${unit.id}`);
}
