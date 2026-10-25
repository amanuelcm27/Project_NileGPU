"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { IdentityStep } from "@/components/survey/IdentityStep";
import { ProgressRail } from "@/components/survey/ProgressRail";
import { QuestionStep } from "@/components/survey/QuestionStep";
import { ReviewStep } from "@/components/survey/ReviewStep";
import { SuccessDialog } from "@/components/survey/SuccessDialog";
import { submitWishlist } from "@/lib/api/wishlist-client";
import { track } from "@/lib/analytics";
import {
  buildProgress,
  buildReviewRows,
  isQuestionAnswered,
  type SurveyState,
} from "@/lib/survey/engine";
import { getStepDef, nextStepId, previousStepId, stepForField } from "@/lib/survey/flow";
import { getQuestion, isFreeTextSelected, type QuestionKey } from "@/lib/survey/questions";
import { buildSubmissionPayload } from "@/lib/survey/payload";
import type {
  AnswerKey,
  ApplicantIdentity,
  Direction,
  StepId,
  SubmissionError,
  SubmissionStatus,
} from "@/lib/survey/types";
import { identitySchema, limits, toFieldErrors, wishlistSubmissionSchema } from "@/lib/validation/wishlist";

/**
 * The wishlist survey: one question per screen, with conditional branching,
 * a review screen and a server-confirmed submission.
 *
 * Nothing is persisted before the applicant submits: partially completed
 * surveys exist only in component state, and the confirmation screen appears
 * only when the API reports that the row was written.
 */
