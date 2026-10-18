"use client";

import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { ApplicantIdentity } from "@/lib/survey/types";

interface IdentityStepProps {
  values: Partial<ApplicantIdentity>;
  errors: Record<string, string>;
  onChange: (key: keyof ApplicantIdentity, value: string) => void;
  onSubmit: () => void;
}

/**
 * Step 0 — required applicant details.
 *
 * Deliberately minimal: a name, an email and nothing else. Nothing is written to
 * the database here; the row is only created when the whole survey is submitted
 * and the server confirms it.
 */
export function IdentityStep({ values, errors, onChange, onSubmit }: IdentityStepProps) {
  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <div className="flex items-center justify-between gap-4">
        <span className="label-mono text-primary">STEP 01 / APPLICANT</span>
        <span className="label-mono-sm text-muted">TWO FIELDS ONLY</span>
      </div>

      <h3 className="mt-5 font-display text-[clamp(1.4rem,3.4vw,2rem)] leading-tight text-ink">
        First, let&apos;s get you on the list.
      </h3>
      <p className="mt-3 max-w-xl text-[0.92rem] leading-relaxed text-muted">
        We&apos;ll use your details to give you early access to our GPUs.
      </p>

      <div className="mt-7 grid gap-5 sm:grid-cols-2">
        <Field
          id="applicant-name"
          label="Full name"
          type="text"
          autoComplete="name"
          value={values.fullName ?? ""}
          error={errors.fullName}
          onChange={(value) => onChange("fullName", value)}
          placeholder="Hanna Bekele"
        />
        <Field
          id="applicant-email"
          label="Email address"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={values.email ?? ""}
          error={errors.email}
          onChange={(value) => onChange("email", value)}
          placeholder="you@example.com"
        />
      </div>

      <div className="mt-6 flex justify-end border-t border-line pt-5">
        <Button type="submit" size="lg" className="w-full sm:w-auto">
          Continue to questions
          <ArrowRight aria-hidden className="h-3.5 w-3.5" />
        </Button>
      </div>
    </form>
  );
}

function Field({
  id,
  label,
  value,
  error,
  onChange,
  type,
  placeholder,
  autoComplete,
  inputMode,
}: {
  id: string;
  label: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
  type: "text" | "email";
  placeholder?: string;
  autoComplete?: string;
  inputMode?: "email" | "text";
}) {
  const errorId = `${id}-error`;
  return (
    <div>
      <label htmlFor={id} className="label-mono-sm block text-muted">
        {label}
        <span aria-hidden className="ml-1 text-primary">
          *
        </span>
      </label>
      <input
        id={id}
        name={id}
        type={type}
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        inputMode={inputMode}
        aria-required="true"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full border border-line bg-obsidian px-4 py-3 text-[0.95rem] text-ink placeholder:text-muted/50 focus:border-primary focus:outline-none"
      />
      {error ? (
        <p id={errorId} role="alert" className="mt-2 font-mono text-[0.72rem] text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
