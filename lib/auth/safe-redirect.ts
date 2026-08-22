/**
 * Constrains a `next=` parameter to a path on this origin.
 *
 * The confirmation link is attacker-influenceable: anyone can send a victim a
 * /auth/callback URL carrying any `next` they like. Without this, a successful
 * confirmation would bounce the freshly-authenticated manager to an arbitrary
 * site — a classic open redirect, and a convincing one because the preceding
 * hop is genuinely yours.
 *
 * Accepts only a single-slash-prefixed path. Rejects absolute URLs, protocol-
 * relative "//host" (which browsers treat as absolute), and backslash variants
 * that some parsers normalize to slashes.
 */
export function safeRedirectPath(next: string | null, fallback = "/app"): string {
  if (!next) return fallback;
  if (!next.startsWith("/")) return fallback;
  if (next.startsWith("//") || next.startsWith("/\\")) return fallback;
  if (next.includes("\\")) return fallback;
  return next;
}
