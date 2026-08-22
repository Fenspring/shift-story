/**
 * Removes obvious direct identifiers before free text leaves our infrastructure.
 *
 * This is a reduction of risk, not de-identification. It cannot catch a name
 * written in prose, and it deliberately does not try: over-scrubbing would
 * destroy the operational detail the whole product exists to surface. Room and
 * bed numbers are kept for the same reason — "the call light in 412 has been
 * broken for a week" is exactly the signal a manager needs.
 *
 * The real protections are elsewhere: the response threshold, the instruction
 * to the model never to echo identifying detail, and the destruction of this
 * text once its story is written.
 */
const PATTERNS: Array<[RegExp, string]> = [
  // Email addresses.
  [/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[email]"],
  // URLs, which can carry identifiers in query strings.
  [/https?:\/\/\S+/gi, "[link]"],
  // North American phone numbers, with or without separators. Bounded by
  // digit lookarounds rather than \b: a leading \b would anchor after an
  // opening parenthesis and leave it stranded in the output.
  [/(?<!\d)(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}(?!\d)/g, "[phone]"],
  // Long digit runs — MRNs, employee IDs, account numbers. Seven or more, so
  // room numbers, bed numbers, times and dates are left alone.
  [/\b\d{7,}\b/g, "[number]"],
];

export function scrubIdentifiers(text: string): string {
  return PATTERNS.reduce((acc, [pattern, replacement]) => acc.replace(pattern, replacement), text);
}
