"use client";

import { useId, useState } from "react";

import { ROLES } from "@/lib/waitlist/schema";

type FieldName = "firstName" | "lastName" | "email" | "org" | "role" | "unit" | "issue";

type FormState = Record<FieldName, string>;

const EMPTY_FORM: FormState = {
  firstName: "",
  lastName: "",
  email: "",
  org: "",
  role: "",
  unit: "",
  issue: "",
};

const CONTROL_CLASS =
  "bg-panel border-hairline-strong text-bone rounded-sharp focus-visible:border-teal focus-visible:outline-teal border px-3.5 py-3 font-sans text-[14.5px] focus-visible:outline-2 focus-visible:outline-offset-1";

const LABEL_CLASS = "text-muted text-[12.5px]";

type Props = {
  submitLabel?: string;
  showOptionalQuestion?: boolean;
};

export function WaitlistForm({
  submitLabel = "Join the founding waitlist",
  showOptionalQuestion = true,
}: Props) {
  const uid = useId();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [honeypot, setHoneypot] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const fieldId = (name: FieldName) => `${uid}-${name}`;
  const errorId = (name: FieldName) => `${uid}-${name}-error`;

  const set = (name: FieldName) => (value: string) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    // Clear the server-side error for a field as soon as it is edited.
    setFieldErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || submitted) return;

    setSubmitting(true);
    setFormError(null);
    setFieldErrors({});

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...form, website: honeypot }),
      });

      const data = (await response.json().catch(() => null)) as
        | { ok: boolean; error?: string; fieldErrors?: Record<string, string[]> }
        | null;

      if (!response.ok || !data?.ok) {
        const errors: Partial<Record<FieldName, string>> = {};
        for (const [key, messages] of Object.entries(data?.fieldErrors ?? {})) {
          if (messages?.length) errors[key as FieldName] = messages[0];
        }
        setFieldErrors(errors);
        setFormError(data?.error ?? "Something went wrong. Please try again.");
        return;
      }

      setSubmitted(true);
    } catch {
      setFormError("Could not reach the server. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div
        className="bg-panel-raised rounded-sharp border border-[rgb(114_182_173/0.4)] p-8"
        role="status"
      >
        <p className="text-bone font-display m-0 mb-2.5 text-[22px]">
          You’re on the list.
        </p>
        <p className="text-secondary m-0 text-[15px] leading-[1.6]">
          We’ll be in touch when the founding cohort opens.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      {formError ? (
        <p
          role="alert"
          className="rounded-sharp m-0 border border-[rgb(242_166_90/0.5)] bg-[rgb(242_166_90/0.08)] px-3.5 py-3 text-[13.5px] text-[#f5b975]"
        >
          {formError}
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <Field
          name="firstName"
          label="First name"
          value={form.firstName}
          onChange={set("firstName")}
          error={fieldErrors.firstName}
          autoComplete="given-name"
          required
          fieldId={fieldId}
          errorId={errorId}
        />
        <Field
          name="lastName"
          label="Last name"
          value={form.lastName}
          onChange={set("lastName")}
          error={fieldErrors.lastName}
          autoComplete="family-name"
          required
          fieldId={fieldId}
          errorId={errorId}
        />
      </div>

      <Field
        name="email"
        label="Work email"
        type="email"
        value={form.email}
        onChange={set("email")}
        error={fieldErrors.email}
        autoComplete="email"
        required
        fieldId={fieldId}
        errorId={errorId}
      />

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <Field
          name="org"
          label="Organization"
          value={form.org}
          onChange={set("org")}
          error={fieldErrors.org}
          autoComplete="organization"
          required
          fieldId={fieldId}
          errorId={errorId}
        />

        <div className="flex flex-col gap-1.5">
          <label htmlFor={fieldId("role")} className={LABEL_CLASS}>
            Role
          </label>
          <select
            id={fieldId("role")}
            name="role"
            required
            value={form.role}
            onChange={(e) => set("role")(e.target.value)}
            aria-invalid={fieldErrors.role ? true : undefined}
            aria-describedby={fieldErrors.role ? errorId("role") : undefined}
            className={CONTROL_CLASS}
          >
            <option value="">Select…</option>
            {ROLES.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </select>
          <FieldError id={errorId("role")} message={fieldErrors.role} />
        </div>
      </div>

      <Field
        name="unit"
        label="Primary unit or department"
        value={form.unit}
        onChange={set("unit")}
        error={fieldErrors.unit}
        fieldId={fieldId}
        errorId={errorId}
      />

      {showOptionalQuestion ? (
        <div className="flex flex-col gap-1.5">
          <label htmlFor={fieldId("issue")} className={LABEL_CLASS}>
            Optional — what is one issue that makes your team’s shifts harder
            than they need to be?
          </label>
          <textarea
            id={fieldId("issue")}
            name="issue"
            rows={3}
            value={form.issue}
            onChange={(e) => set("issue")(e.target.value)}
            aria-invalid={fieldErrors.issue ? true : undefined}
            aria-describedby={fieldErrors.issue ? errorId("issue") : undefined}
            className={`${CONTROL_CLASS} resize-y`}
          />
          <FieldError id={errorId("issue")} message={fieldErrors.issue} />
        </div>
      ) : null}

      {/* Honeypot — off-screen and hidden from AT, so only a bot fills it in. */}
      <div aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <label htmlFor={`${uid}-website`}>Website</label>
        <input
          id={`${uid}-website`}
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="bg-amber text-ink hover:bg-amber-bright rounded-sharp mt-2 cursor-pointer border-none px-6 py-[15px] text-[15px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F3EFE7] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {submitting ? "Submitting…" : submitLabel}
      </button>
    </form>
  );
}

type FieldProps = {
  name: FieldName;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  type?: string;
  required?: boolean;
  autoComplete?: string;
  fieldId: (name: FieldName) => string;
  errorId: (name: FieldName) => string;
};

function Field({
  name,
  label,
  value,
  onChange,
  error,
  type = "text",
  required,
  autoComplete,
  fieldId,
  errorId,
}: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={fieldId(name)} className={LABEL_CLASS}>
        {label}
      </label>
      <input
        id={fieldId(name)}
        name={name}
        type={type}
        required={required}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId(name) : undefined}
        className={CONTROL_CLASS}
      />
      <FieldError id={errorId(name)} message={error} />
    </div>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="text-amber m-0 text-[12.5px]">
      {message}
    </p>
  );
}