export function SurveyApp() {
  const [state, setState] = useState<SurveyState>({ identity: {}, answers: {} });
  const [currentStepId, setCurrentStepId] = useState<StepId>("identity");
  const [direction, setDirection] = useState<Direction>("forward");
  const [stepError, setStepError] = useState<string | null>(null);
  const [identityErrors, setIdentityErrors] = useState<Record<string, string>>({});
  const [serverFieldErrors, setServerFieldErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<SubmissionStatus>("idle");
  const [submitError, setSubmitError] = useState<SubmissionError | null>(null);
  const [honeypot, setHoneypot] = useState("");

  const reduceMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const submittedRef = useRef(false);
  const navigatedRef = useRef(false);
  const startedRef = useRef(false);
  const abandonedRef = useRef(false);
  const startedAtRef = useRef<number | null>(null);

  const closeSuccess = useCallback(() => {
    window.location.reload();
  }, []);

  const progress = useMemo(() => buildProgress(state, currentStepId), [state, currentStepId]);
  const steps = progress.steps;

  // Keep the applicant oriented: move focus to the new step heading.
  useEffect(() => {
    if (!navigatedRef.current) return;
    const heading = containerRef.current?.querySelector<HTMLElement>("h3");
    if (!heading) return;
    heading.setAttribute("tabindex", "-1");
    heading.focus({ preventScroll: false });
  }, [currentStepId]);

  // Anonymous abandonment signal: shape of progress only, no answers, no PII.
  useEffect(() => {
    const report = () => {
      if (abandonedRef.current || submittedRef.current || !startedRef.current) return;
      abandonedRef.current = true;
      track("survey_abandoned", {
        lastStep: currentStepId,
        answeredQuestions: progress.answeredQuestions,
        percent: progress.percent,
      });
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") report();
    };
    window.addEventListener("pagehide", report);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", report);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [currentStepId, progress.answeredQuestions, progress.percent]);

  const setAnswer = (key: AnswerKey, value: string | string[]) => {
    setState((previous) => ({ ...previous, answers: { ...previous.answers, [key]: value } }));
    setStepError(null);
    setSubmitError(null);
    setServerFieldErrors((previous) => {
      if (!previous[key]) return previous;
      const next = { ...previous };
      delete next[key];
      return next;
    });
  };

  const setIdentityField = (key: keyof ApplicantIdentity, value: string) => {
    setState((previous) => ({
      ...previous,
      identity: { ...previous.identity, [key]: value },
    }));
    setStepError(null);
    setSubmitError(null);
    setIdentityErrors((previous) => {
      if (!previous[key]) return previous;
      const next = { ...previous };
      delete next[key];
      return next;
    });
    setServerFieldErrors((previous) => {
      if (!previous[key]) return previous;
      const next = { ...previous };
      delete next[key];
      return next;
    });
  };

  const goNext = () => {
    const next = nextStepId(steps, currentStepId);
    if (!next) return;
    navigatedRef.current = true;
    setDirection("forward");
    setStepError(null);
    setCurrentStepId(next);
  };

  const goBack = () => {
    const previous = previousStepId(steps, currentStepId);
    if (!previous) return;
    navigatedRef.current = true;
    setDirection("backward");
    setStepError(null);
    setCurrentStepId(previous);
  };

  const goTo = (target: StepId) => {
    navigatedRef.current = true;
    setDirection("backward");
    setStepError(null);
    setCurrentStepId(target);
  };

  const submitIdentity = () => {
    const parsed = identitySchema.safeParse({
      fullName: state.identity.fullName ?? "",
      email: state.identity.email ?? "",
    });

    if (!parsed.success) {
      setIdentityErrors(toFieldErrors(parsed.error));
      return;
    }

    setIdentityErrors({});
    setState((previous) => ({ ...previous, identity: parsed.data }));
    startedRef.current = true;
    startedAtRef.current = Date.now();
    track("survey_started", { stepId: "identity" });
    goNext();
  };

  const continueFromQuestion = (id: QuestionKey) => {
    const question = getQuestion(id);
    if (!isQuestionAnswered(question, state.answers)) {
      setStepError(
        question.selection === "multi"
          ? "Select at least one option to continue."
          : "Choose an option to continue.",
      );
      return;
    }

    const otherKey = question.otherKey;
    if (question.allowOther && otherKey && isFreeTextSelected(question, state.answers[question.field])) {
      const raw = state.answers[otherKey];
      const text = typeof raw === "string" ? raw.trim() : "";
      if (text.length === 0) {
        const message = "Enter a short description for the option you selected.";
        setStepError(message);
        setServerFieldErrors((previous) => ({ ...previous, [otherKey]: message }));
        return;
      }
      if (text.length > limits.maxShortTextLength) {
        const message = `Please keep that under ${limits.maxShortTextLength} characters.`;
        setStepError(message);
        setServerFieldErrors((previous) => ({ ...previous, [otherKey]: message }));
        return;
      }
    }

    goNext();
  };

  const handleSubmit = async () => {
    if (submittedRef.current || status === "submitting") return;

    const payload = buildSubmissionPayload(state, {
      honeypot,
      elapsedMs: startedAtRef.current === null ? undefined : Date.now() - startedAtRef.current,
    });

    // Client-side pre-check with the exact same schema the server uses.
    const parsed = wishlistSubmissionSchema.safeParse(payload);
    if (!parsed.success) {
      const fieldErrors = toFieldErrors(parsed.error);
      const firstField = Object.keys(fieldErrors)[0];
      const target = firstField ? stepForField[firstField] : undefined;
      setServerFieldErrors(fieldErrors);
      setStatus("error");
      setSubmitError({
        code: "validation_failed",
        message: "Some answers need another look before this application can be submitted.",
        fieldErrors,
      });
      if (target && steps.includes(target)) {
        if (target === "identity") setIdentityErrors(fieldErrors);
        goTo(target);
        setStepError((firstField && fieldErrors[firstField]) || "Please review this answer.");
      }
      return;
    }

    setStatus("submitting");
    setSubmitError(null);
    track("survey_completed", {
      answeredQuestions: progress.answeredQuestions,
      totalQuestions: progress.totalQuestions,
    });

    const result = await submitWishlist(payload);

    if (result.ok) {
      submittedRef.current = true;
      setStatus("success");
      track("wishlist_submitted", { stepId: "review" });
      return;
    }

    setStatus("error");
    setSubmitError(result.error);
    if (result.error.fieldErrors) setServerFieldErrors(result.error.fieldErrors);

    const failedField = result.error.fieldErrors ? Object.keys(result.error.fieldErrors)[0] : undefined;
    const target = failedField ? stepForField[failedField] : undefined;
    if (target && steps.includes(target)) {
      if (target === "identity" && result.error.fieldErrors) {
        setIdentityErrors(result.error.fieldErrors);
      }
      goTo(target);
      setStepError((failedField && result.error.fieldErrors?.[failedField]) || result.error.message);
    }
  };

  if (status === "success") {
    return (
      <div className="min-h-[26rem]">
        <SuccessDialog onClose={closeSuccess} />
      </div>
    );
  }

  const stepDef = getStepDef(currentStepId);
  const slide = direction === "forward" ? 20 : -20;
  const showBack = Boolean(previousStepId(steps, currentStepId));

  return (
    <div ref={containerRef} className="panel clip-corner overflow-hidden bg-surface">
      <div className="flex items-center justify-between border-b border-line bg-surface-alt/60 px-4 py-2.5 sm:px-6">
        <span className="label-mono-sm text-ink">Apply now</span>
      </div>

      <ProgressRail progress={progress} />

      <div className="min-h-[26rem] p-5 sm:min-h-[30rem] sm:p-8">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={currentStepId}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: slide }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -slide }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            {stepDef.kind === "identity" ? (
              <IdentityStep
                values={state.identity}
                errors={identityErrors}
                onChange={setIdentityField}
                onSubmit={submitIdentity}
              />
            ) : null}

            {stepDef.kind === "question" ? (
              <QuestionStep
                question={stepDef}
                value={state.answers[stepDef.field]}
                otherValue={stepDef.otherKey ? (state.answers[stepDef.otherKey] as string | undefined) : undefined}
                error={stepError}
                fieldErrors={serverFieldErrors}
                showBack={showBack}
                onChange={setAnswer}
                onContinue={() => continueFromQuestion(stepDef.id as QuestionKey)}
                onBack={goBack}
              />
            ) : null}

            {stepDef.kind === "review" ? (
              <ReviewStep
                identity={state.identity}
                rows={buildReviewRows(state)}
                status={status}
                error={submitError}
                honeypot={honeypot}
                showBack={showBack}
                onHoneypotChange={setHoneypot}
                onEdit={goTo}
                onBack={goBack}
                onSubmit={() => {
                  void handleSubmit();
                }}
              />
            ) : null}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
