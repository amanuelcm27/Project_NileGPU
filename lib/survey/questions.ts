import type { QuestionDef, StepId, SurveyOption } from "@/lib/survey/types";

/** Shared, stable id for the free-text escape hatch on any question. */
export const OTHER_OPTION_ID = "other";

/**
 * The survey question registry.
 *
 * Everything about a question (copy, order, options, validation needs) lives
 * here so the survey can be changed without touching UI components. Option ids
 * are persisted to the database and must remain stable; labels are display-only.
 */
export const questions = {
  userType: {
    id: "userType",
    kind: "question",
    field: "userType",
    prompt: "Which best describes you?",
    supporting: "This helps us understand who needs GPU compute in Ethiopia.",
    selection: "single",
    allowOther: true,
    otherKey: "userTypeOther",
    otherPlaceholder: "Tell us how you would describe yourself",
    options: [
      { id: "individual_developer", label: "Individual developer", note: "SOLO / FREELANCE" },
      { id: "ai_startup", label: "AI startup", note: "EARLY STAGE TEAM" },
      { id: "established_company", label: "Established company", note: "COMMERCIAL" },
      { id: "researcher", label: "Researcher", note: "ACADEMIC / INDUSTRY" },
      { id: "university_student", label: "University student", note: "LEARNING" },
      {
        id: "university_institution",
        label: "University / research institution",
        note: "LAB / DEPARTMENT",
      },
      { id: OTHER_OPTION_ID, label: "Other" },
    ],
  },
  gpuWorkload: {
    id: "gpuWorkload",
    kind: "question",
    field: "gpuWorkload",
    prompt: "What do you need GPU compute for?",
    supporting: "Pick the workload that matters most right now.",
    selection: "single",
    allowOther: true,
    otherKey: "gpuWorkloadOther",
    otherPlaceholder: "Describe your workload",
    options: [
      { id: "llm_inference", label: "LLM inference", note: "SERVING / API" },
      {
        id: "fine_tuning",
        label: "Fine-tuning open-source models",
        note: "ADAPTER TRAINING",
      },
      {
        id: "training_from_scratch",
        label: "Training models from scratch",
        note: "FULL TRAINING RUNS",
      },
      { id: "image_generation", label: "Image generation", note: "DIFFUSION" },
      { id: "video_generation", label: "Video generation", note: "TEMPORAL MODELS" },
      {
        id: "computer_vision",
        label: "Computer vision",
        note: "DETECTION / SEGMENTATION",
      },
      { id: OTHER_OPTION_ID, label: "Other" },
    ],
  },
  vramRequirement: {
    id: "vramRequirement",
    kind: "question",
    field: "vramRequirement",
    prompt: "What GPU memory capacity do you currently need?",
    supporting: "Memory capacity is usually what decides whether a model fits.",
    selection: "single",
    allowOther: false,
    options: [
      { id: "lt_8gb", label: "Less than 8 GB VRAM" },
      { id: "8_16gb", label: "8–16 GB VRAM" },
      { id: "16_24gb", label: "16–24 GB VRAM" },
      { id: "24_48gb", label: "24–48 GB VRAM" },
      { id: "48_80gb", label: "48–80 GB VRAM" },
      { id: "gt_80gb", label: "More than 80 GB VRAM" },
      { id: "unknown", label: "I don't know yet" },
    ],
  },
  usageFrequency: {
    id: "usageFrequency",
    kind: "question",
    field: "usageFrequency",
    prompt: "How often would you need GPU compute?",
    supporting: "Usage frequency shapes how capacity should be allocated.",
    selection: "single",
    allowOther: false,
    options: [
      { id: "daily", label: "Daily" },
      { id: "several_times_week", label: "Several times per week" },
      { id: "several_times_month", label: "Several times per month" },
      { id: "continuous", label: "Continuously (non stop)" },
    ],
  },
  usedGpuCloud: {
    id: "usedGpuCloud",
    kind: "question",
    field: "usedGpuCloud",
    prompt: "Have you ever used a GPU cloud service?",
    supporting: "Either answer is useful — this is not a test.",
    selection: "single",
    allowOther: false,
    options: [
      { id: "yes", label: "Yes" },
      { id: "no", label: "No" },
    ],
  },
  providersUsed: {
    id: "providersUsed",
    kind: "question",
    field: "providersUsed",
    multiField: "providersUsed",
    prompt: "Which GPU cloud services have you used?",
    supporting: "Select every service you have used.",
    selection: "multi",
    allowOther: true,
    otherKey: "providersOther",
    otherPlaceholder: "Which other provider?",
    options: [
      { id: "vast_ai", label: "Vast.ai" },
      { id: "runpod", label: "RunPod" },
      { id: "aws", label: "AWS" },
      { id: "google_cloud", label: "Google Cloud" },
      { id: "azure", label: "Azure" },
      { id: "lambda", label: "Lambda" },
      { id: "coreweave", label: "CoreWeave" },
      { id: OTHER_OPTION_ID, label: "Other" },
    ],
  },
  previousServiceProblems: {
    id: "previousServiceProblems",
    kind: "question",
    field: "previousServiceProblems",
    multiField: "previousServiceProblems",
    prompt: "What was the biggest problem with your experience?",
    supporting: "Select as many as apply.",
    selection: "multi",
    allowOther: true,
    otherKey: "previousServiceProblemsOther",
    otherPlaceholder: "Describe the problem",
    options: [
      { id: "price", label: "Price" },
      { id: "payment_method", label: "Payment method" },
      { id: "gpu_availability", label: "GPU availability" },
      { id: "setup_complexity", label: "Setup complexity" },
      { id: "reliability", label: "Reliability" },
      { id: "performance", label: "Performance" },
      { id: "documentation", label: "Documentation" },
      { id: "support", label: "Support" },
      { id: OTHER_OPTION_ID, label: "Other" },
    ],
  },
  adoptionBarriers: {
    id: "adoptionBarriers",
    kind: "question",
    field: "adoptionBarriers",
    multiField: "adoptionBarriers",
    prompt: "What's stopped you from using a GPU cloud service?",
    supporting: "Select as many as apply.",
    selection: "multi",
    allowOther: true,
    otherKey: "adoptionBarriersOther",
    otherPlaceholder: "Describe what stopped you",
    options: [
      { id: "unaware", label: "I didn't know these services existed" },
      { id: "too_expensive", label: "Too expensive" },
      { id: "no_international_payment", label: "Couldn't pay internationally" },
      {
        id: "no_payment_method",
        label: "Didn't have a suitable credit card or payment method",
      },
      { id: "too_complicated", label: "Too complicated to set up" },
      { id: "no_need_yet", label: "Didn't need one yet" },
      { id: "security_concerns", label: "Security concerns" },
      { id: OTHER_OPTION_ID, label: "Other" },
    ],
  },
  currentComputeSolution: {
    id: "currentComputeSolution",
    kind: "question",
    field: "currentComputeSolution",
    prompt: "What do you do when you need more GPU compute?",
    supporting: "Your current workaround tells us what a better option has to replace.",
    selection: "single",
    allowOther: true,
    otherKey: "currentComputeSolutionOther",
    otherPlaceholder: "Describe your workaround",
    options: [
      { id: "own_computer", label: "Use my own computer / GPU" },
      { id: "borrow_hardware", label: "Borrow hardware" },
      { id: "use_api", label: "Use an API instead" },
      { id: "institution_hardware", label: "Use university / company hardware" },
      { id: "rent_international", label: "Rent from an international provider" },
      { id: "stop_project", label: "I stop the project" },
      { id: OTHER_OPTION_ID, label: "Other" },
    ],
  },
  etbPaymentPreference: {
    id: "etbPaymentPreference",
    kind: "question",
    field: "etbPaymentPreference",
    prompt: "Would paying in Ethiopian birr make GPU access easier for you?",
    selection: "single",
    allowOther: false,
    options: [
      { id: "yes", label: "Yes" },
      { id: "no", label: "No" },
      { id: "not_sure", label: "Not sure" },
    ],
  },
  monthlyComputeBudget: {
    id: "monthlyComputeBudget",
    kind: "question",
    field: "monthlyComputeBudget",
    prompt: "How much would you realistically spend on GPU compute in a typical month?",
    supporting:
      "This is a research question, not a quoted price or a commitment to purchase.",
    selection: "single",
    allowOther: false,
    options: [
      { id: "lt_500", label: "Less than 500 ETB" },
      { id: "500_2000", label: "500–2,000 ETB" },
      { id: "2000_5000", label: "2,000–5,000 ETB" },
      { id: "5000_10000", label: "5,000–10,000 ETB" },
      { id: "10000_50000", label: "10,000–50,000 ETB" },
      { id: "gt_50000", label: "More than 50,000 ETB" },
    ],
  },
  earlyAccessIntent: {
    id: "earlyAccessIntent",
    kind: "question",
    field: "earlyAccessIntent",
    prompt: "If you get access, would you try the service?",
    selection: "single",
    allowOther: false,
    options: [
      { id: "definitely", label: "Definitely" },
      { id: "maybe", label: "Maybe" },
      { id: "no", label: "No" },
    ],
  },
} satisfies Record<string, QuestionDef>;

export type QuestionKey = keyof typeof questions;

/** Questions that store a list of option ids. */
export const multiSelectQuestionIds = Object.values(questions)
  .filter((question) => question.selection === "multi")
  .map((question) => question.id);

/** Ordered option ids for a question — used by validation and schema parity tests. */
export function optionIds(questionKey: QuestionKey): string[] {
  return questions[questionKey].options.map((option: SurveyOption) => option.id);
}

/** Look up the stored value for a display label (falls back to the raw value). */
export function optionLabel(questionKey: QuestionKey, value: string): string {
  const option = questions[questionKey].options.find((item) => item.id === value);
  return option?.label ?? value;
}

/** Convenience accessor used by step components and the review screen. */
export function isQuestionStep(id: StepId): id is QuestionKey {
  return Object.prototype.hasOwnProperty.call(questions, id);
}

/** Typed accessor for a question definition. */
export function getQuestion(id: QuestionKey): QuestionDef {
  return questions[id];
}
