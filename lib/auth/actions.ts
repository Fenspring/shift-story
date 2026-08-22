"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/utils/supabase/server";

export type ActionState = { error: string | null };

const signupSchema = z.object({
  fullName: z.string().trim().min(1, "Enter your name.").max(120),
  jobTitle: z.string().trim().max(120).optional().default(""),
  organization: z.string().trim().min(1, "Enter your organization.").max(160),
  email: z.email("Enter a valid work email address.").max(254),
  password: z
    .string()
    .min(12, "Use at least 12 characters.")
    .max(200, "That password is too long."),
});

const loginSchema = z.object({
  email: z.email("Enter a valid work email address.").max(254),
  password: z.string().min(1, "Enter your password."),
});

const unitSchema = z.object({
  name: z.string().trim().min(1, "Give the unit a name.").max(120),
  // Submitted by the browser. Validated against the runtime's own zone list so
  // a forged value cannot reach next_cycle_close(), where Postgres would raise
  // on an unrecognized zone.
  timezone: z
    .string()
    .trim()
    .max(64)
    .optional()
    .default("UTC")
    .transform((tz) => (isValidTimeZone(tz) ? tz : "UTC")),
});

function isValidTimeZone(tz: string): boolean {
  if (!tz) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Forms here are short enough that one message at a time is clearer than a list. */
function firstError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Please check the form.";
}

export async function signUp(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = signupSchema.safeParse({
    fullName: formData.get("fullName"),
    jobTitle: formData.get("jobTitle"),
    organization: formData.get("organization"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) return { error: firstError(parsed.error) };

  const supabase = createClient(await cookies());

  // The organization and profile rows are created by the handle_new_user
  // trigger from this metadata, so signup stays a single atomic operation.
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        full_name: parsed.data.fullName,
        job_title: parsed.data.jobTitle,
        organization: parsed.data.organization,
      },
    },
  });

  if (error) return { error: error.message };

  redirect("/signup/check-email");
}

export async function signIn(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) return { error: firstError(parsed.error) };

  const supabase = createClient(await cookies());
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  // Deliberately generic: distinguishing "no such account" from "wrong
  // password" tells an attacker which work emails are registered.
  if (error) return { error: "That email and password do not match." };

  redirect("/app");
}

export async function signOut(): Promise<void> {
  const supabase = createClient(await cookies());
  await supabase.auth.signOut();
  redirect("/login");
}

export async function createUnit(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = unitSchema.safeParse({
    name: formData.get("name"),
    timezone: formData.get("timezone"),
  });
  if (!parsed.success) return { error: firstError(parsed.error) };

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

  if (!profile) return { error: "Your account is missing a profile. Contact support." };

  const { data: unit, error } = await supabase
    .from("units")
    .insert({
      org_id: profile.org_id,
      name: parsed.data.name,
      timezone: parsed.data.timezone,
      created_by: user.id,
    })
    .select("id")
    .single<{ id: string }>();

  if (error) {
    if (error.code === "23505") {
      return { error: "A unit with that name already exists." };
    }
    console.error("[units] create failed:", error);
    return { error: "Could not create the unit. Please try again." };
  }

  // The creating manager is the first member, so the unit has a defined
  // audience from the moment it exists.
  await supabase.from("unit_members").insert({
    unit_id: unit.id,
    profile_id: user.id,
    role: "manager",
  });

  revalidatePath("/app");
  redirect(`/app/units/${unit.id}`);
}
