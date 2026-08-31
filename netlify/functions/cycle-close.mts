import type { Config } from "@netlify/functions";

/**
 * Hourly trigger for the cycle-close job.
 *
 * Deliberately thin: it holds no product logic, only the schedule and the
 * shared secret. The work lives in POST /api/cycles/close, so the same code
 * path runs whether it is fired by this schedule, by CI, or by hand — and there
 * is only one implementation of "close a cycle" to reason about.
 *
 * Hourly rather than weekly because a cycle closes at Friday 23:59:59 in its
 * own unit's timezone, and units can sit in different timezones. An hourly
 * sweep picks each one up shortly after its own deadline; the endpoint is
 * idempotent, so the other 167 runs a week are no-ops.
 *
 * Scheduled functions only run on published production deploys — never on
 * deploy previews or branch deploys.
 */
const closeDueCycles = async (req: Request) => {
  const secret = Netlify.env.get("CRON_SECRET");
  if (!secret) {
    console.error("[cycle-close] CRON_SECRET is not set — refusing to run.");
    return;
  }

  // Netlify sets URL to the production site address.
  const base = Netlify.env.get("URL") ?? Netlify.env.get("NEXT_PUBLIC_SITE_URL");
  if (!base) {
    console.error("[cycle-close] no site URL available — cannot reach the endpoint.");
    return;
  }

  let nextRun = "unknown";
  try {
    ({ next_run: nextRun } = await req.json());
  } catch {
    // Invoked by hand rather than by the scheduler; carry on.
  }

  const started = Date.now();
  try {
    const res = await fetch(`${base.replace(/\/$/, "")}/api/cycles/close`, {
      method: "POST",
      headers: { authorization: `Bearer ${secret}` },
      // Comfortably inside the 30s ceiling for a scheduled function. A slow run
      // is not lost: the endpoint is idempotent and the next hour retries.
      signal: AbortSignal.timeout(25_000),
    });

    const body = await res.json().catch(() => ({}));
    const elapsed = Date.now() - started;

    if (!res.ok) {
      console.error(`[cycle-close] endpoint returned ${res.status} in ${elapsed}ms`, body);
      return;
    }

    console.log(
      `[cycle-close] processed ${body.processed ?? 0} cycle(s) in ${elapsed}ms; next run ${nextRun}`,
      body.outcomes ?? [],
    );
  } catch (err) {
    // Never throw: a failed sweep must not mark the deploy unhealthy, and the
    // next hour will pick the cycle up again.
    console.error("[cycle-close] failed:", err instanceof Error ? err.message : err);
  }
};

export default closeDueCycles;

export const config: Config = {
  schedule: "@hourly",
};
