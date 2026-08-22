import { randomBytes } from "node:crypto";

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
