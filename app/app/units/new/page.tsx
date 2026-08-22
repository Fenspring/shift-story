"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Field, FormError, SubmitButton } from "@/components/app/form";
import { createUnit, type ActionState } from "@/lib/auth/actions";

const INITIAL: ActionState = { error: null };

export default function NewUnitPage() {
  const [state, formAction] = useActionState(createUnit, INITIAL);

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
        <Field
          name="name"
          label="Unit name"
          required
          autoFocus
          hint="For example, 4 West, Emergency, or Labor &amp; Delivery."
        />
        <SubmitButton pendingLabel="Creating…">Create unit</SubmitButton>
      </form>
    </div>
  );
}
