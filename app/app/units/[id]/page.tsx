import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  ActionPanel,
  ExcerptPanel,
  ProtectedPanel,
  ThemePanel,
  UpdatePanel,
} from "@/components/app/LoopPanels";
import { RotateTokenButton, StartCycleButton } from "@/components/app/CycleControls";
import { ShareControls } from "@/components/app/ShareControls";
import {
  getActions,
  getSafeExcerpts,
  getThemeCounts,
  getUpdates,
} from "@/lib/loop/queries";
import { WEEKLY_QUESTION } from "@/lib/cycle-policy";
import { ensureToken } from "@/lib/cycles/actions";
import { renderQrSvg, responseUrl } from "@/lib/cycles/qr";
import { daysRemaining, formatDeadline, isCollecting, type Cycle } from "@/lib/cycles/queries";
import { requireManager } from "@/lib/auth/session";
import { createClient } from "@/utils/supabase/server";

export const metadata: Metadata = { title: "Unit" };
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

async function currentOrigin(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) return configured;
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export default async function UnitPage({ params }: Props) {
  await requireManager();
  const { id } = await params;

  const supabase = createClient(await cookies());

  // RLS makes a unit in another organization return no row, so an out-of-org id
  // is indistinguishable from one that does not exist.
  const { data: unit } = await supabase
    .from("units")
    .select("id, name, timezone")
    .eq("id", id)
    .single<{ id: string; name: string; timezone: string }>();

  if (!unit) notFound();

  const { data: cycles } = await supabase
    .from("cycles")
    .select("id, question, opens_at, closes_at, min_responses, response_count, status")
    .eq("unit_id", id)
    .order("opens_at", { ascending: false })
    .limit(1);

  const cycle = (cycles?.[0] ?? null) as Cycle | null;
  const collecting = cycle ? isCollecting(cycle) : false;

  const [actions, updates] = await Promise.all([
    getActions(supabase, id),
    getUpdates(supabase, id),
  ]);

  const thresholdMet = cycle ? cycle.response_count >= cycle.min_responses : false;
  const [themes, excerpts] = thresholdMet && cycle
    ? await Promise.all([
        getThemeCounts(supabase, cycle.id),
        getSafeExcerpts(supabase, cycle.id),
      ])
    : [[], []];

  const { data: stories } = await supabase
    .from("stories")
    .select("id, cycle_id, response_count, generated_at")
    .eq("unit_id", id)
    .order("generated_at", { ascending: false })
    .limit(10);

  const storyRows = (stories ?? []) as Array<{
    id: string;
    cycle_id: string;
    response_count: number;
    generated_at: string;
  }>;

  return (
    <div className="flex flex-col gap-10">
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
          &ldquo;{cycle?.question ?? WEEKLY_QUESTION}&rdquo;
        </p>
        <p className="text-secondary m-0 text-[14.5px] leading-[1.65]">
          The same question every week, so themes stay comparable. Responses
          close Friday, and the story is written after that — never before, and
          never twice.
        </p>
      </section>

      {collecting && cycle ? (
        <CollectingPanel unit={unit} cycle={cycle} />
      ) : (
        <section className="flex flex-col gap-4">
          <h2 className="text-bone font-display m-0 text-[20px] font-medium">
            {cycle ? "Last week has closed" : "Not collecting yet"}
          </h2>
          {cycle ? (
            <p className="text-secondary m-0 text-[15px] leading-[1.65]">
              {cycle.response_count} {cycle.response_count === 1 ? "person" : "people"}{" "}
              answered. {cycle.response_count < cycle.min_responses
                ? `That is below the ${cycle.min_responses} needed to write a story without narrowing who said what, so those responses carry into the next week.`
                : "The story for that week is written after the deadline."}
            </p>
          ) : (
            <p className="text-secondary m-0 max-w-[54ch] text-[15px] leading-[1.65]">
              Opening a question generates a QR code you can print and put where
              your team actually stands — the break room, the huddle board.
            </p>
          )}
          <div className="max-w-[320px]">
            <StartCycleButton unitId={unit.id} />
          </div>
        </section>
      )}

      {cycle ? (
        thresholdMet ? (
          <>
            <ThemePanel
              themes={themes}
              unitId={unit.id}
              cycleId={cycle.id}
              responses={cycle.response_count}
            />
            <ExcerptPanel excerpts={excerpts} />
          </>
        ) : (
          <ProtectedPanel
            responses={cycle.response_count}
            threshold={cycle.min_responses}
          />
        )
      ) : null}

      <ActionPanel actions={actions} unitId={unit.id} />
      <UpdatePanel updates={updates} unitId={unit.id} />

      {storyRows.length > 0 ? (
        <section className="flex flex-col gap-4">
          <h2 className="text-bone font-display m-0 text-[20px] font-medium">Past weeks</h2>
          <ul className="border-hairline m-0 list-none border-t p-0">
            {storyRows.map((story) => (
              <li key={story.id} className="border-hairline border-b">
                <Link
                  href={`/app/units/${unit.id}/story/${story.cycle_id}`}
                  className="hover:bg-panel flex items-center justify-between gap-4 px-1 py-4 no-underline transition-colors"
                >
                  <span className="text-bone font-display text-[17px]">
                    Week ending {formatDeadline(story.generated_at, unit.timezone)}
                  </span>
                  <span className="text-dim text-[13px] tabular-nums">
                    {story.response_count} responses →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

async function CollectingPanel({
  unit,
  cycle,
}: {
  unit: { id: string; name: string; timezone: string };
  cycle: Cycle;
}) {
  const token = await ensureToken(unit.id);
  const origin = await currentOrigin();
  const url = responseUrl(origin, token);
  const qr = await renderQrSvg(url);

  const days = daysRemaining(cycle.closes_at);
  const short = cycle.response_count < cycle.min_responses;

  return (
    <>
      <section className="flex flex-col gap-4">
        <h2 className="text-bone font-display m-0 text-[20px] font-medium">Responses</h2>

        <div className="border-hairline rounded-sharp flex flex-wrap items-baseline gap-x-8 gap-y-3 border p-7">
          <div className="flex flex-col gap-1">
            <span className="text-bone font-display text-[44px] leading-none tabular-nums">
              {cycle.response_count}
            </span>
            <span className="text-dim text-[12.5px] tracking-[0.1em] uppercase">
              {cycle.response_count === 1 ? "response" : "responses"}
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-secondary font-display text-[26px] leading-none tabular-nums">
              {days}
            </span>
            <span className="text-dim text-[12.5px] tracking-[0.1em] uppercase">
              {days === 1 ? "day left" : "days left"}
            </span>
          </div>

          <p className="text-dim m-0 flex-1 text-[13px] leading-[1.6] min-w-[15rem]">
            Closes {formatDeadline(cycle.closes_at, unit.timezone)}.{" "}
            {short
              ? `Below ${cycle.min_responses} at the deadline there is no story — there is no way to write one without narrowing who said what.`
              : `Past ${cycle.min_responses}, so a story can be written when the week closes.`}
          </p>
        </div>

        <p className="text-dim m-0 text-[13px]">
          A count is all you get, deliberately — never who answered, never any
          single answer.
        </p>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-bone font-display m-0 text-[20px] font-medium">
          The code your team scans
        </h2>

        <div className="border-hairline rounded-sharp flex flex-wrap items-start gap-7 border p-7">
          <div
            className="h-[160px] w-[160px] flex-none [&>svg]:h-full [&>svg]:w-full"
            /* Generated by the qrcode library from a URL we construct — no user
               input reaches this markup. */
            dangerouslySetInnerHTML={{ __html: qr }}
          />

          <div className="flex min-w-[15rem] flex-1 flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <span className="text-dim text-[12px] tracking-[0.1em] uppercase">
                Or share this link
              </span>
              <code className="text-secondary rounded-sharp bg-panel border-hairline overflow-x-auto border px-3 py-2 font-mono text-[12.5px] whitespace-nowrap">
                {url}
              </code>
            </div>

            <ShareControls url={url} qrSvg={qr} unitName={unit.name} />

            <Link
              href={`/app/units/${unit.id}/poster`}
              className="text-teal hover:text-amber text-[14px] no-underline"
            >
              Open the printable version →
            </Link>

            <RotateTokenButton unitId={unit.id} />
            <p className="text-dim m-0 text-[12.5px] leading-[1.55]">
              Replacing the link stops the old code and QR working straight away.
              Use it if a printout leaves the unit.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
