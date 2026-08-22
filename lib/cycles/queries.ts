export type Cycle = {
  id: string;
  question: string;
  opens_at: string;
  closes_at: string;
  min_responses: number;
  response_count: number;
  status: "open" | "closed" | "insufficient" | "story_ready";
};
/**
 * A cycle is collecting only while its deadline is still ahead.
 *
 * Evaluated from the timestamp rather than the status alone: nothing flips
 * `status` to 'closed' at the deadline yet — that is the scheduled job that
 * arrives with story generation — so the time is the authority and the status
 * is the record.
 */
export function isCollecting(cycle: Pick<Cycle, "status" | "closes_at">): boolean {
  return cycle.status === "open" && new Date(cycle.closes_at).getTime() > Date.now();
}
/** Whole days remaining, floored at zero. */
export function daysRemaining(closesAt: string): number {
  const ms = new Date(closesAt).getTime() - Date.now();
  return ms <= 0 ? 0 : Math.ceil(ms / 86_400_000);
}
export function formatDeadline(closesAt: string, timezone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    timeZone: timezone,
  }).format(new Date(closesAt));
}
