import { describe, expect, it } from "vitest";
import { resolveSteps } from "@/lib/survey/flow";
import { buildProgress, buildReviewRows, isStepAnswered, pruneInapplicableAnswers } from "@/lib/survey/engine";
import type { StepId, SurveyAnswers } from "@/lib/survey/types";

const BASE_FLOW_WITHOUT_BRANCH: StepId[] = [
  "identity",
  "userType",
  "gpuWorkload",
  "vramRequirement",
  "usageFrequency",
  "interstitialHalfway",
  "usedGpuCloud",
  "currentComputeSolution",
  "interstitialAlmost",
  "etbPaymentPreference",
  "monthlyComputeBudget",
  "earlyAccessIntent",
  "review",
];

describe("survey flow resolution", () => {
  it("assumes the longest path before the branch question is answered", () => {
    const steps = resolveSteps({});
    expect(steps).toContain("providersUsed");
    expect(steps).toContain("previousServiceProblems");
    expect(steps).toContain("adoptionBarriers");
    // 13 fixed steps + 3 possible branch steps
    expect(steps).toHaveLength(16);
    expect(steps[0]).toBe("identity");
    expect(steps.at(-1)).toBe("review");
  });

  it("skips the 'no cloud' question when the applicant has used a GPU cloud service", () => {
    const steps = resolveSteps({ usedGpuCloud: "yes" });
    expect(steps).toContain("providersUsed");
    expect(steps).toContain("previousServiceProblems");
    expect(steps).not.toContain("adoptionBarriers");
    expect(steps).toHaveLength(15);
    // Ordering: providers and problems come before the current-alternative question.
    expect(steps.indexOf("providersUsed")).toBeLessThan(steps.indexOf("currentComputeSolution"));
    expect(steps.indexOf("previousServiceProblems")).toBeLessThan(
      steps.indexOf("currentComputeSolution"),
    );
  });

  it("skips the provider questions when the applicant has never used a GPU cloud service", () => {
    const steps = resolveSteps({ usedGpuCloud: "no" });
    expect(steps).toContain("adoptionBarriers");
    expect(steps).not.toContain("providersUsed");
    expect(steps).not.toContain("previousServiceProblems");
    expect(steps).toHaveLength(14);
  });

  it("keeps every fixed step in both branches", () => {
    for (const value of ["yes", "no"] as const) {
      const steps = resolveSteps({ usedGpuCloud: value });
      for (const id of BASE_FLOW_WITHOUT_BRANCH) {
        expect(steps).toContain(id);
      }
    }
  });
});

describe("progress indicator", () => {
  it("never counts skipped questions as completed", () => {
    const answers: SurveyAnswers = { usedGpuCloud: "no" };
    const progress = buildProgress(
      { identity: { fullName: "A", email: "a@b.com" }, answers },
      "adoptionBarriers",
    );

    const questionSteps = progress.steps;
    expect(questionSteps).not.toContain("providersUsed");

    // Questions before the current step that are unanswered must not be counted.
    const progressAtEnd = buildProgress(
      { identity: { fullName: "A", email: "a@b.com" }, answers },
      "review",
    );
    expect(progressAtEnd.answeredQuestions).toBe(1);
    expect(progressAtEnd.totalQuestions).toBe(10);
  });

  it("reports monotonic progress while the branch answer shrinks the flow", () => {
    const identity = { fullName: "Hanna", email: "h@example.com" };
    let answers: SurveyAnswers = {};
    let state = { identity, answers };

    const atBranch = buildProgress(state, "usedGpuCloud");
    expect(atBranch.percent).toBe(Math.round((6 / 15) * 100));

    answers = { ...answers, usedGpuCloud: "no" };
    state = { identity, answers };
    const afterBranch = buildProgress(state, "adoptionBarriers");

    expect(afterBranch.total).toBeLessThan(atBranch.total);
    expect(afterBranch.percent).toBeGreaterThan(atBranch.percent);
    expect(afterBranch.stepNumber).toBe(afterBranch.index + 1);
  });

  it("walks a full 'yes' branch without ever moving the percentage backwards", () => {
    const identity = { fullName: "Hanna", email: "h@example.com" };
    const sequence: Array<[StepId, SurveyAnswers]> = [
      ["identity", {}],
      ["userType", { userType: "ai_startup" }],
      ["gpuWorkload", { userType: "ai_startup", gpuWorkload: "fine_tuning" }],
      [
        "vramRequirement",
        { userType: "ai_startup", gpuWorkload: "fine_tuning", vramRequirement: "24_48gb" },
      ],
      [
        "usageFrequency",
        {
          userType: "ai_startup",
          gpuWorkload: "fine_tuning",
          vramRequirement: "24_48gb",
          usageFrequency: "daily",
        },
      ],
      [
        "usedGpuCloud",
        {
          userType: "ai_startup",
          gpuWorkload: "fine_tuning",
          vramRequirement: "24_48gb",
          usageFrequency: "daily",
        },
      ],
      [
        "providersUsed",
        {
          userType: "ai_startup",
          gpuWorkload: "fine_tuning",
          vramRequirement: "24_48gb",
          usageFrequency: "daily",
          usedGpuCloud: "yes",
        },
      ],
      [
        "currentComputeSolution",
        {
          userType: "ai_startup",
          gpuWorkload: "fine_tuning",
          vramRequirement: "24_48gb",
          usageFrequency: "daily",
          usedGpuCloud: "yes",
          providersUsed: ["runpod"],
          previousServiceProblems: ["price"],
        },
      ],
      ["review", { usedGpuCloud: "yes" }],
    ];

    let lastPercent = -1;
    for (const [stepId, answers] of sequence) {
      const progress = buildProgress({ identity, answers }, stepId);
      expect(progress.steps).toContain(stepId);
      expect(progress.percent).toBeGreaterThanOrEqual(lastPercent);
      lastPercent = progress.percent;
    }

    expect(lastPercent).toBe(100);
  });

  it("treats interstitials as answered transitions", () => {
    expect(isStepAnswered("interstitialHalfway", { identity: {}, answers: {} })).toBe(true);
    expect(isStepAnswered("identity", { identity: {}, answers: {} })).toBe(false);
    expect(
      isStepAnswered("identity", { identity: { fullName: "A", email: "a@b.com" }, answers: {} }),
    ).toBe(true);
  });

  it("requires at least one selection for multi-select questions", () => {
    const identity = { fullName: "A", email: "a@b.com" };
    expect(isStepAnswered("providersUsed", { identity, answers: { providersUsed: [] } })).toBe(false);
    expect(
      isStepAnswered("providersUsed", { identity, answers: { providersUsed: ["runpod"] } }),
    ).toBe(true);
  });
});

