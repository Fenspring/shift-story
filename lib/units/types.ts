/**
 * Unit types offered at setup.
 *
 * A plain module rather than part of the server-action file: a "use server"
 * module may only export async functions, so a constant living there breaks the
 * build at config-collection time.
 */
export const UNIT_TYPES = [
  "ICU / Critical care",
  "Medical-surgical",
  "Emergency",
  "Perioperative",
  "Labor & delivery",
  "Telemetry / Progressive",
  "Behavioral health",
  "Other",
] as const;
