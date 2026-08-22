import { z } from "zod";

export const ROLES = [
  { value: "cno", label: "Chief Nursing Officer" },
  { value: "don", label: "Director of Nursing" },
  { value: "nm", label: "Nurse Manager" },
  { value: "anm", label: "Assistant Nurse Manager" },
  { value: "educator", label: "Clinical Educator" },
  { value: "quality", label: "Quality / Operations Leader" },
  { value: "other", label: "Other" },
] as const;

const roleValues = ROLES.map((r) => r.value) as unknown as [string, ...string[]];

const optionalText = (max: number) =>
  z
    .string()
    .max(max, `Please keep this under ${max} characters.`)
    .transform((v) => v.trim())
    .optional()
    .default("");

export const waitlistSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required.").max(80),
  lastName: z.string().trim().min(1, "Last name is required.").max(80),
  email: z
    .email("Enter a valid work email address.")
    .max(254)
    .transform((v) => v.trim().toLowerCase()),
  org: z.string().trim().min(1, "Organization is required.").max(160),
  role: z.enum(roleValues, { message: "Select the role that fits best." }),
  unit: optionalText(160),
  issue: optionalText(2000),
  // Honeypot: a real person never sees this field, so anything in it is a bot.
  // It is accepted by the schema on purpose — rejecting it here would return a
  // validation error naming the field, which tells a bot exactly what tripped.
  // The route quietly drops these instead.
  website: z.string().max(200).optional().default(""),
});

export type WaitlistInput = z.infer<typeof waitlistSchema>;

export const roleLabel = (value: string) =>
  ROLES.find((r) => r.value === value)?.label ?? value;