describe("branch switching", () => {
  it("preserves answers in state but prunes inapplicable ones from the payload", () => {
    const answers: SurveyAnswers = {
      usedGpuCloud: "no",
      providersUsed: ["runpod"],
      providersOther: "Some provider",
      previousServiceProblems: ["price"],
      previousServiceProblemsOther: "Extra detail",
      adoptionBarriers: ["too_expensive"],
      monthlyComputeBudget: "lt_500",
    };

    const pruned = pruneInapplicableAnswers(answers);

    expect(pruned.adoptionBarriers).toEqual(["too_expensive"]);
    expect(pruned.providersUsed).toBeUndefined();
    expect(pruned.providersOther).toBeUndefined();
    expect(pruned.previousServiceProblems).toBeUndefined();
    expect(pruned.previousServiceProblemsOther).toBeUndefined();
    expect(pruned.monthlyComputeBudget).toBe("lt_500");
  });

  it("drops 'other' free text when the other option is not selected", () => {
    const pruned = pruneInapplicableAnswers({
      usedGpuCloud: "yes",
      providersUsed: ["runpod"],
      providersOther: "should be dropped",
      previousServiceProblems: ["other"],
      previousServiceProblemsOther: "kept",
    });

    expect(pruned.providersOther).toBeUndefined();
    expect(pruned.previousServiceProblemsOther).toBe("kept");
  });

  it("drops empty strings and empty arrays", () => {
    const pruned = pruneInapplicableAnswers({
      userType: "   ",
      adoptionBarriers: [],
      usedGpuCloud: "no",
    });
    expect(pruned.userType).toBeUndefined();
    expect(pruned.adoptionBarriers).toBeUndefined();
  });
});

describe("review summary", () => {
  it("uses display labels and includes free-text 'other' answers", () => {
    const rows = buildReviewRows({
      identity: { fullName: "Hanna", email: "h@example.com" },
      answers: {
        userType: "other",
        userTypeOther: "Independent researcher",
        gpuWorkload: "llm_inference",
        vramRequirement: "16_24gb",
        usageFrequency: "daily",
        usedGpuCloud: "yes",
        providersUsed: ["runpod", "other"],
        providersOther: "A local provider",
        previousServiceProblems: ["price"],
        currentComputeSolution: "own_computer",
        etbPaymentPreference: "yes",
        monthlyComputeBudget: "lt_500",
        earlyAccessIntent: "maybe",
      },
    });

    const userType = rows.find((row) => row.stepId === "userType");
    expect(userType?.prompt).toBe("Which best describes you?");
    expect(userType?.answers).toEqual(["Other", "Independent researcher"]);

    const providers = rows.find((row) => row.stepId === "providersUsed");
    expect(providers?.answers).toEqual(["RunPod", "Other", "A local provider"]);

    // Steps on the branch that was not taken are absent from the summary.
    expect(rows.some((row) => row.stepId === "adoptionBarriers")).toBe(false);
  });
});
