import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";

import { createClient } from "@/utils/supabase/server";
import { requireManager } from "@/lib/auth/session";
import { seedDemoUnit } from "@/lib/loop/demo";

export const metadata: Metadata = { title: "Your units" };

type UnitRow = { id: string; name: string; created_at: string };

export default async function AppHome() {
  await requireManager();

  const supabase = createClient(await cookies());
  // RLS scopes this to the caller's organization — no org filter needed here,
  // and adding one would be a second place for the boundary to drift.
  const { data: units } = await supabase
    .from("units")
    .select("id, name, created_at")
    .order("name");

  const rows = (units ?? []) as UnitRow[];

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-bone font-display m-0 text-[clamp(26px,3.4vw,34px)] font-medium">
            Your units
          </h1>
          <p className="text-secondary m-0 text-[15px]">
            Each unit collects its own anonymous responses and gets its own story.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <form action={seedDemoUnit}>
            <button
              type="submit"
              className="text-dim hover:text-teal cursor-pointer border-none bg-transparent p-0 text-[13.5px] whitespace-nowrap transition-colors"
            >
              Load demo unit
            </button>
          </form>
          <Link
            href="/app/units/new"
            className="bg-amber text-ink hover:bg-amber-bright rounded-sharp px-5 py-3 text-[14px] font-semibold whitespace-nowrap no-underline transition-colors"
          >
            New unit
          </Link>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="border-hairline rounded-sharp flex flex-col items-start gap-3 border border-dashed px-7 py-10">
          <p className="text-bone font-display m-0 text-[20px]">
            No units yet.
          </p>
          <p className="text-secondary m-0 max-w-[46ch] text-[15px] leading-[1.65]">
            Begin with one. A single ward where you already know the friction is
            the best place to find out whether your team will tell you the truth.
          </p>
        </div>
      ) : (
        <ul className="border-hairline m-0 list-none border-t p-0">
          {rows.map((unit) => (
            <li key={unit.id} className="border-hairline border-b">
              <Link
                href={`/app/units/${unit.id}`}
                className="hover:bg-panel flex items-center justify-between gap-4 px-1 py-5 no-underline transition-colors"
              >
                <span className="text-bone font-display text-[19px]">{unit.name}</span>
                <span className="text-dim text-[13px]">Not yet collecting →</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
