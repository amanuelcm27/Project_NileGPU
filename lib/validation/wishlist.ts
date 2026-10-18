import { z } from "zod";
import { optionIds, type QuestionKey } from "@/lib/survey/questions";

/**
 * Request-size and text limits for the wishlist endpoint.
 * Enforced on the server for every submission.
 */
export const limits = {
  maxPayloadBytes: 16 * 1024,
  maxNameLength: 120,
  maxEmailLength: 254,
  maxShortTextLength: 200,
  /** A full 15-step survey cannot be completed faster than this. */
  minElapsedMs: 1500,
  maxElapsedMs: 6 * 60 * 60 * 1000,
} as const;

function optionEnum(key: QuestionKey, label: string) {
  const ids = optionIds(key);
  if (ids.length === 0) {
    throw new Error(`Question "${key}" has no options; cannot build a validator.`);
  }
  return z.enum(ids as [string, ...string[]], {
    error: `Select a valid option for: ${label}`,
  });
}

/** Whitespace inside names is collapsed; surrounding whitespace is removed. */
export const nameSchema = z
  .string({ error: "Enter your full name" })
  .trim()
  .min(2, { error: "Enter your full name (at least 2 characters)" })
  .max(limits.maxNameLength, {
    error: `Names must be ${limits.maxNameLength} characters or fewer`,
  })
  .transform((value) => value.replace(/\s+/g, " "));

/** Emails are trimmed and lower-cased so the same person is stored consistently. */
export const emailSchema = z
  .string({ error: "Enter your email address" })
  .trim()
  .toLowerCase()
  .max(limits.maxEmailLength, {
    error: `Email addresses must be ${limits.maxEmailLength} characters or fewer`,
  })
  .pipe(z.email({ error: "Enter a valid email address" }));

export const identitySchema = z.object({
  fullName: nameSchema,
  email: emailSchema,
});

export type IdentityInput = z.input<typeof identitySchema>;
export type IdentityValue = z.output<typeof identitySchema>;

/** Optional free-text fields: trimmed, length-limited, empty values become undefined. */
const optionalText = z
  .string()
  .trim()
  .max(limits.maxShortTextLength, {
    error: `Please keep this under ${limits.maxShortTextLength} characters`,
  })
  .optional()
  .transform((value) => (value && value.length > 0 ? value : undefined));

const optionList = (key: QuestionKey) =>
  z.array(optionEnum(key, key)).max(20).default([]);

/**
 * The complete wishlist submission contract.
 *
 * This schema is the single source of truth for both client-side payload
 * construction and server-side validation. It validates *and* maps the payload
 * into the `wishlist_applications` row shape, so no unvalidated value can reach
 * the database.
 */
