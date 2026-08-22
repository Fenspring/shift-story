import { NextResponse } from "next/server";
import { z } from "zod";

import { clientIp, rateLimit } from "@/lib/rate-limit";
import { waitlistSchema } from "@/lib/waitlist/schema";
import { getWaitlistStore } from "@/lib/waitlist/store";

// `pg` needs the Node runtime; the edge runtime cannot open a TCP socket.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RATE_LIMIT = { limit: 5, windowMs: 10 * 60 * 1000 };

const MAX_BODY_BYTES = 16 * 1024;

type FieldErrors = Record<string, string[]>;

function fail(status: number, error: string, fieldErrors?: FieldErrors) {
  return NextResponse.json({ ok: false, error, fieldErrors }, { status });
}

export async function POST(request: Request) {
  const ip = clientIp(request.headers);
  const limit = rateLimit(`waitlist:${ip}`, RATE_LIMIT);

  if (!limit.ok) {
    return NextResponse.json(
      { ok: false, error: "Too many signups from this connection. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_BODY_BYTES) {
    return fail(413, "That submission is too large.");
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return fail(400, "Could not read that submission.");
  }

  const parsed = waitlistSchema.safeParse(payload);
  if (!parsed.success) {
    const { fieldErrors } = z.flattenError(parsed.error);
    return fail(400, "Please check the highlighted fields.", fieldErrors as FieldErrors);
  }

  const entry = parsed.data;

  // Honeypot tripped: report success so the bot moves on, and store nothing.
  if (entry.website) {
    return NextResponse.json({ ok: true });
  }

  try {
    const store = getWaitlistStore();
    const { created } = await store.add(entry);

    if (created) {
      // Never block the response on the notifier, and never let it throw.
      void notify(entry).catch((err) => {
        console.error("[waitlist] webhook failed:", err);
      });
    }

    // A duplicate email returns the same shape as a new signup — the form must
    // not become a way to test whether an address is already on the list.
    return NextResponse.json({ ok: true });
  } catch (err) {
    // Log the failure, not the submission: the payload is PII.
    console.error("[waitlist] failed to persist signup:", err);
    return fail(500, "Something went wrong on our end. Please try again.");
  }
}

async function notify(entry: z.infer<typeof waitlistSchema>) {
  const url = process.env.WAITLIST_WEBHOOK_URL?.trim();
  if (!url) return;

  await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      text: `New Shift Story waitlist signup: ${entry.firstName} ${entry.lastName} — ${entry.org} (${entry.role})`,
    }),
    signal: AbortSignal.timeout(5_000),
  });
}
