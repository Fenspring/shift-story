import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

import { scrubIdentifiers } from "./scrub";

export const STORY_MODEL = "claude-opus-5";

const ThemeSchema = z.object({
  label: z
    .string()
    .describe("A short operational noun phrase, three to five words. No quotation marks."),
  summary: z
    .string()
    .describe(
      "One or two sentences describing the pattern across responses. Written about the work, never about a person.",
    ),
  representative_statement: z
    .string()
    .describe(
      "A neutral paraphrase of what staff described. Never a quotation, never distinctive phrasing from any single response.",
    ),
  mention_count: z
    .number()
    .int()
    .describe("How many of the responses reflect this theme."),
});

const StorySchema = z.object({
  themes: z.array(ThemeSchema).describe("Themes ordered from most to least mentioned."),
});

export type DetectedTheme = z.infer<typeof ThemeSchema>;

const SYSTEM_PROMPT = `You group anonymous weekly feedback from hospital nursing staff into recurring operational themes for a nurse leader.

The people who wrote these responses were promised anonymity, and a whole unit's willingness to speak up next week depends on that promise holding. Everything below follows from it.

Rules:
- Never reproduce a response verbatim, and never borrow distinctive phrasing. On a unit of fifteen people, everyone knows who says "the 7pm handoff is a circus". Paraphrase into neutral, plain language.
- Never include names, initials, job titles, shift patterns, dates, or any detail that would narrow a statement to one person.
- Write about the work and the process, never about an individual's conduct or performance. "Admissions arrive before rooms are ready" — not "the charge nurse does not communicate".
- Group by underlying operational cause, not by wording. "No beds", "admissions backed up" and "waiting on housekeeping" are usually one theme.
- Identify between two and six themes. Prefer fewer, well-supported themes over many thin ones. If the responses genuinely have little in common, return fewer themes and say so plainly in the summaries rather than inventing patterns.
- mention_count must reflect how many responses actually support the theme. The counts should not exceed the number of responses provided.
- If a response describes patient harm, a safety event, or something that belongs in an incident report, do not surface its details. Fold it into a general theme about the process involved.`;

export type DetectionResult =
  | { ok: true; themes: DetectedTheme[]; model: string }
  | { ok: false; reason: "refused" | "unparseable" | "empty"; detail: string };

/**
 * Groups a cycle's responses into themes.
 *
 * The caller must have checked the response threshold first — this function
 * deliberately does not know about it, so there is exactly one place in the
 * codebase where that rule lives.
 */
export async function detectThemes(bodies: string[]): Promise<DetectionResult> {
  if (bodies.length === 0) {
    return { ok: false, reason: "empty", detail: "No responses to analyze." };
  }

  const client = new Anthropic();

  const numbered = bodies
    .map((body, i) => `${i + 1}. ${scrubIdentifiers(body)}`)
    .join("\n");

  const userContent = `Here are ${bodies.length} anonymous responses from one unit for one week, in no particular order. The question was: "What made it harder to deliver a good shift this week?"

${numbered}

Group these into recurring operational themes.`;

  const response = await client.beta.messages.parse({
    model: STORY_MODEL,
    max_tokens: 16000,
    // Opt into server-side fallbacks so a safety decline is rescued in the same
    // call rather than leaving a unit with no story for the week.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    thinking: { type: "adaptive" },
    output_config: {
      effort: "high",
      format: zodOutputFormat(StorySchema),
    },
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userContent }],
  });

  // A refusal arrives as HTTP 200, so stop_reason has to be checked before
  // reading the content.
  if (response.stop_reason === "refusal") {
    return {
      ok: false,
      reason: "refused",
      detail: response.stop_details?.explanation ?? "The request was declined.",
    };
  }

  const parsed = response.parsed_output;
  if (!parsed || parsed.themes.length === 0) {
    return {
      ok: false,
      reason: "unparseable",
      detail: "The model returned no usable themes.",
    };
  }

  // Never let a hallucinated count exceed reality — it would be read as a
  // factual claim about how many people said something.
  const themes = parsed.themes.map((theme) => ({
    ...theme,
    mention_count: Math.min(Math.max(theme.mention_count, 0), bodies.length),
  }));

  return { ok: true, themes, model: response.model ?? STORY_MODEL };
}
