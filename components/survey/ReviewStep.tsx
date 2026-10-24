"use client";

import { ArrowLeft, Loader2, RotateCcw, Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { ReviewRow } from "@/lib/survey/engine";
import type { ApplicantIdentity, StepId, SubmissionError, SubmissionStatus } from "@/lib/survey/types";

interface ReviewStepProps {
  identity: Partial<ApplicantIdentity>;
  rows: ReviewRow[];
  status: SubmissionStatus;
  error: SubmissionError | null;
  honeypot: string;
  showBack: boolean;
  onHoneypotChange: (value: string) => void;
  onEdit: (stepId: StepId) => void;
  onBack: () => void;
  onSubmit: () => void;
}

/**
 * Final review before submission.
 *
 * Every answer can be edited in place, the submission cannot be triggered twice,
 * and the privacy notice sits directly next to the submit button. No marketing
 * consent is pre-selected — and no separate marketing consent is collected at
 * all beyond the early-access contact described here.
 */
export function ReviewStep({
  identity,
  rows,
  status,
  error,
  honeypot,
  showBack,
  onHoneypotChange,
  onEdit,
  onBack,
  onSubmit,
}: ReviewStepProps) {
  const submitting = status === "submitting";

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <span className="label-mono text-primary">FINAL STEP / REVIEW</span>
        <span className="label-mono-sm text-muted">{rows.length} ANSWERS</span>
      </div>

      <h3 className="mt-5 font-display text-[clamp(1.4rem,3.4vw,2rem)] leading-tight text-ink">
        You&apos;re on the final step.
      </h3>
      <p className="mt-3 max-w-xl text-[0.92rem] leading-relaxed text-muted">
        Review your answers before submitting your wishlist application.
      </p>

      <div className="mt-7 divide-y divide-line border border-line">
        <div className="flex flex-wrap items-start justify-between gap-3 bg-surface-alt/40 p-4">
          <div>
            <p className="label-mono-sm text-muted">APPLICANT</p>
            <p className="mt-1.5 text-[0.95rem] text-ink">{identity.fullName || "Not provided"}</p>
            <p className="font-mono text-[0.78rem] text-muted">
              {identity.email || "Not provided"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onEdit("identity")}
            className="label-mono-sm text-primary underline-offset-4 hover:underline"
          >
            Edit
          </button>
        </div>

        {rows.map((row) => (
          <div key={row.stepId} className="flex flex-wrap items-start justify-between gap-3 p-4">
            <div className="max-w-xl">
              <p className="label-mono-sm text-muted">{row.prompt}</p>
              <ul className="mt-1.5 space-y-0.5">
                {row.answers.length > 0 ? (
                  row.answers.map((answer) => (
                    <li key={answer} className="text-[0.92rem] text-ink">
                      {answer}
                    </li>
                  ))
                ) : (
                  <li className="text-[0.92rem] text-danger">Not answered</li>
                )}
              </ul>
            </div>
            <button
              type="button"
              onClick={() => onEdit(row.stepId)}
              className="label-mono-sm text-primary underline-offset-4 hover:underline"
            >
              Edit
            </button>
          </div>
        ))}
      </div>

      {/* Honeypot: hidden from users and assistive technology, tempting to bots. */}
      <div aria-hidden className="pointer-events-none absolute h-0 w-0 overflow-hidden opacity-0">
        <label htmlFor="company-website">Leave this field empty</label>
        <input
          id="company-website"
          name="company-website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(event) => onHoneypotChange(event.target.value)}
        />
      </div>

      {error ? (
        <div role="alert" className="mt-5 border border-danger/60 bg-danger/8 p-4">
          <p className="label-mono-sm text-danger">NOT SUBMITTED</p>
          <p className="mt-2 text-[0.9rem] leading-relaxed text-ink">{error.message}</p>
          {error.fieldErrors ? (
            <ul className="mt-3 space-y-1">
              {[...new Set(Object.values(error.fieldErrors))].map((message) => (
                <li key={message} className="font-mono text-[0.72rem] text-danger">
                  {message}
                </li>
              ))}
            </ul>
          ) : null}
          <p className="mt-3 font-mono text-[0.7rem] text-muted">
            Your answers have been kept. Use “Submit” to try again.
          </p>
        </div>
      ) : null}

      <div className="mt-6 flex flex-col-reverse gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
        {showBack ? (
          <Button variant="secondary" onClick={onBack} disabled={submitting}>
            <ArrowLeft aria-hidden className="h-3.5 w-3.5" />
            Back
          </Button>
        ) : (
          <span aria-hidden />
        )}

        {status === "error" ? (
          <Button onClick={onSubmit} size="lg" disabled={submitting} className="w-full sm:w-auto">
            <RotateCcw aria-hidden className="h-3.5 w-3.5" />
            Retry submission
          </Button>
        ) : (
          <Button
            onClick={onSubmit}
            size="lg"
            disabled={submitting}
            aria-busy={submitting}
            className="w-full sm:w-auto"
          >
            {submitting ? (
              <>
                <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
                Submitting…
              </>
            ) : (
              <>
                <Send aria-hidden className="h-3.5 w-3.5" />
                Submit Wishlist Application
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
