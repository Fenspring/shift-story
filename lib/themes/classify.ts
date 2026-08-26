import { THEMES, type ThemeKey } from "./catalog";

/**
 * Assigns catalog themes to a response.
 *
 * Deterministic and keyword-based on purpose: it is inspectable, free, instant,
 * and a nurse leader can be told exactly why a response landed where it did.
 * Swapping in a classifier that calls a model later means providing another
 * implementation of this one function signature — nothing else in the app knows
 * how classification happens.
 */
export interface Classifier {
  classify(text: string): ThemeKey[];
}

/** Word-boundary matched, so "staff" does not fire on "staffordshire". */
const RULES: Array<{ theme: Exclude<ThemeKey, "other">; patterns: RegExp[] }> = [
  {
    theme: "staffing",
    patterns: [
      /\bshort[- ]?staff(ed|ing)?\b/, /\bunderstaff(ed|ing)?\b/, /\bstaffing\b/,
      /\bratio(s)?\b/, /\bworkload\b/, /\bfloat(ed|ing)?\b/, /\bagency\b/,
      /\bsick call(s)?\b/, /\bcall[- ]?off(s)?\b/, /\bno break(s)?\b/,
      /\bmissed (my )?break\b/, /\bovertime\b/, /\bmandated\b/, /\bacuity\b/,
      /\btoo many patients\b/, /\bnot enough (nurses|staff|people|help|hands)\b/,
    ],
  },
  {
    theme: "equipment",
    patterns: [
      /\bequipment\b/, /\bsuppl(y|ies)\b/, /\biv pump(s)?\b/, /\bpump(s)?\b/,
      /\bstock(ed|ing|out)?\b/, /\bout of\b/, /\bbroken\b/, /\bmissing\b/,
      /\blinen(s)?\b/, /\bwheelchair(s)?\b/, /\bglucometer(s)?\b/, /\btele(metry)? box(es)?\b/,
      /\bcart(s)?\b/, /\bpar level(s)?\b/, /\bbattery\b/, /\bbatteries\b/, /\bcharger(s)?\b/,
    ],
  },
  {
    theme: "communication",
    patterns: [
      /\bhandoff(s)?\b/, /\bhand[- ]?over(s)?\b/, /\bhuddle(s)?\b/, /\bsbar\b/,
      /\breport (out|off)\b/, /\bno one told\b/, /\bnot told\b/, /\bnobody told\b/,
      /\bcommunicat(e|ion|ing)\b/, /\bpage(d|s|ing)?\b/, /\bcall(ed|ing)? back\b/,
      /\bunreachable\b/, /\bdidn'?t know\b/, /\bfound out late\b/,
    ],
  },
  {
    theme: "workflow",
    patterns: [
      /\badmission(s)?\b/, /\badmit(s|ted|ting)?\b/, /\bdischarge(s)?\b/, /\btransfer(s|red)?\b/, /\bthroughput\b/,
      /\bbed(s)? (ready|available)\b/, /\bworkaround(s)?\b/, /\bprocess\b/,
      /\bbottleneck\b/, /\bwait(ing|ed)? (on|for)\b/, /\bturnaround\b/,
      /\bpharmacy\b/, /\btransport\b/, /\bhousekeeping\b/, /\bek?g\b/,
    ],
  },
  {
    theme: "documentation",
    patterns: [
      /\bcharting\b/, /\bdocument(ation|ing)?\b/, /\bepic\b/, /\bcerner\b/, /\behr\b/,
      /\bemr\b/, /\bflowsheet(s)?\b/, /\border(s)? (entry|set)\b/, /\bdouble (charting|entry)\b/,
      /\bcosign\b/, /\bco[- ]sign\b/, /\bpaperwork\b/,
    ],
  },
  {
    theme: "scheduling",
    patterns: [
      /\bschedul(e|ing)\b/, /\brota\b/, /\bself[- ]?schedul\w*\b/, /\bswap(s|ped)?\b/,
      /\bpto\b/, /\btime off\b/, /\bshift(s)? (change|swap)\b/, /\bback[- ]?to[- ]?back\b/,
      /\bdouble shift(s)?\b/, /\brotation\b/,
    ],
  },
  {
    theme: "environment",
    patterns: [
      /\bnoise|noisy\b/, /\btemperature\b/, /\bhot\b/, /\bcold\b/, /\blight(ing)?\b/,
      /\bbreak room\b/, /\bparking\b/, /\bclutter(ed)?\b/, /\bspace\b/, /\bcrowded\b/,
      /\bhallway(s)?\b/, /\bconstruction\b/, /\bdirty\b/, /\bsmell(s|y)?\b/,
    ],
  },
];

export const keywordClassifier: Classifier = {
  classify(text: string): ThemeKey[] {
    const haystack = text.toLowerCase();
    const hits = RULES.filter((rule) => rule.patterns.some((p) => p.test(haystack))).map(
      (rule) => rule.theme,
    );
    // Every response gets at least one theme, so counts always sum to something
    // a leader can reconcile against the response total.
    return hits.length > 0 ? hits : ["other"];
  },
};

export const ALL_THEME_KEYS = THEMES.map((t) => t.key);
