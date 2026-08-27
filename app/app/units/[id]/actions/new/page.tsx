import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ActionForm } from "@/components/app/ActionForm";
import { requireManager } from "@/lib/auth/session";
import { themeLabel } from "@/lib/themes/catalog";
import { createClient } from "@/utils/supabase/server";

export const metadata: Metadata = { title: "New action" };
export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ theme?: string; cycle?: string }>;
};

export default async function NewActionPage({ params, searchParams }: Props) {
  await requireManager();
  const { id } = await params;
  const { theme = "", cycle = null } = await searchParams;

  const supabase = createClient(await cookies());
  const { data: unit } = await supabase
    .from("units")
    .select("id, name")
    .eq("id", id)
    .single<{ id: string; name: string }>();

  if (!unit) notFound();

  return (
    <div className="flex max-w-[560px] flex-col gap-7">
      <div className="flex flex-col gap-2">
        <Link href={`/app/units/${unit.id}`} className="text-dim hover:text-teal text-[13px] no-underline">
          ← {unit.name}
        </Link>
        <h1 className="text-bone font-display m-0 text-[clamp(24px,3.2vw,32px)] font-medium">
          Turn a theme into an action
        </h1>
        <p className="text-secondary m-0 text-[15px] leading-[1.65]">
          {theme
            ? `Addressing ${themeLabel(theme)}. `
            : ""}
          One concrete change is worth more than a plan. You will share it with
          the unit in the next step.
        </p>
      </div>

      <ActionForm unitId={unit.id} cycleId={cycle} defaultTheme={theme} />
    </div>
  );
}
