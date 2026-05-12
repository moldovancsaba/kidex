import { describe, expect, it } from "vitest";

import { buildSuggestedDevelopmentPlan } from "./development-plans";
import type { RecommendationSummary } from "./recommendations";

const recommendationSummary: RecommendationSummary = {
  readinessStatus: "developing",
  standardsVersionUsed: "v1",
  mentalWellbeing: {
    phase: "follow_up",
    mentalSkillsAverage: 3.1,
    baselineMentalSkillsAverage: 2.8,
    checkInAverage: 3.2,
    recoveryAverage: 3.1,
    disagreementIndex: 0.6,
    riskLevel: "low",
    goalModules: ["Positive self-talk reset"],
    flaggedSignals: [],
  },
  ski: {
    current: 3.2,
    baseline: 2.8,
    min: 3,
    target: 4.5,
    gapToMin: -0.2,
    gapToTarget: 1.3,
  },
  domainBenchmarks: [],
  strengths: [],
  focusAreas: [
    { key: "balance", label: "Balance", score: 2, domain: "movement" },
    { key: "focus", label: "Focus", score: 2, domain: "mental" },
  ],
  recommendations: [
    {
      id: "movement-below_min",
      title: "Movement stabilization",
      rationale: "Movement should be prioritized.",
      domain: "movement",
      severity: "high",
      evidenceStrength: "high",
      focusItems: [{ key: "balance", label: "Balance", score: 2, domain: "movement" }],
      sourceEvidence: [
        {
          type: "benchmark",
          label: "Movement benchmark",
          detail: "Movement is below the current minimum benchmark.",
          strength: "high",
        },
      ],
    },
  ],
};

describe("buildSuggestedDevelopmentPlan", () => {
  it("creates a usable draft plan from recommendation output", () => {
    const plan = buildSuggestedDevelopmentPlan({
      childId: "child-1",
      assessmentId: "assessment-1",
      institutionId: "default",
      createdByUserEmail: "coach@kidex.test",
      recommendationSummary,
    });

    expect(plan.childId).toBe("child-1");
    expect(plan.assessmentId).toBe("assessment-1");
    expect(plan.assignments.length).toBeGreaterThanOrEqual(1);
    expect(plan.assignments[0].focusAreaIds).toEqual(["balance"]);
    expect(plan.checkpoints).toHaveLength(2);
    expect(plan.summary).toContain("Balance");
  });
});
