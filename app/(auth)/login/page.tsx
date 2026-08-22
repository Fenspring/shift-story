"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Field, FormError, SubmitButton } from "@/components/app/form";
import { signIn, type ActionState } from "@/lib/auth/actions";

const INITIAL: ActionState = { error: null };

export default function LoginPage() {
  const [state, formAction] = useActionState(signIn, INITIAL);

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-col gap-2">
        <h1 className="text-bone font-display m-0 text-[30px] font-medium">
          Sign in
        </h1>
        <p className="text-secondary m-0 text-[15px]">
          Manage your units and read the story of the shift.
        </p>
      </div>

      <form action={formAction} className="flex flex-col gap-4">
        <FormError message={state.error} />
        <Field name="email" label="Work email" type="email" required autoComplete="email" autoFocus />
        <Field name="password" label="Password" type="password" required autoComplete="current-password" />
        <SubmitButton pendingLabel="Signing in…">Sign in</SubmitButton>
      </form>

      <p className="text-dim m-0 text-[13.5px]">
        No account yet?{" "}
        <Link href="/signup" className="text-teal hover:text-amber">
          Create one
        </Link>
        .
      </p>
    </div>
  );
}
