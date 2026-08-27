/** The fixed theme catalog. Mirrors `theme_catalog` in migration 0005. */
export const THEMES = [
  { key: "staffing", label: "Staffing & workload" },
  { key: "equipment", label: "Equipment & supplies" },
  { key: "communication", label: "Communication" },
  { key: "workflow", label: "Workflow" },
  { key: "documentation", label: "Documentation" },
  { key: "scheduling", label: "Scheduling" },
  { key: "environment", label: "Environment" },
  { key: "other", label: "Other" },
] as const;

export type ThemeKey = (typeof THEMES)[number]["key"];

export const themeLabel = (key: string): string =>
  THEMES.find((t) => t.key === key)?.label ?? key;
