import type { InterstitialDef, StepDef, StepId, SurveyAnswers } from "@/lib/survey/types";
import { getQuestion, isQuestionStep } from "@/lib/survey/questions";

/** Short, skippable transitions placed between question groups. */
export const interstitials = {
  interstitialHalfway: {
    id: "interstitialHalfway",
    kind: "interstitial",
    headline: "You're halfway through.",
    supporting: "Let's understand how you work with compute today.",
    autoAdvanceMs: 3200,
  },
  interstitialAlmost: {
    id: "interstitialAlmost",
    kind: "interstitial",
    headline: "Almost there.",
    supporting: "A few more answers and you will be the first to get access.",
    autoAdvanceMs: 3200,
  },
} satisfies Record<"interstitialHalfway" | "interstitialAlmost", InterstitialDef>;

/**
 * Declarative survey flow.
 *
 * Adding, removing or reordering a question is a change to this list plus the
 * registry in `questions.ts` — no component changes required.
 *
 * `branch` nodes express conditional questions. When the controlling answer is
 * not known yet, the resolver expands the *longest* possible path so the
 * progress indicator never counts backwards and never credits an unanswered
 * question as complete.
 */
export type FlowNode =
  | { type: "step"; id: StepId }
  | {
      type: "branch";
      when: keyof SurveyAnswers;
      equals: string;
      then: StepId[];
      otherwise: StepId[];
    };

export const stepSequence: FlowNode[] = [
  { type: "step", id: "identity" },
  { type: "step", id: "userType" },
  { type: "step", id: "gpuWorkload" },
  { type: "step", id: "vramRequirement" },
  { type: "step", id: "usageFrequency" },
  { type: "step", id: "interstitialHalfway" },
  { type: "step", id: "usedGpuCloud" },
  {
    type: "branch",
    when: "usedGpuCloud",
    equals: "yes",
    then: ["providersUsed", "previousServiceProblems"],
    otherwise: ["adoptionBarriers"],
  },
  { type: "step", id: "currentComputeSolution" },
  { type: "step", id: "interstitialAlmost" },
  { type: "step", id: "etbPaymentPreference" },
  { type: "step", id: "monthlyComputeBudget" },
  { type: "step", id: "earlyAccessIntent" },
  { type: "step", id: "review" },
];

/**
 * Expand the flow for the answers collected so far.
 *
 * Returns the ordered list of *applicable* steps. Steps that were answered on a
 * branch the user has since abandoned are dropped from the flow (their values
 * stay in component state so Back navigation can restore them).
 */
export function resolveSteps(answers: SurveyAnswers): StepId[] {
  const resolved: StepId[] = [];

  for (const node of stepSequence) {
    if (node.type === "step") {
      resolved.push(node.id);
      continue;
    }

    const answer = answers[node.when];
    if (answer === node.equals) {
      resolved.push(...node.then);
    } else if (typeof answer === "string" && answer.length > 0) {
      // Answer known and different from `equals`.
      resolved.push(...node.otherwise);
    } else {
      // Answer unknown: expand the longest path (union), preserving order.
      resolved.push(...node.then);
      for (const step of node.otherwise) {
        if (!resolved.includes(step)) resolved.push(step);
      }
    }
  }

  return resolved;
}

/** Full definition for a step, including the identity and review screens. */
export function getStepDef(id: StepId): StepDef {
  if (id === "identity") {
    return { id: "identity", kind: "identity" };
  }
  if (id === "review") {
    return { id: "review", kind: "review" };
  }
  if (isQuestionStep(id)) {
    return getQuestion(id);
  }
  return interstitials[id as keyof typeof interstitials];
}

/** Step that follows `id` in the resolved flow, or null at the end. */
export function nextStepId(steps: StepId[], id: StepId): StepId | null {
  const index = steps.indexOf(id);
  if (index === -1) return steps[0] ?? null;
  return steps[index + 1] ?? null;
}

/** Step that precedes `id` in the resolved flow, or null at the start. */
export function previousStepId(steps: StepId[], id: StepId): StepId | null {
  const index = steps.indexOf(id);
  if (index <= 0) return null;
  return steps[index - 1] ?? null;
}

/**
 * Maps a validation error field (wire payload key) back to the step that
 * collects it, so the survey can jump straight to an answer the server rejected.
 */
export const stepForField: Record<string, StepId> = {
  fullName: "identity",
  email: "identity",
  userType: "userType",
  userTypeOther: "userType",
  gpuWorkload: "gpuWorkload",
  gpuWorkloadOther: "gpuWorkload",
  vramRequirement: "vramRequirement",
  usageFrequency: "usageFrequency",
  usedGpuCloud: "usedGpuCloud",
  providersUsed: "providersUsed",
  providersOther: "providersUsed",
  previousServiceProblems: "previousServiceProblems",
  previousServiceProblemsOther: "previousServiceProblems",
  adoptionBarriers: "adoptionBarriers",
  adoptionBarriersOther: "adoptionBarriers",
  currentComputeSolution: "currentComputeSolution",
  currentComputeSolutionOther: "currentComputeSolution",
  etbPaymentPreference: "etbPaymentPreference",
  monthlyComputeBudget: "monthlyComputeBudget",
  earlyAccessIntent: "earlyAccessIntent",
};
