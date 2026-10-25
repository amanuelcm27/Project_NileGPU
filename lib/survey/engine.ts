import {
  getQuestion,
  isFreeTextSelected,
  isQuestionStep,
  questions,
} from "@/lib/survey/questions";
import { resolveSteps } from "@/lib/survey/flow";
import type {
  AnswerKey,
  ApplicantIdentity,
  QuestionDef,
  StepId,
  SurveyAnswers,
} from "@/lib/survey/types";

export interface SurveyState {
  identity: Partial<ApplicantIdentity>;
  answers: SurveyAnswers;
}

export interface SurveyProgress {
  /** The applicable steps for the answers collected so far. */
  steps: StepId[];
  /** Zero-based position of the current step. */
  index: number;
  /** One-based position shown to the user. */
  stepNumber: number;
  total: number;
  /** 0–100, derived from the applicable flow only. */
  percent: number;
  /** Applicable steps strictly before the current one. */
  completedSteps: number;
  /** Applicable question steps that already have an answer. */
  answeredQuestions: number;
  totalQuestions: number;
}

function asString(value: string | string[] | undefined): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function asArray(value: string | string[] | undefined): string[] {
  return Array.isArray(value) ? value : [];
}

/** Whether a step holds a complete answer. Review is always "answered". */
export function isStepAnswered(stepId: StepId, state: SurveyState): boolean {
  if (stepId === "identity") {
    return Boolean(state.identity.fullName?.trim() && state.identity.email?.trim());
  }
  if (!isQuestionStep(stepId)) {
    return true;
  }
  const question = getQuestion(stepId);
  if (question.selection === "multi") {
    return asArray(state.answers[question.field]).length > 0;
  }
  return asString(state.answers[question.field]) !== null;
}

export function isQuestionAnswered(question: QuestionDef, answers: SurveyAnswers): boolean {
  if (question.selection === "multi") {
    return asArray(answers[question.field]).length > 0;
  }
  return asString(answers[question.field]) !== null;
}

/**
 * Progress over the *applicable* flow.
 *
 * Because `resolveSteps` drops steps on branches the user did not take, skipped
 * questions are never counted as completed. While a branch is still undecided
 * the flow assumes the longest path, so the percentage can only ever move
 * forward as the user answers.
 */
export function buildProgress(state: SurveyState, currentStepId: StepId): SurveyProgress {
  const steps = resolveSteps(state.answers);
  const index = Math.max(steps.indexOf(currentStepId), 0);
  const total = steps.length;
  const percent = total <= 1 ? 100 : Math.round((index / (total - 1)) * 100);

  const questionSteps = steps.filter(isQuestionStep);

  return {
    steps,
    index,
    stepNumber: index + 1,
    total,
    percent,
    completedSteps: index,
    answeredQuestions: questionSteps.filter((id) => isStepAnswered(id, state)).length,
    totalQuestions: questionSteps.length,
  };
}

/**
 * Remove answers that do not apply to the active branch and drop empty values.
 *
 * Used when building the submission payload. Component state keeps the raw
 * answers so that Back navigation can restore a previous branch, while
 * inapplicable values are never sent to the server.
 */
export function pruneInapplicableAnswers(answers: SurveyAnswers): SurveyAnswers {
  const pruned: SurveyAnswers = {};

  for (const [key, value] of Object.entries(answers) as [AnswerKey, string | string[]][]) {
    if (Array.isArray(value)) {
      const cleaned = value.filter((item) => item.trim().length > 0);
      if (cleaned.length > 0) pruned[key] = cleaned;
      continue;
    }
    if (typeof value === "string" && value.trim().length > 0) {
      pruned[key] = value;
    }
  }

  // Conditional branch 1: prior GPU cloud usage.
  if (pruned.usedGpuCloud !== "yes") {
    delete pruned.providersUsed;
    delete pruned.providersOther;
    delete pruned.previousServiceProblems;
    delete pruned.previousServiceProblemsOther;
  }
  if (pruned.usedGpuCloud !== "no") {
    delete pruned.adoptionBarriers;
    delete pruned.adoptionBarriersOther;
  }

  // Free-text "other" / "custom" answers only apply when their option is selected.
  for (const question of Object.values(questions)) {
    if (!question.allowOther || !question.otherKey) continue;
    const selected = pruned[question.field];
    if (!isFreeTextSelected(question, selected)) {
      delete pruned[question.otherKey];
    }
  }

  return pruned;
}

export interface ReviewRow {
  stepId: StepId;
  prompt: string;
  answers: string[];
}

/** Human-readable summary of the applicable answers, used by the review screen. */
export function buildReviewRows(state: SurveyState): ReviewRow[] {
  const rows: ReviewRow[] = [];

  for (const stepId of resolveSteps(state.answers)) {
    if (!isQuestionStep(stepId)) continue;
    const question = getQuestion(stepId);
    const value = state.answers[question.field];
    const labels: string[] = [];

    if (question.selection === "multi") {
      for (const id of asArray(value)) {
        labels.push(optionDisplayLabel(question, id));
      }
      if (isFreeTextSelected(question, value) && question.otherKey) {
        const other = asString(state.answers[question.otherKey]);
        if (other) labels.push(other);
      }
    } else {
      const single = asString(value);
      if (single) labels.push(optionDisplayLabel(question, single));
      if (isFreeTextSelected(question, single ?? undefined) && question.otherKey) {
        const other = asString(state.answers[question.otherKey]);
        if (other) labels.push(other);
      }
    }

    rows.push({ stepId, prompt: question.prompt, answers: labels });
  }

  return rows;
}

function optionDisplayLabel(question: QuestionDef, value: string): string {
  const option = question.options.find((item) => item.id === value);
  return option?.label ?? value;
}

/** Number of applicable question steps the user has answered (analytics only). */
export function countAnswered(state: SurveyState): number {
  return buildProgress(state, "review").answeredQuestions;
}
