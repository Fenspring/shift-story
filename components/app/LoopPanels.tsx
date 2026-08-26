import Link from "next/link";

import { publishUpdate } from "@/lib/loop/actions";
import type { LeaderAction, SafeExcerpt, TeamUpdate, ThemeCount } from "@/lib/loop/queries";
import { themeLabel } from "@/lib/themes/catalog";

/** Below the threshold. The copy has to reassure, not scold. */
export function ProtectedPanel({
  responses,
  threshold,
}: {
  responses: number;
  threshold: number;
}) {
  const remaining = Math.max(threshold - responses, 0);
  const pct = Math.min(Math.round((responses / threshold) * 100), 100);

  return (
    <section className="border-hairline rounded-sharp bg-panel flex flex-col gap-5 border p-8">
      <div className="flex flex-col gap-2">
        <h2 className="text-bone font-display m-0 text-[clamp(21px,2.6vw,26px)] font-medium">
          Your first Shift Story is taking shape.
        </h2>
        <p className="text-secondary m-0 max-w-[54ch] text-[15.5px] leading-[1.65]">
          We need {threshold} responses before showing grouped feedback.{" "}
          {remaining > 0
            ? `${remaining} more to go.`
            : "The threshold is met — insights are below."}
        </p>
      </div>

      <div className="flex flex-col gap-2.5">
        <div
          className="bg-panel-raised h-1.5 w-full overflow-hidden"
          role="progressbar"
          aria-valuenow={responses}
          aria-valuemin={0}
          aria-valuemax={threshold}
          aria-label={`${responses} of ${threshold} responses`}
        >
          <div className="bg-teal h-full transition-[width]" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-dim m-0 text-[13px] tabular-nums">
          {responses} of {threshold} responses
        </p>
      </div>

      <p className="text-dim m-0 max-w-[56ch] text-[13px] leading-[1.6]">
        This is not a display setting. Below the threshold the server returns no
        themes and no feedback at all &mdash; on a small unit, a breakdown of
        four responses would point at the four people who wrote them.
      </p>
    </section>
  );
}

