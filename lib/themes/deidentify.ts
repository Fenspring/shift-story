/**
 * Produces a leader-safe excerpt, or null.
 *
 * Biased hard toward null. The brief is explicit — if the system cannot
 * confidently de-identify something, it hides it — so this drops plenty of
 * perfectly innocent responses rather than risk surfacing one that narrows to a
 * person. A leader seeing four excerpts instead of six costs nothing; a leader
 * recognising who wrote one costs the product its whole premise.
 *
 * The full text is never shown to a leader by any path: only this excerpt is
 * stored on the leader-readable column, and only for responses that pass.
 */

const MIN_LENGTH = 25;
const MAX_LENGTH = 200;

/** Capitalized terms that are operational vocabulary, not people. */
const SAFE_CAPITALIZED = new Set([
  "ICU", "ER", "ED", "OR", "PACU", "NICU", "PICU", "CCU", "MICU", "SICU", "IV",
  "EKG", "ECG", "CT", "MRI", "IT", "HR", "PT", "OT", "RN", "LPN", "CNA", "MD",
  "NP", "PA", "EPIC", "CERNER", "MEDITECH", "PYXIS", "OMNICELL", "SBAR", "EHR",
  "EMR", "PPE", "COVID", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY",
  "SATURDAY", "SUNDAY", "AM", "PM", "I", "A",
]);

/**
 * Words that legitimately start a sentence with a capital.
 *
 * Anything else capitalized at position zero is treated as a name — "Karen
 * never restocks the cart" is precisely the sentence this has to catch, and
 * skipping the first word because capitals are normal there is how it gets
 * missed. Over-rejection is the intended failure direction.
 */
const COMMON_SENTENCE_START = new Set([
  "THE", "A", "AN", "WE", "I", "IT", "THEY", "THERE", "THIS", "THAT", "THESE",
  "THOSE", "OUR", "MY", "MOST", "MANY", "SOME", "NO", "NOT", "NOBODY", "NOTHING",
  "SOMEONE", "EVERYONE", "EVERY", "EACH", "ALL", "BOTH", "WHEN", "WHENEVER",
  "WHILE", "IF", "BECAUSE", "SINCE", "AFTER", "BEFORE", "DURING", "ONCE",
  "AGAIN", "STILL", "ALWAYS", "NEVER", "OFTEN", "USUALLY", "TOO", "SO", "VERY",
  "JUST", "ONLY", "EVEN", "ALSO", "BUT", "AND", "OR", "YET", "HAVING", "BEING",
  "GETTING", "TRYING", "WAITING", "LOOKING", "FINDING", "RUNNING", "WORKING",
  "STAFF", "STAFFING", "NURSES", "NURSING", "MANAGEMENT", "LEADERSHIP",
  "ADMISSIONS", "DISCHARGES", "HANDOFF", "HANDOFFS", "SUPPLIES", "EQUIPMENT",
  "CHARTING", "DOCUMENTATION", "SCHEDULING", "COMMUNICATION", "WORKFLOW",
  "BREAKS", "SHIFTS", "SHIFT", "NIGHTS", "DAYS", "EVENINGS", "WEEKENDS",
  "PHARMACY", "TRANSPORT", "HOUSEKEEPING", "LAB", "STOCK", "TOO_MANY",
  "STARTED", "STOPPED", "CAME", "WENT", "TOOK", "SPENT", "LOST", "HAD", "HAS",
  "WAS", "WERE", "IS", "ARE", "BEEN", "DO", "DOES", "DID", "CAN", "COULD",
  "WOULD", "SHOULD", "WILL", "WOULDN'T", "COULDN'T", "DIDN'T", "DOESN'T",
  "ISN'T", "AREN'T", "WASN'T", "WEREN'T", "CAN'T", "WON'T", "IT'S", "THERE'S",
  "WE'RE", "WE'VE", "I'M", "I'VE", "THEY'RE", "YOU", "YOUR",
]);

const DISQUALIFYING: Array<[RegExp, string]> = [
  [/[\w.+-]+@[\w-]+\.[\w.-]+/, "email address"],
  [/https?:\/\/\S+/i, "link"],
  [/(?<!\d)(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}(?!\d)/, "phone number"],
  [/\b\d{6,}\b/, "long number, possibly a record number"],
  // Anything gesturing at a specific person receiving care.
  [/\bmrn\b/i, "record number reference"],
  [/\bpatient(s)?\b/i, "patient reference"],
  [/\bpt\.?\s/i, "patient reference"],
  [/\bresident(s)?\b/i, "resident reference"],
  [/\bfamily member\b/i, "family reference"],
  [/\broom\s*\d+/i, "room number"],
  [/\bbed\s*\d+/i, "bed number"],
];

export type DeidentifyResult =
  | { ok: true; excerpt: string }
  | { ok: false; reason: string };

export function deidentify(raw: string): DeidentifyResult {
  const text = raw.replace(/\s+/g, " ").trim();

  if (text.length < MIN_LENGTH) return { ok: false, reason: "too short to be useful" };
  if (text.length > MAX_LENGTH) return { ok: false, reason: "too long to vet confidently" };

  for (const [pattern, reason] of DISQUALIFYING) {
    if (pattern.test(text)) return { ok: false, reason };
  }

  // A capitalized word that is not known operational vocabulary is most likely
  // somebody's name. Position zero is checked too, against a list of ordinary
  // sentence starters — a name is most natural exactly there.
  const sentences = text.split(/(?<=[.!?])\s+/);
  for (const sentence of sentences) {
    const words = sentence.split(/\s+/);
    for (let i = 0; i < words.length; i++) {
      const bare = words[i].replace(/[^A-Za-z'-]/g, "");
      if (bare.length < 2) continue;
      if (!/^[A-Z]/.test(bare)) continue;

      const upper = bare.toUpperCase();
      if (SAFE_CAPITALIZED.has(upper)) continue;
      if (i === 0 && COMMON_SENTENCE_START.has(upper)) continue;

      return { ok: false, reason: `possible name: "${bare}"` };
    }
  }

  return { ok: true, excerpt: text };
}

/** Convenience for the write path: the excerpt, or null to store. */
export function safeExcerptOrNull(raw: string): string | null {
  const result = deidentify(raw);
  return result.ok ? result.excerpt : null;
}
