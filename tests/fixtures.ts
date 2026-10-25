import type { WishlistSubmissionInput } from "@/lib/validation/wishlist";

/** A complete, valid application for the "has used a GPU cloud service" branch. */
export function validYesPayload(
  overrides: Partial<WishlistSubmissionInput> = {},
): WishlistSubmissionInput {
  return {
    fullName: "Hanna Bekele",
    email: "hanna@example.com",
    userType: "ai_startup",
    gpuWorkloads: ["fine_tuning"],
    vramRequirement: "24_48gb",
    usageFrequency: "several_times_week",
    usedGpuCloud: true,
    providersUsed: ["runpod", "vast_ai"],
    previousServiceProblems: ["price", "payment_method"],
    currentComputeSolution: "rent_international",
    etbPaymentPreference: "yes",
    elapsedMs: 120_000,
    ...overrides,
  };
}

/** A complete, valid application for the "never used a GPU cloud service" branch. */
export function validNoPayload(
  overrides: Partial<WishlistSubmissionInput> = {},
): WishlistSubmissionInput {
  return {
    fullName: "Dawit Alemu",
    email: "DAWIT@Example.com",
    userType: "university_student",
    gpuWorkloads: ["llm_inference"],
    vramRequirement: "16_24gb",
    usageFrequency: "daily",
    usedGpuCloud: false,
    adoptionBarriers: ["too_expensive", "no_payment_method"],
    currentComputeSolution: "own_computer",
    etbPaymentPreference: "yes",
    elapsedMs: 200_000,
    ...overrides,
  };
}
