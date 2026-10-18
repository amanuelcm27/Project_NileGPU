/**
 * Shared survey types.
 *
 * Answer keys are stable machine-readable identifiers. Display labels live in
 * `questions.ts` and are never persisted, so copy can change without breaking
 * stored analytics.
 */

/** Stable identifiers for every answer this survey can hold. */
export type AnswerKey =
  | "userType"
  | "userTypeOther"
  | "gpuWorkload"
  | "gpuWorkloadOther"
  | "vramRequirement"
  | "usageFrequency"
  | "usedGpuCloud"
  | "providersUsed"
  | "providersOther"
  | "previousServiceProblems"
  | "previousServiceProblemsOther"
  | "adoptionBarriers"
  | "adoptionBarriersOther"
  | "currentComputeSolution"
  | "currentComputeSolutionOther"
  | "etbPaymentPreference"
  | "monthlyComputeBudget"
  | "earlyAccessIntent";

/** Keys whose value is a list of option ids. */
export type MultiAnswerKey =
  | "providersUsed"
  | "previousServiceProblems"
  | "adoptionBarriers";

export type StepId =
  | "identity"
  | "userType"
  | "gpuWorkload"
  | "vramRequirement"
  | "usageFrequency"
  | "interstitialHalfway"
  | "usedGpuCloud"
  | "providersUsed"
  | "previousServiceProblems"
  | "adoptionBarriers"
  | "currentComputeSolution"
  | "interstitialAlmost"
  | "etbPaymentPreference"
  | "monthlyComputeBudget"
  | "earlyAccessIntent"
  | "review";

export interface SurveyOption {
  /** Stable value persisted to the database. */
  id: string;
  /** Human-readable label shown in the interface. */
  label: string;
  /** Optional short technical annotation rendered in monospace. */
  note?: string;
}

export interface QuestionDef {
  id: StepId;
  kind: "question";
  /** Column family in `wishlist_applications` — used by tests and docs. */
  field: AnswerKey;
  prompt: string;
  supporting?: string;
  selection: "single" | "multi";
  options: SurveyOption[];
  /** Multi-select questions keep their own "other" option; single ones too. */
  allowOther: boolean;
  otherKey?: AnswerKey;
  otherPlaceholder?: string;
  /** Multi-select questions store arrays under `field`. */
  multiField?: MultiAnswerKey;
}

export interface InterstitialDef {
  id: StepId;
  kind: "interstitial";
  headline: string;
  supporting?: string;
  /** Short, skippable transition. Milliseconds until automatic continue. */
  autoAdvanceMs: number;
}

export interface ReviewDef {
  id: StepId;
  kind: "review";
}

/** Name + email gate shown before the survey questions begin. */
export interface IdentityDef {
  id: "identity";
  kind: "identity";
}

export type StepDef = QuestionDef | InterstitialDef | ReviewDef | IdentityDef;

/** Answers collected across the survey. All values are strings or string[]. */
export type SurveyAnswers = Partial<Record<AnswerKey, string | string[]>>;

export interface ApplicantIdentity {
  fullName: string;
  email: string;
}

export type Direction = "forward" | "backward";

export type SubmissionStatus = "idle" | "submitting" | "error" | "success";

export interface SubmissionError {
  /** Safe, human-readable message. Never contains database internals. */
  message: string;
  code?: string;
  /** Correlation id echoed by the API so support can trace a failure. */
  requestId?: string;
  /** Field-level messages returned by server validation. */
  fieldErrors?: Record<string, string>;
}
