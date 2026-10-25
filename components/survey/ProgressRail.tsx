"use client";

import type { SurveyProgress } from "@/lib/survey/engine";
import { cn } from "@/lib/utils/cn";

/**
 * Progress indicator.
 *
 * The percentage is derived from the *applicable* steps (see `buildProgress`),
 * so skipped branch questions are never counted as completed, and the answered
 * count only ever includes questions the applicant actually had to answer.
 */
export function ProgressRail({ progress }: { progress: SurveyProgress }) {
  return (
    <div className="border-b border-line bg-obsidian/70 px-4 py-4 sm:px-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="label-mono-sm text-muted">WISHLIST APPLICATION</span>
        <span className="label-mono-sm text-primary">{statusText(progress.percent)}</span>
      </div>

      <div
        role="progressbar"
        aria-label="Wishlist application progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress.percent}
        aria-valuetext={`Step ${progress.stepNumber} of ${progress.total}, ${progress.percent} percent complete`}
        className="mt-3 flex gap-1"
      >
        {progress.steps.map((step, index) => (
          <span
            key={step}
            aria-hidden
            className={cn(
              "h-1 flex-1 transition-colors duration-300",
              index < progress.index
                ? "bg-primary"
                : index === progress.index
                  ? "bg-primary/65"
                  : "bg-line/80",
            )}
          />
        ))}
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <span className="font-mono text-[0.68rem] text-muted/80">
          {progress.answeredQuestions} of {progress.totalQuestions} questions answered
        </span>
        <span className="font-mono text-[0.68rem] text-muted/80">{progress.percent}%</span>
      </div>
    </div>
  );
}

function statusText(percent: number): string {
  if (percent >= 100) return "READY TO SUBMIT";
  if (percent >= 80) return "NEARLY DONE";
  if (percent >= 50) return "HALFWAY THERE";
  if (percent >= 25) return "GOOD PROGRESS";
  return "STARTING";
}
