"use client";

import { useActionState } from "react";

import { Field, FormError, SubmitButton, CONTROL_CLASS } from "@/components/app/form";
import { createAction, type ActionState } from "@/lib/loop/actions";
import { THEMES } from "@/lib/themes/catalog";

const INITIAL: ActionState = { error: null };

export function ActionForm({
  unitId,
  cycleId,
  defaultTheme,
}: {
  unitId: string;
  cycleId: string | null;
  defaultTheme: string;
}) {
  const [state, formAction] = useActionState(createAction, INITIAL);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <FormError message={state.error} />
      <input type="hidden" name="unitId" value={unitId} />
      {cycleId ? <input type="hidden" name="cycleId" value={cycleId} /> : null}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="themeKey" className="text-muted text-[12.5px]">
          Theme
        </label>
        <select
          id="themeKey"
          name="themeKey"
          defaultValue={defaultTheme || THEMES[0].key}
          className={CONTROL_CLASS}
        >
          {THEMES.map((theme) => (
            <option key={theme.key} value={theme.key}>
              {theme.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="description" className="text-muted text-[12.5px]">
          Action
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          required
          autoFocus
          placeholder="Create a dedicated IV pump location for admissions."
          className={`${CONTROL_CLASS} resize-y`}
        />
      </div>

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <Field name="owner" label="Owner" hint="Who is carrying it. Optional." />
        <Field name="targetDate" label="Target date" type="date" />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="status" className="text-muted text-[12.5px]">
          Status
        </label>
        <select id="status" name="status" defaultValue="planned" className={CONTROL_CLASS}>
          <option value="planned">Planned</option>
          <option value="in_progress">In progress</option>
          <option value="done">Done</option>
        </select>
      </div>

      <SubmitButton pendingLabel="Saving…">Save action</SubmitButton>
    </form>
  );
}
