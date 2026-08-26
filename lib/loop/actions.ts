"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { ALL_THEME_KEYS } from "@/lib/themes/classify";
import { createClient } from "@/utils/supabase/server";

export type ActionState = { error: string | null };

const themeKeys = ALL_THEME_KEYS as unknown as [string, ...string[]];

const actionSchema = z.object({
  unitId: z.uuid(),
  cycleId: z.uuid().nullish(),
  themeKey: z.enum(themeKeys, { message: "Pick the theme this addresses." }),
  description: z.string().trim().min(1, "Describe what you will do.").max(500),
  owner: z.string().trim().max(120).optional().default(""),
  status: z.enum(["planned", "in_progress", "done"]).default("planned"),
  targetDate: z.string().trim().max(20).optional().default(""),
});

const updateSchema = z.object({
  unitId: z.uuid(),
  actionId: z.uuid().nullish(),
  youSaid: z.string().trim().min(1, "Write what the team told you.").max(800),
  weDid: z.string().trim().min(1, "Write what you changed.").max(800),
});

function firstError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Please check the form.";
}

/**
 * Every write re-reads the unit through the session-scoped client first. RLS
 * answers the authorization question, so a unit in another organization is
 * simply not there — the write never runs.
 */
async function assertUnit(unitId: string) {
  const supabase = createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: unit } = await supabase
    .from("units")
    .select("id")
    .eq("id", unitId)
    .single<{ id: string }>();
  if (!unit) redirect("/app");

  return { supabase, userId: user.id };
}

export async function createAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = actionSchema.safeParse({
    unitId: formData.get("unitId"),
    cycleId: formData.get("cycleId") || null,
    themeKey: formData.get("themeKey"),
    description: formData.get("description"),
    owner: formData.get("owner"),
    status: formData.get("status") ?? "planned",
    targetDate: formData.get("targetDate"),
  });
  if (!parsed.success) return { error: firstError(parsed.error) };

  const { supabase, userId } = await assertUnit(parsed.data.unitId);

  const { error } = await supabase.from("leader_actions").insert({
    unit_id: parsed.data.unitId,
    cycle_id: parsed.data.cycleId ?? null,
    theme_key: parsed.data.themeKey,
    description: parsed.data.description,
    owner: parsed.data.owner || null,
    status: parsed.data.status,
    target_date: parsed.data.targetDate || null,
    created_by: userId,
  });

  if (error) {
    console.error("[loop] create action failed:", error.message);
    return { error: "Could not save that action. Please try again." };
  }

  revalidatePath(`/app/units/${parsed.data.unitId}`);
  redirect(`/app/units/${parsed.data.unitId}`);
}

export async function saveUpdate(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const updateId = String(formData.get("updateId") ?? "").trim();
  const publish = formData.get("intent") === "publish";

  const parsed = updateSchema.safeParse({
    unitId: formData.get("unitId"),
    actionId: formData.get("actionId") || null,
    youSaid: formData.get("youSaid"),
    weDid: formData.get("weDid"),
  });
  if (!parsed.success) return { error: firstError(parsed.error) };

  const { supabase, userId } = await assertUnit(parsed.data.unitId);

  const payload = {
    unit_id: parsed.data.unitId,
    action_id: parsed.data.actionId ?? null,
    you_said: parsed.data.youSaid,
    we_did: parsed.data.weDid,
    status: publish ? "published" : "draft",
    published_at: publish ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  };

  const { error } = updateId
    ? await supabase.from("team_updates").update(payload).eq("id", updateId)
    : await supabase.from("team_updates").insert({ ...payload, created_by: userId });

  if (error) {
    console.error("[loop] save update failed:", error.message);
    return { error: "Could not save that update. Please try again." };
  }

  revalidatePath(`/app/units/${parsed.data.unitId}`);
  redirect(`/app/units/${parsed.data.unitId}`);
}

export async function publishUpdate(formData: FormData): Promise<void> {
  const unitId = String(formData.get("unitId") ?? "");
  const updateId = String(formData.get("updateId") ?? "");
  if (!unitId || !updateId) return;

  const { supabase } = await assertUnit(unitId);

  await supabase
    .from("team_updates")
    .update({
      status: "published",
      published_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", updateId);

  revalidatePath(`/app/units/${unitId}`);
}
