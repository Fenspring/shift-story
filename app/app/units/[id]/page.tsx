import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";

import { WEEKLY_QUESTION, MIN_RESPONSES, DEADLINE_LABEL } from "@/lib/cycle-policy";
import { createClient } from "@/utils/supabase/server";
import { requireManager } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Unit" };

type Props = { params: Promise<{ id: string }> };

export default async function UnitPage({ params }: Props) {
  await requireManager();
  const { id } = await params;

  const supabase = createClient(await cookies());
  // RLS means a unit in another organization returns no row, so an out-of-org
  // id is indistinguishable from one that does not exist. That is the point.
  const { data: unit } = await supabase
    .from("units")
    .select("id, name, created_at")
    .eq("id", id)
    .single<{ id: string; name: string; created_at: string }>();

  if (!unit) notFound();

  return (
    <div className="flex flex-col gap-9">
      <div className="flex flex-col gap-2">
        <Link href="/app" className="text-dim hover:text-teal text-[13px] no-underline">
          ← Your units
        </Link>
        <h1 className="text-bone font-display m-0 text-[clamp(26px,3.4vw,34px)] font-medium">
          {unit.name}
        </h1>
      </div>

      <section className="border-hairline rounded-sharp bg-panel flex flex-col gap-4 border p-7">
        <p className="text-teal m-0 text-[11px] tracking-[0.14em] uppercase">
          This week&rsquo;s question
        </p>
        <p className="text-bone font-display m-0 text-[clamp(19px,2.4vw,24px)] leading-[1.4] italic">
          &ldquo;{WEEKLY_QUESTION}&rdquo;
        </p>
        <p className="text-secondary m-0 text-[14.5px] leading-[1.65]">
          The same question every week, so themes stay comparable from one week
          to the next. Responses close {DEADLINE_LABEL}, and the story is written
          after that — never before, and never twice.
        </p>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-bone font-display m-0 text-[20px] font-medium">
          Responses
        </h2>
        <div className="border-hairline rounded-sharp flex flex-col items-start gap-3 border border-dashed px-6 py-8">
          <p className="text-muted m-0 text-[15px]">
            Not collecting yet. Response capture and the QR code arrive next.
          </p>
          <p className="text-dim m-0 max-w-[52ch] text-[13.5px] leading-[1.6]">
            When it is live you will see a count and nothing else — never who
            responded, never what any one person wrote. Below {MIN_RESPONSES}{" "}
            responses at the deadline there is no story at all, because there is
            no way to write one without narrowing who said what.
          </p>
        </div>
      </section>
    </div>
  );
}
