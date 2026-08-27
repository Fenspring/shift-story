import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";

import { UpdateForm } from "@/components/app/UpdateForm";
import { requireManager } from "@/lib/auth/session";
import { createClient } from "@/utils/supabase/server";

export const metadata: Metadata = { title: "You said / We did" };
export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ action?: string; id?: string }>;
};

export default async function NewUpdatePage({ params, searchParams }: Props) {
  await requireManager();
  const { id } = await params;
  const { action = null, id: updateId = null } = await searchParams;

  const supabase = createClient(await cookies());

  const { data: unit } = await supabase
    .from("units")
    .select("id, name")
    .eq("id", id)
    .single<{ id: string; name: string }>();

  if (!unit) notFound();

  // Editing an existing update: RLS scopes this, so an id from another
  // organization simply returns nothing and the form opens blank.
  const existing = updateId
    ? (
        await supabase
          .from("team_updates")
          .select("id, action_id, you_said, we_did")
          .eq("id", updateId)
          .eq("unit_id", id)
          .maybeSingle<{ id: string; action_id: string | null; you_said: string; we_did: string }>()
      ).data
    : null;

  // Seed "You said" from the action's theme when arriving from an action.
  const linkedActionId = existing?.action_id ?? action;

  return (
    <div className="flex max-w-[620px] flex-col gap-7">
      <div className="flex flex-col gap-2">
        <Link href={`/app/units/${unit.id}`} className="text-dim hover:text-teal text-[13px] no-underline">
          ← {unit.name}
        </Link>
        <h1 className="text-bone font-display m-0 text-[clamp(24px,3.2vw,32px)] font-medium">
          {existing ? "Edit the update" : "Close the loop"}
        </h1>
        <p className="text-secondary m-0 text-[15px] leading-[1.65]">
          This is the part your team actually sees. It is what earns you next
          week&rsquo;s answers.
        </p>
      </div>

      <UpdateForm
        unitId={unit.id}
        actionId={linkedActionId}
        updateId={existing?.id ?? null}
        initialYouSaid={existing?.you_said ?? ""}
        initialWeDid={existing?.we_did ?? ""}
      />
    </div>
  );
}
