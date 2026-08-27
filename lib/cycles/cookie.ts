/**
 * Name of the per-cycle "already responded" marker.
 *
 * Scoped to the cycle so a new week always asks again, and carries no
 * information about what was written — only that this browser sent something.
 */
export function respondedCookieName(cycleId: string): string {
  return `ss_responded_${cycleId}`;
}