export const wishlistSubmissionSchema = z
  .object({
    fullName: nameSchema,
    email: emailSchema,

    userType: optionEnum("userType", "Which best describes you?"),
    userTypeOther: optionalText,

    gpuWorkload: optionEnum("gpuWorkload", "What do you need GPU compute for?"),
    gpuWorkloadOther: optionalText,

    vramRequirement: optionEnum("vramRequirement", "GPU memory capacity"),
    usageFrequency: optionEnum("usageFrequency", "Usage frequency"),

    usedGpuCloud: z.boolean({ error: "Select whether you have used a GPU cloud service" }),

    providersUsed: optionList("providersUsed"),
    providersOther: optionalText,

    previousServiceProblems: optionList("previousServiceProblems"),
    previousServiceProblemsOther: optionalText,

    adoptionBarriers: optionList("adoptionBarriers"),
    adoptionBarriersOther: optionalText,

    currentComputeSolution: optionEnum(
      "currentComputeSolution",
      "What you do when you need more compute",
    ),
    currentComputeSolutionOther: optionalText,

    etbPaymentPreference: optionEnum("etbPaymentPreference", "Paying in Ethiopian birr"),
    monthlyComputeBudget: optionEnum("monthlyComputeBudget", "Monthly GPU compute budget"),
    earlyAccessIntent: optionEnum("earlyAccessIntent", "Early-access intent"),

    /** Abuse protection — never persisted. */
    honeypot: z.string().max(limits.maxShortTextLength).optional(),
    elapsedMs: z
      .number()
      .int()
      .nonnegative()
      .max(limits.maxElapsedMs)
      .optional(),
  })
  .superRefine((value, ctx) => {
    // Conditional logic is re-checked on the server. The client prunes
    // inapplicable answers, so a conflict here means the payload is malformed.
    if (value.usedGpuCloud) {
      if (value.providersUsed.length === 0) {
        ctx.addIssue({
          code: "custom",
          path: ["providersUsed"],
          message: "Select at least one GPU cloud provider you have used",
        });
      }
      if (value.previousServiceProblems.length === 0) {
        ctx.addIssue({
          code: "custom",
          path: ["previousServiceProblems"],
          message: "Select at least one problem you experienced",
        });
      }
      if (value.adoptionBarriers.length > 0) {
        ctx.addIssue({
          code: "custom",
          path: ["adoptionBarriers"],
          message: "Not applicable when you have used a GPU cloud service",
        });
      }
    } else {
      if (value.adoptionBarriers.length === 0) {
        ctx.addIssue({
          code: "custom",
          path: ["adoptionBarriers"],
          message: "Select at least one reason you have not used a GPU cloud service",
        });
      }
      if (value.providersUsed.length > 0 || value.previousServiceProblems.length > 0) {
        ctx.addIssue({
          code: "custom",
          path: ["providersUsed"],
          message: "Not applicable when you have not used a GPU cloud service",
        });
      }
    }
  })
  .transform((value) => {
    const withOther = (
      text: string | undefined,
      selected: boolean,
    ): string | null => (selected && text ? text : null);

    return {
      full_name: value.fullName,
      email: value.email,
      user_type: value.userType,
      user_type_other: withOther(value.userTypeOther, value.userType === "other"),
      gpu_workloads: [value.gpuWorkload],
      gpu_workload_other: withOther(
        value.gpuWorkloadOther,
        value.gpuWorkload === "other",
      ),
      vram_requirement: value.vramRequirement,
      usage_frequency: value.usageFrequency,
      used_gpu_cloud: value.usedGpuCloud,
      providers_used: value.usedGpuCloud ? value.providersUsed : [],
      providers_other: withOther(
        value.providersOther,
        value.usedGpuCloud && value.providersUsed.includes("other"),
      ),
      previous_service_problems: value.usedGpuCloud ? value.previousServiceProblems : [],
      previous_service_problems_other: withOther(
        value.previousServiceProblemsOther,
        value.usedGpuCloud && value.previousServiceProblems.includes("other"),
      ),
      adoption_barriers: value.usedGpuCloud ? [] : value.adoptionBarriers,
      adoption_barriers_other: withOther(
        value.adoptionBarriersOther,
        !value.usedGpuCloud && value.adoptionBarriers.includes("other"),
      ),
      current_compute_solution: value.currentComputeSolution,
      current_compute_solution_other: withOther(
        value.currentComputeSolutionOther,
        value.currentComputeSolution === "other",
      ),
      etb_payment_preference: value.etbPaymentPreference,
      monthly_compute_budget: value.monthlyComputeBudget,
      early_access_intent: value.earlyAccessIntent,
    };
  });

/** Exact shape inserted into `wishlist_applications`. */
export type WishlistApplicationRow = z.output<typeof wishlistSubmissionSchema>;
/** Shape accepted from clients before validation. */
export type WishlistSubmissionInput = z.input<typeof wishlistSubmissionSchema>;

/** Flatten Zod issues into a `{ field: message }` map for the client. */
export function toFieldErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? issue.path.join(".") : "form";
    if (!errors[key]) errors[key] = issue.message;
  }
  return errors;
}

/**
 * Abuse-protection signals.
 *
 * These are part of the wire contract (see the schema above) but are stripped
 * before persistence, so they are read separately from the raw request body.
 */
export const abuseSignalsSchema = z.object({
  honeypot: z.string().max(limits.maxShortTextLength).optional(),
  elapsedMs: z.number().int().nonnegative().max(limits.maxElapsedMs).optional(),
});

export type AbuseSignals = z.output<typeof abuseSignalsSchema>;

export function readAbuseSignals(body: unknown): AbuseSignals {
  const parsed = abuseSignalsSchema.safeParse(body);
  return parsed.success ? parsed.data : {};
}

