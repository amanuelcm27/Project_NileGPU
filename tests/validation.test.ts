import { describe, expect, it } from "vitest";
import {
  abuseSignalsSchema,
  emailSchema,
  identitySchema,
  nameSchema,
  toFieldErrors,
  wishlistSubmissionSchema,
} from "@/lib/validation/wishlist";
import { buildSubmissionPayload } from "@/lib/survey/payload";
import { validNoPayload, validYesPayload } from "./fixtures";

describe("identity validation", () => {
  it("trims names, collapses inner whitespace and normalises emails", () => {
    const parsed = identitySchema.parse({
      fullName: "  Hanna   Bekele  ",
      email: "  Hanna.Bekele@Example.COM ",
    });

    expect(parsed.fullName).toBe("Hanna Bekele");
    expect(parsed.email).toBe("hanna.bekele@example.com");
  });

  it("rejects missing or malformed identity values", () => {
    expect(identitySchema.safeParse({ fullName: "A", email: "a@b.com" }).success).toBe(false);
    expect(identitySchema.safeParse({ fullName: "Hanna", email: "not-an-email" }).success).toBe(false);
    expect(identitySchema.safeParse({ fullName: " ", email: "h@example.com" }).success).toBe(false);
    expect(nameSchema.safeParse("x".repeat(300)).success).toBe(false);
    expect(emailSchema.safeParse(`${"a".repeat(260)}@example.com`).success).toBe(false);
  });

  it("accepts non-Latin names", () => {
    expect(identitySchema.safeParse({ fullName: "ሐና በቀለ", email: "h@example.com" }).success).toBe(
      true,
    );
  });
});

describe("wishlist submission schema", () => {
  it("accepts a complete 'used a GPU cloud service' application and maps it to a row", () => {
    const parsed = wishlistSubmissionSchema.safeParse(validYesPayload());
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    expect(parsed.data).toMatchObject({
      full_name: "Hanna Bekele",
      email: "hanna@example.com",
      user_type: "ai_startup",
      user_type_other: null,
      gpu_workloads: ["fine_tuning"],
      used_gpu_cloud: true,
      providers_used: ["runpod", "vast_ai"],
      previous_service_problems: ["price", "payment_method"],
      adoption_barriers: [],
      current_compute_solution: "rent_international",
      etb_payment_preference: "yes",
      monthly_compute_budget: "5000_10000",
      early_access_intent: "definitely",
    });

    // Abuse-protection fields are never persisted.
    expect(Object.keys(parsed.data)).not.toContain("honeypot");
    expect(Object.keys(parsed.data)).not.toContain("elapsedMs");
  });

  it("accepts a complete 'never used' application with lower-cased email", () => {
    const parsed = wishlistSubmissionSchema.safeParse(validNoPayload());
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    expect(parsed.data.email).toBe("dawit@example.com");
    expect(parsed.data.adoption_barriers).toEqual(["too_expensive", "no_payment_method"]);
    expect(parsed.data.providers_used).toEqual([]);
    expect(parsed.data.previous_service_problems).toEqual([]);
  });

  it("requires name and email", () => {
    const result = wishlistSubmissionSchema.safeParse({
      ...validYesPayload(),
      fullName: "",
      email: "",
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    const errors = toFieldErrors(result.error);
    expect(errors.fullName).toBeTruthy();
    expect(errors.email).toBeTruthy();
  });

  it("rejects unknown enum values", () => {
    const result = wishlistSubmissionSchema.safeParse(
      validYesPayload({ gpuWorkload: "quantum_simulations" as never }),
    );
    expect(result.success).toBe(false);
  });

  it("rejects missing required survey answers", () => {
    const payload: Record<string, unknown> = { ...validYesPayload() };
    delete payload.vramRequirement;
    const result = wishlistSubmissionSchema.safeParse(payload);
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(toFieldErrors(result.error).vramRequirement).toBeTruthy();
  });

  it("enforces conditional branches on the server", () => {
    const missingProviders = wishlistSubmissionSchema.safeParse(
      validYesPayload({ providersUsed: [], previousServiceProblems: [] }),
    );
    expect(missingProviders.success).toBe(false);

    const conflictingNoBranch = wishlistSubmissionSchema.safeParse(
      validYesPayload({ adoptionBarriers: ["too_expensive"] }),
    );
    expect(conflictingNoBranch.success).toBe(false);

    const missingBarriers = wishlistSubmissionSchema.safeParse(
      validNoPayload({ adoptionBarriers: [] }),
    );
    expect(missingBarriers.success).toBe(false);

    const conflictingYesBranch = wishlistSubmissionSchema.safeParse(
      validNoPayload({ providersUsed: ["runpod"] }),
    );
    expect(conflictingYesBranch.success).toBe(false);
  });

  it("caps free-text length and rejects wrong types", () => {
    const tooLong = wishlistSubmissionSchema.safeParse(
      validNoPayload({ adoptionBarriersOther: "x".repeat(500), adoptionBarriers: ["other"] }),
    );
    expect(tooLong.success).toBe(false);

    const wrongType = wishlistSubmissionSchema.safeParse({
      ...validNoPayload(),
      usedGpuCloud: "maybe",
    });
    expect(wrongType.success).toBe(false);

    const notAnObject = wishlistSubmissionSchema.safeParse("nope");
    expect(notAnObject.success).toBe(false);
  });

  it("ignores 'other' free text when the option was not selected", () => {
    const parsed = wishlistSubmissionSchema.safeParse(
      validNoPayload({ adoptionBarriers: ["too_expensive"], adoptionBarriersOther: "unused" }),
    );
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.adoption_barriers_other).toBeNull();
  });

  it("stores free text when the other option is selected", () => {
    const parsed = wishlistSubmissionSchema.safeParse(
      validYesPayload({
        userType: "other",
        userTypeOther: "Independent consultant",
        providersUsed: ["other"],
        providersOther: "A regional provider",
      }),
    );
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.user_type_other).toBe("Independent consultant");
    expect(parsed.data.providers_other).toBe("A regional provider");
  });
});

