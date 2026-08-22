/**
 * Fixed-window rate limiter held in process memory.
 *
 * This is deliberately simple: it protects a single instance from casual abuse
 * and does not coordinate across instances. If the app is deployed to more than
 * one region or scales past a single container, move this to a shared store
 * (Upstash Redis, Vercel KV) — the interface below is the whole surface to swap.
 */
type Window = { count: number; resetAt: number };

const windows = new Map<string, Window>();

const MAX_TRACKED_KEYS = 10_000;

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

export function rateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number },
): RateLimitResult {
  const now = Date.now();
  const existing = windows.get(key);

  if (!existing || existing.resetAt <= now) {
    // Opportunistic cleanup so an unbounded key space cannot grow the map
    // forever under a spray of distinct IPs.
    if (windows.size >= MAX_TRACKED_KEYS) {
      for (const [k, w] of windows) {
        if (w.resetAt <= now) windows.delete(k);
      }
    }
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  existing.count += 1;
  const remaining = Math.max(0, limit - existing.count);

  return {
    ok: existing.count <= limit,
    remaining,
    retryAfterSeconds: Math.ceil((existing.resetAt - now) / 1000),
  };
}

/** Best-effort client IP from the proxy headers Vercel/Netlify/nginx set. */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return headers.get("x-real-ip") ?? "unknown";
}
