"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Field, FormError, SubmitButton } from "@/components/app/form";
import { signUp, type ActionState } from "@/lib/auth/actions";

const INITIAL: ActionState = { error: null };

export default function SignupPage() {
  const [state, formAction] = useActionState(signUp, INITIAL);

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-col gap-2">
        <h1 className="text-bone font-display m-0 text-[30px] font-medium">
          Create your account
        </h1>
        <p className="text-secondary m-0 text-[15px]">
          Start with one unit. You can add more once your team trusts it.
        </p>
      </div>

      <form action={formAction} className="flex flex-col gap-4">
        <FormError message={state.error} />
        <Field name="fullName" label="Your name" required autoComplete="name" autoFocus />
        <Field name="jobTitle" label="Your role" autoComplete="organization-title" hint="Optional — for example, Nurse Manager." />
        <Field name="organization" label="Organization" required autoComplete="organization" />
        <Field name="email" label="Work email" type="email" required autoComplete="email" />
        <Field
          name="password"
          label="Password"
          type="password"
          required
          autoComplete="new-password"
          hint="At least 12 characters."
        />
        <SubmitButton pendingLabel="Creating account…">Create account</SubmitButton>
      </form>

      <p className="text-dim m-0 text-[13.5px]">
        Already have an account?{" "}
        <Link href="/login" className="text-teal hover:text-amber">
          Sign in
        </Link>
        .
      </p>
    </div>
  );
}
