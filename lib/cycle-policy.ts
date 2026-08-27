/**
 * The rules that make the product trustworthy. They live in one place because
 * they are product commitments, not incidental configuration — the landing page
 * promises them and the schema will enforce them.
 */

/** One fixed question, every week, so themes stay comparable across cycles. */
export const WEEKLY_QUESTION =
  "What made it harder to deliver a good shift this week?";

/**
 * Minimum responses before a story may be written.
 *
 * This is a floor, not a trigger: the cycle closes on its deadline, and only
 * then is the count checked. A cycle that closes short produces no story and
 * carries its responses into the next one.
 */
export const MIN_RESPONSES = 8;

/** Day of week the cycle closes. 5 = Friday, matching Date.getDay(). */
export const DEADLINE_DAY = 5;

export const DEADLINE_LABEL = "every Friday";
