"use client";

import { useFormStatus } from "react-dom";

export const CONTROL_CLASS =
  "bg-panel border-hairline-strong text-bone rounded-sharp focus-visible:border-teal focus-visible:outline-teal w-full border px-3.5 py-3 font-sans text-[14.5px] focus-visible:outline-2 focus-visible:outline-offset-1";

export function Field({
  name,
  label,
  type = "text",
  required,
  autoComplete,
  hint,
  defaultValue,
  autoFocus,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  autoComplete?: string;
  hint?: string;
  defaultValue?: string;
  autoFocus?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="text-muted text-[12.5px]">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        autoComplete={autoComplete}
        defaultValue={defaultValue}
        autoFocus={autoFocus}
        className={CONTROL_CLASS}
      />
      {hint ? <p className="text-dim m-0 text-[12px]">{hint}</p> : null}
    </div>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="rounded-sharp m-0 border border-[rgb(242_166_90/0.5)] bg-[rgb(242_166_90/0.08)] px-3.5 py-3 text-[13.5px] text-[#f5b975]"
    >
      {message}
    </p>
  );
}

export function SubmitButton({
  children,
  pendingLabel,
}: {
  children: React.ReactNode;
  pendingLabel: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-amber text-ink hover:bg-amber-bright rounded-sharp mt-1 cursor-pointer border-none px-6 py-[13px] text-[15px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F3EFE7] disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
