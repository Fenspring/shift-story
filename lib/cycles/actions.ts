"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { WEEKLY_QUESTION, MIN_RESPONSES } from "@/lib/cycle-policy";
import { generateResponseToken, hashResponseToken } from "@/lib/cycles/tokens";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

export type ActionState = { error: string | null };

/**
 * Confirms the signed-in manager may act on this unit.
 *
 * Reads through the session-scoped client on purpose: RLS answers the
 * authorization question, so a unit in another organization simply is not
 * there. Only after this passes does anything touch the admin client.
 */
async function assertUnitAccess(unitId: string): Promise<{ timezone: string }> {
  const supabase = createClient(await cookies());

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: unit } = await supabase
    .from("units")
    .select("id, timezone")
    .eq("id", unitId)
    .single<{ id: string; timezone: string }>();

  if (!unit) redirect("/app");
  return { timezone: unit.timezone };
}

export async function startCycle(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const unitId = String(formData.get("unitId") ?? "");
  if (!unitId) return { error: "Missing unit." };

  const { timezone } = await assertUnitAccess(unitId);
  const admin = createAdminClient();

  // Postgres owns the deadline arithmetic — it handles DST correctly.
  const { data: closesAt, error: closeError } = await admin.rpc("next_cycle_close", {
    tz: timezone,
  });

  if (closeError || !closesAt) {
    console.error("[cycles] could not compute deadline:", closeError);
    return { error: "Could not work out this week's deadline. Please try again." };
  }

  const { error } = await admin.from("cycles").insert({
    unit_id: unitId,
    question: WEEKLY_QUESTION,
    closes_at: closesAt,
    min_responses: MIN_RESPONSES,
  });

  if (error) {
    // The partial unique index guarantees one collecting cycle per unit.
    if (error.code === "23505") {
      return { error: "This unit is already collecting responses." };
    }
    console.error("[cycles] start failed:", error);
    return { error: "Could not start collecting. Please try again." };
  }

  await ensureToken(unitId);
  revalidatePath(`/app/units/${unitId}`);
  return { error: null };
}

/** Returns the unit's active token, minting one if it has none. */
export async function ensureToken(unitId: string): Promise<string> {
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("response_tokens")
    .select("token")
    .eq("unit_id", unitId)
    .is("revoked_at", null)
    .maybeSingle<{ token: string }>();

  if (existing) return existing.token;

  const token = generateResponseToken();
  const { error } = await admin
    .from("response_tokens")
    .insert({ unit_id: unitId, token, token_hash: hashResponseToken(token) });

  if (error) throw new Error(`Could not create a response link: ${error.message}`);
  return token;
}

export async function rotateToken(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const unitId = String(formData.get("unitId") ?? "");
  if (!unitId) return { error: "Missing unit." };

  await assertUnitAccess(unitId);
  const admin = createAdminClient();

  // Revoke first. The partial unique index allows only one active token per
  // unit, so minting before revoking would collide — and briefly leave two
  // working links, which is exactly what rotating is meant to prevent.
  const { error: revokeError } = await admin
    .from("response_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("unit_id", unitId)
    .is("revoked_at", null);

  if (revokeError) {
    console.error("[cycles] revoke failed:", revokeError);
    return { error: "Could not replace the link. Please try again." };
  }

  await ensureToken(unitId);
  revalidatePath(`/app/units/${unitId}`);
  return { error: null };
}
