"use client";

import { useState } from "react";

const MAX = 2000;

const SHIFTS = [
  { value: "day", label: "Day" },
  { value: "evening", label: "Evening" },
  { value: "night", label: "Night" },
] as const;

const IMPACTS = [
  { value: "a_little", label: "A little" },
  { value: "some", label: "Some" },
  { value: "a_lot", label: "A lot" },
] as const;

/** 44px minimum touch target — this is used one-handed, mid-shift. */
const CHIP_BASE =
  "rounded-sharp min-h-[46px] flex-1 cursor-pointer border px-4 py-3 text-[15px] transition-colors";

export function ResponseForm({
  token,
  alreadyResponded,
}: {
  token: string;
  alreadyResponded: boolean;
}) {
  const [body, setBody] = useState("");
  const [shift, setShift] = useState<string | null>(null);
  const [impact, setImpact] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [overrideMarker, setOverrideMarker] = useState(false);

  if (sent) {
    return (
      <div
        className="rounded-sharp border border-[rgb(114_182_173/0.4)] bg-[rgb(114_182_173/0.07)] p-7"
        role="status"
      >
        <p className="text-bone font-display m-0 mb-2.5 text-[22px]">Thank you.</p>
        <p className="text-secondary m-0 text-[15px] leading-[1.65]">
          That went in anonymously. Your manager sees it grouped with everyone
          else&rsquo;s &mdash; never on its own, and never with your name.
        </p>
      </div>
    );
  }

  if (alreadyResponded && !overrideMarker) {
    return (
      <div className="border-hairline rounded-sharp flex flex-col items-start gap-3 border p-7">
        <p className="text-bone font-display m-0 text-[20px]">
          You&rsquo;ve already answered this week.
        </p>
        <p className="text-secondary m-0 text-[15px] leading-[1.65]">
          One response per person keeps the picture honest. The question comes
          back next week.
        </p>
        <button
          type="button"
          onClick={() => setOverrideMarker(true)}
          className="text-teal hover:text-amber min-h-[44px] cursor-pointer border-none bg-transparent p-0 text-[15px] underline transition-colors"
        >
          Sharing this device? Answer anyway
        </button>
      </div>
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending) return;

    setSending(true);
    setError(null);

    try {
      const res = await fetch("/api/respond", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, body, shift, impact }),
      });
      const data = (await res.json().catch(() => null)) as
        | { ok: boolean; error?: string }
        | null;

      if (!res.ok || !data?.ok) {
        setError(data?.error ?? "Something went wrong. Please try again.");
        return;
      }
      setSent(true);
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setSending(false);
    }
  }

  const remaining = MAX - body.length;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-7">
      {error ? (
        <p
          role="alert"
          className="rounded-sharp m-0 border border-[rgb(242_166_90/0.5)] bg-[rgb(242_166_90/0.08)] px-3.5 py-3 text-[14px] text-[#f5b975]"
        >
          {error}
        </p>
      ) : null}

      <div className="flex flex-col gap-2">
        <label htmlFor="body" className="text-muted text-[13px]">
          Your answer
        </label>
        <textarea
          id="body"
          name="body"
          rows={6}
          required
          maxLength={MAX}
          autoFocus
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Whatever got in the way this week — big or small."
          className="bg-panel border-hairline-strong text-bone rounded-sharp focus-visible:border-teal focus-visible:outline-teal w-full resize-y border px-4 py-3.5 font-sans text-[16px] leading-[1.6] focus-visible:outline-2 focus-visible:outline-offset-1"
        />
        <p className="text-dim m-0 text-right text-[12px]" aria-live="polite">
          {remaining < 200 ? `${remaining} characters left` : " "}
        </p>
      </div>

      <fieldset className="m-0 flex flex-col gap-2.5 border-none p-0">
        <legend className="text-muted p-0 text-[13px]">
          Which shift? <span className="text-dim">Optional</span>
        </legend>
        <div className="flex gap-2.5">
          {SHIFTS.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={shift === option.value}
              onClick={() => setShift(shift === option.value ? null : option.value)}
              className={`${CHIP_BASE} ${
                shift === option.value
                  ? "border-teal bg-[rgb(114_182_173/0.12)] text-bone"
                  : "border-hairline-strong text-secondary hover:border-teal"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="m-0 flex flex-col gap-2.5 border-none p-0">
        <legend className="text-muted p-0 text-[13px]">
          How much did it affect your shift? <span className="text-dim">Optional</span>
        </legend>
        <div className="flex gap-2.5">
          {IMPACTS.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={impact === option.value}
              onClick={() => setImpact(impact === option.value ? null : option.value)}
              className={`${CHIP_BASE} ${
                impact === option.value
                  ? "border-teal bg-[rgb(114_182_173/0.12)] text-bone"
                  : "border-hairline-strong text-secondary hover:border-teal"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </fieldset>

      <button
        type="submit"
        disabled={sending || body.trim().length === 0}
        className="bg-amber text-ink hover:bg-amber-bright rounded-sharp min-h-[52px] cursor-pointer border-none px-6 py-4 text-[16px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F3EFE7] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {sending ? "Sending…" : "Send anonymously"}
      </button>
    </form>
  );
}
