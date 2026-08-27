"use client";

import { useActionState } from "react";

import { FormError, SubmitButton } from "@/components/app/form";
import { rotateToken, startCycle, type ActionState } from "@/lib/cycles/actions";

const INITIAL: ActionState = { error: null };

export function StartCycleButton({ unitId }: { unitId: string }) {
  const [state, formAction] = useActionState(startCycle, INITIAL);
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <FormError message={state.error} />
      <input type="hidden" name="unitId" value={unitId} />
      <SubmitButton pendingLabel="Opening…">Start this week&rsquo;s question</SubmitButton>
    </form>
  );
}

export function RotateTokenButton({ unitId }: { unitId: string }) {
  const [state, formAction] = useActionState(rotateToken, INITIAL);
  return (
    <form action={formAction} className="flex flex-col gap-2">
      <FormError message={state.error} />
      <input type="hidden" name="unitId" value={unitId} />
      <button
        type="submit"
        className="text-dim hover:text-teal cursor-pointer border-none bg-transparent p-0 text-left text-[13px] underline transition-colors"
      >
        Replace this link
      </button>
    </form>
  );
}
