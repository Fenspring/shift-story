"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Field, FormError, SubmitButton } from "@/components/app/form";
import { createUnit, type ActionState } from "@/lib/auth/actions";
import { UNIT_TYPES } from "@/lib/units/types";
import { useTimeZone } from "@/lib/use-timezone";

const INITIAL: ActionState = { error: null };

export default function NewUnitPage() {
  const [state, formAction] = useActionState(createUnit, INITIAL);
  const timezone = useTimeZone();

  return (
    <div className="flex max-w-[460px] flex-col gap-7">
      <div className="flex flex-col gap-2">
        <Link href="/app" className="text-dim hover:text-teal text-[13px] no-underline">
          ← Your units
        </Link>
        <h1 className="text-bone font-display m-0 text-[clamp(26px,3.4vw,32px)] font-medium">
          Create a unit
        </h1>
        <p className="text-secondary m-0 text-[15px] leading-[1.65]">
          Use the name your staff use. It appears on the response page they open
          from the QR code, and it is how they know the question is meant for them.
        </p>
      </div>

      <form action={formAction} className="flex flex-col gap-4">
        <FormError message={state.error} />
        <input type="hidden" name="timezone" value={timezone} />
        <Field
          name="name"
          label="Unit name"
          required
          autoFocus
          hint="For example, 4 West, Emergency, or Labor &amp; Delivery."
        />
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="unitType" className="text-muted text-[12.5px]">
              Unit type
            </label>
            <select
              id="unitType"
              name="unitType"
              defaultValue=""
              className="bg-panel border-hairline-strong text-bone rounded-sharp focus-visible:border-teal focus-visible:outline-teal w-full border px-3.5 py-3 font-sans text-[14.5px] focus-visible:outline-2 focus-visible:outline-offset-1"
            >
              <option value="">Select…</option>
              {UNIT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <Field
            name="staffCount"
            label="Approximate staff"
            type="number"
            hint="Roughly how many people work this unit."
          />
        </div>

        <p className="text-dim m-0 text-[12.5px] leading-[1.55]">
          Responses will close each Friday at 11:59pm in{" "}
          <span className="text-muted">{timezone}</span>.
        </p>
        <SubmitButton pendingLabel="Creating…">Create unit</SubmitButton>
      </form>
    </div>
  );
}
