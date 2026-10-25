import { pruneInapplicableAnswers, type SurveyState } from "@/lib/survey/engine";
import type { AnswerKey } from "@/lib/survey/types";
import type { WishlistSubmissionInput } from "@/lib/validation/wishlist";

/**
 * Convert collected survey state into the wire payload for `POST /api/wishlist`.
 *
 * The payload is intentionally built from *pruned* answers, so values belonging
 * to a branch the applicant did not take are never transmitted. The server
 * re-validates everything and rejects anything that does not match this
 * contract, so a missing value surfaces as a validation error rather than a
 * half-saved record.
 */
export function buildSubmissionPayload(
  state: SurveyState,
  extras: { honeypot?: string; elapsedMs?: number } = {},
): WishlistSubmissionInput {
  const answers = pruneInapplicableAnswers(state.answers);

  const single = (key: AnswerKey): string => {
    const value = answers[key];
    return typeof value === "string" ? value : "";
  };
  const list = (key: AnswerKey): string[] => {
    const value = answers[key];
    return Array.isArray(value) ? value : [];
  };
  const other = (key: AnswerKey): string | undefined => {
    const value = single(key);
    return value.length > 0 ? value : undefined;
  };

  return {
    fullName: state.identity.fullName ?? "",
    email: state.identity.email ?? "",

    userType: single("userType"),
    userTypeOther: other("userTypeOther"),

    gpuWorkloads: list("gpuWorkloads"),
    gpuWorkloadOther: other("gpuWorkloadOther"),

    vramRequirement: single("vramRequirement"),
    vramRequirementOther: other("vramRequirementOther"),
    usageFrequency: single("usageFrequency"),
    usageFrequencyOther: other("usageFrequencyOther"),

    usedGpuCloud: answers.usedGpuCloud === "yes",

    providersUsed: list("providersUsed"),
    providersOther: other("providersOther"),

    previousServiceProblems: list("previousServiceProblems"),
    previousServiceProblemsOther: other("previousServiceProblemsOther"),

    adoptionBarriers: list("adoptionBarriers"),
    adoptionBarriersOther: other("adoptionBarriersOther"),

    currentComputeSolution: single("currentComputeSolution"),
    currentComputeSolutionOther: other("currentComputeSolutionOther"),

    etbPaymentPreference: single("etbPaymentPreference"),

    honeypot: extras.honeypot,
    elapsedMs: extras.elapsedMs,
  };
}
