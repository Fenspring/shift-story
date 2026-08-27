import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";

import { formatDeadline } from "@/lib/cycles/queries";
import { requireManager } from "@/lib/auth/session";
import { createClient } from "@/utils/supabase/server";

export const metadata: Metadata = { title: "The story of the shift" };
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string; cycleId: string }> };

type ThemeRow = {
  rank: number;
  label: string;
  summary: string;
  representative_statement: string | null;
  mention_count: number;
};

export default async function StoryPage({ params }: Props) {
  await requireManager();
  const { id, cycleId } = await params;

  const supabase = createClient(await cookies());

  // RLS scopes all three reads to the caller's organization, so a story
  // belonging to another hospital is simply not there.
  const { data: unit } = await supabase
    .from("units")
    .select("id, name, timezone")
    .eq("id", id)
    .single<{ id: string; name: string; timezone: string }>();

  if (!unit) notFound();

  const { data: cycle } = await supabase
    .from("cycles")
    .select("id, question, closes_at, response_count, min_responses, status")
    .eq("id", cycleId)
    .eq("unit_id", id)
    .single<{
      id: string;
      question: string;
      closes_at: string;
      response_count: number;
      min_responses: number;
      status: string;
    }>();

  if (!cycle) notFound();

  const { data: story } = await supabase
    .from("stories")
    .select("id, response_count, generated_at, model")
    .eq("cycle_id", cycleId)
    .maybeSingle<{
      id: string;
      response_count: number;
      generated_at: string;
      model: string;
    }>();

  const back = (
    <Link href={`/app/units/${unit.id}`} className="text-dim hover:text-teal text-[13px] no-underline">
      ← {unit.name}
    </Link>
  );

  // Below the threshold there is no story, and this is the screen that has to
  // explain why in a way a manager accepts rather than resents.
  if (!story) {
    const short = cycle.response_count < cycle.min_responses;
    return (
      <div className="flex max-w-[62ch] flex-col gap-6">
        {back}
        <h1 className="text-bone font-display m-0 text-[clamp(24px,3.2vw,32px)] font-medium">
          {short ? "Not enough responses for a story" : "No story yet"}
        </h1>
        <p className="text-secondary m-0 text-[15.5px] leading-[1.7]">
          {short
            ? `${cycle.response_count} ${cycle.response_count === 1 ? "person" : "people"} answered, and a story needs at least ${cycle.min_responses}. Below that, themes would narrow too far — on a small unit, three responses about the same thing identify the three people who wrote them.`
            : "This week has not been written up yet. Stories are generated after the deadline passes."}
        </p>
        {short ? (
          <p className="text-dim m-0 text-[14px] leading-[1.65]">
            Those responses were not discarded. They carry into the next week and
            count towards its story.
          </p>
        ) : null}
      </div>
    );
  }

  const { data: themes } = await supabase
    .from("themes")
    .select("rank, label, summary, representative_statement, mention_count")
    .eq("story_id", story.id)
    .order("rank");

  const rows = (themes ?? []) as ThemeRow[];

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-3">
        {back}
        <p className="text-teal m-0 text-[11px] tracking-[0.14em] uppercase">
          Week ending {formatDeadline(cycle.closes_at, unit.timezone)}
        </p>
        <h1 className="text-bone font-display m-0 text-[clamp(26px,3.4vw,36px)] leading-[1.2] font-medium text-pretty">
          The story of the shift
        </h1>
        <p className="text-secondary m-0 text-[15.5px] leading-[1.7]">
          {story.response_count} {story.response_count === 1 ? "person" : "people"}{" "}
          answered. Their responses have been grouped into the themes below and
          then deleted — this page is all that remains of them.
        </p>
      </div>

      <ol className="border-hairline m-0 list-none border-t p-0">
        {rows.map((theme) => (
          <li key={theme.rank} className="border-hairline flex flex-col gap-3 border-b py-7">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="text-bone font-display m-0 text-[clamp(19px,2.4vw,24px)] font-medium">
                {theme.label}
              </h2>
              <span className="text-dim text-[12.5px] tracking-[0.1em] whitespace-nowrap uppercase tabular-nums">
                {theme.mention_count} of {story.response_count}
              </span>
            </div>

            <p className="text-secondary m-0 max-w-[62ch] text-[15.5px] leading-[1.7]">
              {theme.summary}
            </p>

            {theme.representative_statement ? (
              <p className="text-muted font-display m-0 max-w-[58ch] border-l border-[rgb(114_182_173/0.4)] pl-4 text-[16px] leading-[1.55] italic">
                {theme.representative_statement}
              </p>
            ) : null}
          </li>
        ))}
      </ol>

      <p className="text-dim m-0 max-w-[62ch] text-[13px] leading-[1.65]">
        Themes are paraphrased, never quoted — distinctive phrasing would
        identify people on a unit this size. Grouped by {story.model}.
      </p>
    </div>
  );
}
