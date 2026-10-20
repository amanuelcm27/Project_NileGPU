import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { optionIds, type QuestionKey } from "@/lib/survey/questions";
import { wishlistSubmissionSchema } from "@/lib/validation/wishlist";
import { validYesPayload } from "./fixtures";

/**
 * Static parity between the SQL migration, the survey configuration and the
 * security requirements.
 *
 * The survey can be edited in one place (`lib/survey/questions.ts`), but the
 * database still enforces its own enum lists. This test fails loudly if the two
 * ever drift apart.
 */

const migrationPath = fileURLToPath(
  new URL("../supabase/migrations/0001_wishlist_applications.sql", import.meta.url),
);
const sql = readFileSync(migrationPath, "utf8");

const constraints: Array<{ constraint: string; question: QuestionKey }> = [
  { constraint: "wishlist_user_type_check", question: "userType" },
  { constraint: "wishlist_gpu_workloads_check", question: "gpuWorkload" },
  { constraint: "wishlist_vram_requirement_check", question: "vramRequirement" },
  { constraint: "wishlist_usage_frequency_check", question: "usageFrequency" },
  { constraint: "wishlist_providers_used_check", question: "providersUsed" },
  { constraint: "wishlist_previous_service_problems_check", question: "previousServiceProblems" },
  { constraint: "wishlist_adoption_barriers_check", question: "adoptionBarriers" },
  { constraint: "wishlist_current_compute_solution_check", question: "currentComputeSolution" },
  { constraint: "wishlist_etb_payment_preference_check", question: "etbPaymentPreference" },
  { constraint: "wishlist_monthly_compute_budget_check", question: "monthlyComputeBudget" },
  { constraint: "wishlist_early_access_intent_check", question: "earlyAccessIntent" },
];

function lineFor(constraint: string): string {
  const line = sql
    .split("\n")
    .find((candidate) => candidate.includes(`add constraint ${constraint}`));
  expect(line, `constraint ${constraint} not found in migration`).toBeTruthy();
  return line ?? "";
}

function quotedValues(line: string): string[] {
  return [...line.matchAll(/'([^']*)'/g)].map((match) => match[1] ?? "");
}

describe("SQL migration parity with the survey configuration", () => {
  for (const { constraint, question } of constraints) {
    it(`${constraint} matches the ${question} options exactly`, () => {
      const stored = new Set(quotedValues(lineFor(constraint)));
      const configured = optionIds(question);

      for (const value of configured) {
        expect(stored.has(value), `${value} missing from ${constraint}`).toBe(true);
      }
      expect(stored.size).toBe(configured.length);
    });
  }

  it("stores boolean values for the GPU cloud experience question", () => {
    expect(sql).toMatch(/used_gpu_cloud boolean not null/);
    expect(sql).toMatch(/used_gpu_cloud is true/);
    expect(sql).toMatch(/used_gpu_cloud is false/);
  });

  it("enforces branch consistency and email normalisation in the database", () => {
    expect(sql).toMatch(/wishlist_branch_consistency_check/);
    expect(sql).toMatch(/email = lower\(btrim\(email\)\)/);
    const prunedColumns = quotedValues(lineFor("wishlist_providers_other_check"));
    expect(prunedColumns).toContain("other");
  });
});

describe("SQL migration columns", () => {
  const tableBlock = (() => {
    const match = sql.match(
      /create table if not exists public\.wishlist_applications \(([\s\S]*?)\n\);/,
    );
    return match?.[1] ?? "";
  })();

  it("declares every column produced by the submission transform", () => {
    expect(tableBlock.length, "CREATE TABLE block not found").toBeGreaterThan(0);

    const row = wishlistSubmissionSchema.parse(validYesPayload());
    for (const column of Object.keys(row)) {
      expect(
        tableBlock,
        `column "${column}" is written by the app but missing from CREATE TABLE`,
      ).toMatch(new RegExp(`(?:^|\\n)\\s*${column}\\s`, "m"));
    }
  });
});

describe("database security posture", () => {
  it("enables row level security", () => {
    expect(sql).toMatch(/alter table public\.wishlist_applications enable row level security/i);
  });

  it("creates no public read or write policies", () => {
    expect(sql).not.toMatch(/create policy/i);
    expect(sql).not.toMatch(/for select/i);
  });

  it("revokes access from anonymous and authenticated roles", () => {
    expect(sql).toMatch(/revoke all on table public\.wishlist_applications from anon/i);
    expect(sql).toMatch(/revoke all on table public\.wishlist_applications from authenticated/i);
  });

  it("grants write access to the service role only", () => {
    expect(sql).toMatch(/grant all on table public\.wishlist_applications to service_role/i);
  });

  it("enforces one application per email address", () => {
    expect(sql).toMatch(
      /create unique index if not exists wishlist_email_unique_idx\s+on public\.wishlist_applications \(email\)/i,
    );
    expect(sql).toContain("duplicate email address(es)");
    expect(sql).not.toMatch(/repeat registrations are allowed/i);
  });

  it("indexes the fields used for administrative filtering", () => {
    for (const index of [
      "wishlist_created_at_idx",
      "wishlist_email_unique_idx",
      "wishlist_user_type_idx",
      "wishlist_usage_frequency_idx",
      "wishlist_monthly_compute_budget_idx",
      "wishlist_gpu_workloads_gin_idx",
    ]) {
      expect(sql).toContain(index);
    }
  });
});