describe("abuse signals", () => {
  it("extracts only the protection fields", () => {
    expect(abuseSignalsSchema.parse({ honeypot: "", elapsedMs: 1000 })).toEqual({
      honeypot: "",
      elapsedMs: 1000,
    });
    expect(abuseSignalsSchema.safeParse({ honeypot: "x".repeat(400) }).success).toBe(false);
    expect(abuseSignalsSchema.safeParse({ elapsedMs: -5 }).success).toBe(false);
  });
});

describe("payload builder", () => {
  it("omits values from branches the applicant did not take", () => {
    const payload = buildSubmissionPayload(
      {
        identity: { fullName: "  Hanna Bekele ", email: "Hanna@Example.com" },
        answers: {
          userType: "ai_startup",
          gpuWorkload: "llm_inference",
          vramRequirement: "8_16gb",
          usageFrequency: "daily",
          usedGpuCloud: "no",
          providersUsed: ["runpod"],
          previousServiceProblems: ["price"],
          adoptionBarriers: ["too_expensive"],
          currentComputeSolution: "own_computer",
          etbPaymentPreference: "yes",
          monthlyComputeBudget: "lt_500",
          earlyAccessIntent: "maybe",
        },
      },
      { honeypot: "", elapsedMs: 90_000 },
    );

    expect(payload.providersUsed).toEqual([]);
    expect(payload.previousServiceProblems).toEqual([]);
    expect(payload.adoptionBarriers).toEqual(["too_expensive"]);
    expect(payload.usedGpuCloud).toBe(false);
    expect(payload.elapsedMs).toBe(90_000);

    // The resulting payload passes server validation without further edits.
    const parsed = wishlistSubmissionSchema.safeParse(payload);
    expect(parsed.success).toBe(true);
  });

  it("produces an empty-string payload when answers are missing, so the server rejects it", () => {
    const payload = buildSubmissionPayload({ identity: {}, answers: {} });
    expect(payload.fullName).toBe("");
    expect(wishlistSubmissionSchema.safeParse(payload).success).toBe(false);
  });
});
