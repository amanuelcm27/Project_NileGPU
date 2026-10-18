"use client";

import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { useId } from "react";
import { Button } from "@/components/ui/Button";
import { OTHER_OPTION_ID } from "@/lib/survey/questions";
import type { AnswerKey, QuestionDef } from "@/lib/survey/types";
import { cn } from "@/lib/utils/cn";

interface QuestionStepProps {
  question: QuestionDef;
  value: string | string[] | undefined;
  otherValue: string | undefined;
  error: string | null;
  fieldErrors: Record<string, string>;
  showBack: boolean;
  onChange: (key: AnswerKey, value: string | string[]) => void;
  onContinue: () => void;
  onBack: () => void;
}

/**
 * One question per screen.
 *
 * Selection uses native radio/checkbox inputs (visually replaced) so keyboard
 * behaviour — arrow keys within a group, space to toggle, one tab stop per
 * group — is the browser's, not a reimplementation. Enter advances, except
 * from text fields where it would be ambiguous.
 */
export function QuestionStep({
  question,
  value,
  otherValue,
  error,
  fieldErrors,
  showBack,
  onChange,
  onContinue,
  onBack,
}: QuestionStepProps) {
  const promptId = useId();
  const otherId = useId();
  const otherFieldId = useId();
  const isMulti = question.selection === "multi";
  const selectedList = Array.isArray(value) ? value : [];
  const selectedSingle = typeof value === "string" ? value : "";
  const otherSelected = isMulti ? selectedList.includes(OTHER_OPTION_ID) : selectedSingle === OTHER_OPTION_ID;
  const otherError = question.otherKey ? fieldErrors[question.otherKey] : undefined;

  const handleSelect = (optionId: string) => {
    if (isMulti) {
      const next = selectedList.includes(optionId)
        ? selectedList.filter((item) => item !== optionId)
        : [...selectedList, optionId];
      onChange(question.field, next);
      return;
    }
    onChange(question.field, optionId);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Enter") return;
    const target = event.target as HTMLElement;
    const tag = target.tagName;
    if (tag === "TEXTAREA") return;
    if (tag === "INPUT") {
      const type = (target as HTMLInputElement).type;
      if (type === "text" || type === "email" || type === "search") return;
    }
    event.preventDefault();
    onContinue();
  };

  return (
    <div onKeyDown={handleKeyDown}>
      <div className="flex items-center justify-between gap-4">
        <span className="label-mono text-primary">QUESTION</span>
        <span className="label-mono-sm text-muted">{question.field.toUpperCase()}</span>
      </div>

      <h3 id={promptId} className="mt-5 font-display text-[clamp(1.35rem,3.2vw,1.85rem)] leading-tight text-ink">
        {question.prompt}
      </h3>
      {question.supporting ? (
        <p className="mt-3 max-w-2xl text-[0.92rem] leading-relaxed text-muted">
          {question.supporting}
        </p>
      ) : null}

      <div
        role="group"
        aria-labelledby={promptId}
        className="mt-6 grid gap-2.5 sm:grid-cols-2"
      >
        {question.options.map((option) => {
          const selected = isMulti ? selectedList.includes(option.id) : selectedSingle === option.id;
          const inputId = `${question.id}-${option.id}`;
          return (
            <label
              key={option.id}
              htmlFor={inputId}
              className={cn(
                "peer/label group relative flex cursor-pointer items-start gap-3.5 border p-4 transition-colors duration-200",
                selected
                  ? "border-primary bg-primary/10"
                  : "border-line bg-surface-alt/50 hover:border-line-strong hover:bg-surface-alt",
              )}
            >
              <input
                id={inputId}
                name={question.id}
                type={isMulti ? "checkbox" : "radio"}
                className="peer sr-only"
                checked={selected}
                value={option.id}
                onChange={() => handleSelect(option.id)}
              />
              <span
                aria-hidden
                className={cn(
                  "mt-0.5 grid h-5 w-5 shrink-0 place-items-center border transition-colors",
                  selected ? "border-primary bg-primary/20" : "border-line-strong group-hover:border-primary/60",
                  "peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary",
                )}
              >
                {selected ? (
                  isMulti ? (
                    <Check className="h-3.5 w-3.5 text-primary" />
                  ) : (
                    <span className="h-2.5 w-2.5 bg-primary" />
                  )
                ) : null}
              </span>
              <span className="flex-1">
                <span className="block text-[0.95rem] leading-snug text-ink">{option.label}</span>
                {option.note ? (
                  <span className="label-mono-sm mt-1.5 block text-muted">{option.note}</span>
                ) : null}
              </span>
            </label>
          );
        })}
      </div>

      {question.allowOther && otherSelected ? (
        <div className="mt-5 border-l-2 border-primary/60 pl-4">
          <label htmlFor={otherFieldId} className="label-mono-sm block text-primary">
            Optional detail
          </label>
          <input
            id={otherFieldId}
            type="text"
            value={otherValue ?? ""}
            maxLength={200}
            autoComplete="off"
            aria-describedby={otherError ? `${otherId}-error` : undefined}
            aria-invalid={otherError ? true : undefined}
            onChange={(event) =>
              question.otherKey ? onChange(question.otherKey, event.target.value) : undefined
            }
            placeholder={question.otherPlaceholder ?? "Add a short description"}
            className="mt-2 w-full max-w-xl border border-line bg-obsidian px-4 py-3 text-[0.92rem] text-ink placeholder:text-muted/60 focus:border-primary focus:outline-none"
          />
          {otherError ? (
            <p id={`${otherId}-error`} role="alert" className="mt-2 font-mono text-[0.72rem] text-danger">
              {otherError}
            </p>
          ) : null}
        </div>
      ) : null}

      <div aria-live="polite" className="min-h-[1.5rem]">
        {error ? (
          <p role="alert" className="mt-4 font-mono text-[0.75rem] text-danger">
            {error}
          </p>
        ) : null}
      </div>

      <div className="mt-4 flex flex-col-reverse gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
        {showBack ? (
          <Button variant="secondary" onClick={onBack}>
            <ArrowLeft aria-hidden className="h-3.5 w-3.5" />
            Back
          </Button>
        ) : (
          <span aria-hidden />
        )}
        <Button onClick={onContinue} size="lg" className="w-full sm:w-auto">
          Continue
          <ArrowRight aria-hidden className="h-3.5 w-3.5" />
        </Button>
      </div>

      <p className="mt-3 font-mono text-[0.68rem] text-muted/70">
        {isMulti
          ? "Select every option that applies, then continue."
          : "Choose one option, then continue."}{" "}
        Press Enter to continue.
      </p>
    </div>
  );
}
