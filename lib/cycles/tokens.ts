import { createHash, randomBytes } from "node:crypto";

/**
 * Generates the opaque token that a unit's QR code points at.
 *
 * This is a capability: whoever holds it can submit responses to the unit. It
 * is stored in plaintext because the manager has to be able to re-display the
 * QR code, which means the tradeoff is explicit — a database leak lets an
 * attacker post junk responses, but grants no read access to anything. Rotating
 * a unit's token revokes the old one immediately.
 */
export function generateResponseToken(): string {
  return randomBytes(24).toString("base64url");
}

/**
 * Lookup key for a response token.
 *
 * The submit path matches on this rather than the plaintext. The plaintext is
 * still stored because the manager must be able to re-render a QR code that is
 * already printed and taped to a wall — a token on a wall is public by
 * construction, so hashing it away would protect nothing while breaking the
 * feature. Per-recipient single-use tokens are the ones that will be stored
 * hash-only, when messaging arrives.
 */
export function hashResponseToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
