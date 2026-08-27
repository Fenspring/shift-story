import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { createClient } from "@/utils/supabase/server";

export type Manager = {
  userId: string;
  email: string | null;
  fullName: string;
  jobTitle: string | null;
  orgId: string;
  orgName: string;
};

/**
 * Resolves the signed-in manager and their organization.
 *
 * Uses `getUser()`, never `getSession()`: getSession reads the cookie without
 * verifying it against the auth server, so it can be forged. getUser revalidates.
 */
export async function getManager(): Promise<Manager | null> {
  const supabase = createClient(await cookies());

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, job_title, org_id, organizations(name)")
    .eq("id", user.id)
    .single<{
      full_name: string;
      job_title: string | null;
      org_id: string;
      organizations: { name: string } | null;
    }>();

  if (!profile) return null;

  return {
    userId: user.id,
    email: user.email ?? null,
    fullName: profile.full_name,
    jobTitle: profile.job_title,
    orgId: profile.org_id,
    orgName: profile.organizations?.name ?? "Your organization",
  };
}

/** Same as getManager, but sends anonymous visitors to the login page. */
export async function requireManager(): Promise<Manager> {
  const manager = await getManager();
  if (!manager) redirect("/login");
  return manager;
}