export function ThemePanel({
  themes,
  unitId,
  cycleId,
  responses,
}: {
  themes: ThemeCount[];
  unitId: string;
  cycleId: string;
  responses: number;
}) {
  const top = themes[0]?.mentions ?? 1;

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <h2 className="text-bone font-display m-0 text-[clamp(21px,2.6vw,26px)] font-medium">
          What&rsquo;s making the shift harder?
        </h2>
        <p className="text-secondary m-0 text-[14.5px]">
          Across {responses} responses this week. A response can touch more than
          one theme.
        </p>
      </div>

      <ul className="border-hairline m-0 list-none border-t p-0">
        {themes.map((theme) => (
          <li
            key={theme.theme_key}
            className="border-hairline flex flex-wrap items-center gap-x-6 gap-y-3 border-b py-4"
          >
            <span className="text-bone font-display min-w-[13rem] flex-1 text-[18px]">
              {theme.label}
            </span>

            {/* Bar, not a chart: the ranking is the whole message. */}
            <span className="hidden h-[3px] flex-[2] bg-[rgb(243_239_231/0.07)] sm:block">
              <span
                className="bg-teal block h-full"
                style={{ width: `${Math.round((theme.mentions / top) * 100)}%` }}
              />
            </span>

            <span className="text-secondary w-[7.5rem] text-right text-[14px] tabular-nums">
              {theme.mentions} {theme.mentions === 1 ? "mention" : "mentions"}
            </span>

            <Link
              href={`/app/units/${unitId}/actions/new?theme=${theme.theme_key}&cycle=${cycleId}`}
              className="text-teal hover:text-amber text-[13.5px] whitespace-nowrap no-underline transition-colors"
            >
              Act on this →
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ExcerptPanel({ excerpts }: { excerpts: SafeExcerpt[] }) {
  if (excerpts.length === 0) return null;

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <h2 className="text-bone font-display m-0 text-[20px] font-medium">
          In their words
        </h2>
        <p className="text-dim m-0 max-w-[58ch] text-[13px] leading-[1.6]">
          De-identified excerpts only. Anything naming a person, a patient, a
          room or a record number is withheld automatically &mdash; so this is a
          sample, never the full set.
        </p>
      </div>

      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {excerpts.map((item, i) => (
          <li
            key={i}
            className="border-l border-[rgb(114_182_173/0.4)] pl-4 text-[15.5px] leading-[1.6]"
          >
            <span className="text-secondary font-display italic">&ldquo;{item.excerpt}&rdquo;</span>
            <span className="text-dim mt-1 block text-[12px] tracking-[0.08em] uppercase">
              {themeLabel(item.theme_key)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

const STATUS_LABEL: Record<LeaderAction["status"], string> = {
  planned: "Planned",
  in_progress: "In progress",
  done: "Done",
};

export function ActionPanel({
  actions,
  unitId,
}: {
  actions: LeaderAction[];
  unitId: string;
}) {
  if (actions.length === 0) return null;

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-bone font-display m-0 text-[20px] font-medium">Actions</h2>
      <ul className="border-hairline m-0 list-none border-t p-0">
        {actions.map((action) => (
          <li key={action.id} className="border-hairline flex flex-col gap-2 border-b py-4">
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <span className="text-teal text-[11px] tracking-[0.12em] uppercase">
                {themeLabel(action.theme_key)}
              </span>
              <span className="text-dim text-[11px] tracking-[0.12em] uppercase">
                {STATUS_LABEL[action.status]}
              </span>
              {action.target_date ? (
                <span className="text-dim text-[11px] tracking-[0.12em] uppercase tabular-nums">
                  by {action.target_date}
                </span>
              ) : null}
            </div>

            <p className="text-bone m-0 text-[16px] leading-[1.55]">{action.description}</p>

            <div className="flex flex-wrap items-center gap-4">
              {action.owner ? (
                <span className="text-dim text-[13px]">Owner: {action.owner}</span>
              ) : null}
              <Link
                href={`/app/units/${unitId}/updates/new?action=${action.id}`}
                className="text-teal hover:text-amber text-[13.5px] no-underline transition-colors"
              >
                Write You said / We did →
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function UpdatePanel({
  updates,
  unitId,
}: {
  updates: TeamUpdate[];
  unitId: string;
}) {
  if (updates.length === 0) return null;

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-bone font-display m-0 text-[20px] font-medium">
        You said / We did
      </h2>

      <ul className="m-0 flex list-none flex-col gap-4 p-0">
        {updates.map((update) => (
          <li
            key={update.id}
            className="border-hairline rounded-sharp bg-panel flex flex-col border"
          >
            <div className="border-hairline flex flex-wrap items-center justify-between gap-3 border-b px-6 py-3">
              <span className="text-dim font-mono text-[10.5px] tracking-[0.14em] uppercase">
                {update.status === "published" ? "Published to the unit" : "Draft"}
              </span>
              <div className="flex items-center gap-4">
                <Link
                  href={`/app/units/${unitId}/updates/new?id=${update.id}`}
                  className="text-dim hover:text-teal text-[13px] no-underline transition-colors"
                >
                  Edit
                </Link>
                {update.status === "draft" ? (
                  <form action={publishUpdate}>
                    <input type="hidden" name="unitId" value={unitId} />
                    <input type="hidden" name="updateId" value={update.id} />
                    <button
                      type="submit"
                      className="bg-amber text-ink hover:bg-amber-bright rounded-sharp cursor-pointer border-none px-4 py-2 text-[13px] font-semibold transition-colors"
                    >
                      Publish
                    </button>
                  </form>
                ) : null}
              </div>
            </div>

            <div className="flex flex-col gap-2 px-6 pt-6 pb-4">
              <span className="text-teal text-[11px] tracking-[0.14em] uppercase">
                You said
              </span>
              <p className="text-bone font-display m-0 text-[19px] leading-[1.45] italic">
                {update.you_said}
              </p>
            </div>

            <div className="mx-6 h-px bg-[rgb(243_239_231/0.1)]" />

            <div className="flex flex-col gap-2 px-6 pt-4 pb-6">
              <span className="text-amber text-[11px] tracking-[0.14em] uppercase">
                We did
              </span>
              <p className="text-bone font-display m-0 text-[19px] leading-[1.45]">
                {update.we_did}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
