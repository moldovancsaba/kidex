import { describe, expect, it } from "vitest";

import { buildProgressComparisonSummary } from "./progress-comparison";
import type { DevelopmentPlan } from "./development-plans";
import { defaultMentalWellbeingProfile } from "./mental-wellbeing";
import type { RecommendationSummary } from "./recommendations";
import type { AssessmentRecord } from "@/types/assessment";

function makeRecord(overrides: Partial<AssessmentRecord> = {}): AssessmentRecord {
  return {
    _id: overrides._id || "record-1",
    childId: overrides.childId || "child-1",
    mode: "rapid",
    child: {
      name: "Child",
      birthDate: "2018-01-01",
      ageGroup: "7-9",
      dominantHand: "",
      dominantEye: "",
      dominantFoot: "",
      knownTraits: "",
      parentSignals: "",
      ...(overrides.child || {}),
    },
    session: {
      date: "2026-05-14",
      location: "",
      conductor: "",
      observers: "",
      groupSize: "",
      context: "structured",
      consentPhoto: true,
      consentReport: true,
      ...(overrides.session || {}),
    },
    scores: overrides.scores || {},
    notes: overrides.notes || {
      general: "",
      movement: "",
      social: "",
      mental: "",
      adaptations: "",
      referral: "",
    },
    mentalWellbeing: overrides.mentalWellbeing || {
      ...defaultMentalWellbeingProfile(),
      phase: "follow_up",
    },
    attachments: overrides.attachments || [],
    createdAt: overrides.createdAt || "2026-05-14T09:00:00.000Z",
    updatedAt: overrides.updatedAt || "2026-05-14T09:00:00.000Z",
    computed: {
      movementAverage: 3.5,
      socialAverage: 3.4,
      mentalAverage: 3.2,
      ski: 3.4,
      mentalWellbeing: {
        phase: "follow_up",
        mentalSkillsAverage: 3.1,
        checkInAverage: 3.1,
        recoveryAverage: 3.2,
        disagreementIndex: 0.8,
        riskLevel: "low",
        flaggedSignals: [],
      },
      completion: { done: 12, total: 12 },
      ...(overrides.computed || {}),
    },
  };
}

function makeSummary(): RecommendationSummary {
  return {
    readinessStatus: "developing",
    standardsVersionUsed: "v1",
    standardsVariantUsed: "general",
    confidenceContext: {
      lowConfidenceCount: 1,
      mediumConfidenceCount: 2,
      highConfidenceCount: 9,
      missingConfidenceCount: 0,
      lowConfidenceItems: ["Confidence"],
    },
    mentalWellbeing: {
      phase: "follow_up",
      mentalSkillsAverage: 3.1,
      baselineMentalSkillsAverage: 2.8,
      checkInAverage: 3.1,
      recoveryAverage: 3.2,
      disagreementIndex: 0.8,
      riskLevel: "low",
      goalModules: [],
      flaggedSignals: [],
    },
    ski: {
      current: 3.4,
      baseline: 3,
      min: 3,
      target: 4.5,
      gapToMin: -0.4,
      gapToTarget: 1.1,
    },
    domainBenchmarks: [
      { domain: "movement", label: "Movement", average: 3.5, min: 3, target: 4.5, status: "developing", gapToMin: -0.5, gapToTarget: 1, },
      { domain: "social", label: "Social", average: 3.4, min: 3, target: 4.5, status: "developing", gapToMin: -0.4, gapToTarget: 1.1, },
      { domain: "mental", label: "Mental", average: 3.2, min: 3, target: 4.5, status: "developing", gapToMin: -0.2, gapToTarget: 1.3, },
    ],
    strengths: [{ key: "balance", label: "Balance", score: 4, domain: "movement" }],
    focusAreas: [{ key: "confidence", label: "Confidence", score: 2, domain: "mental" }],
    recommendations: [],
  };
}

const plan: DevelopmentPlan = {
  childId: "child-1",
  status: "active",
  summary: "",
  reviewCadenceDays: 30,
  nextAssessmentDueDate: "2026-06-13",
  reassessmentNotes: "",
  assignments: [
    { id: "a1", title: "Confidence routine", notes: "", audience: "practitioner", status: "done", focusAreaIds: ["confidence"] },
    { id: "a2", title: "Family follow-up", notes: "", audience: "family", status: "in_progress", focusAreaIds: ["confidence"] },
  ],
  checkpoints: [
    { id: "c1", title: "Review", notes: "", completed: true },
  ],
  progressNotes: "",
  createdAt: "2026-05-14T09:00:00.000Z",
  updatedAt: "2026-05-14T09:00:00.000Z",
};

describe("buildProgressComparisonSummary", () => {
  it("recognizes encouraging progress when multiple domains improve", () => {
    const baseline = makeRecord({
      _id: "baseline",
      createdAt: "2026-05-01T09:00:00.000Z",
      computed: {
        movementAverage: 2.8,
        socialAverage: 3.0,
        mentalAverage: 2.5,
        ski: 2.9,
        mentalWellbeing: {
          phase: "baseline",
          mentalSkillsAverage: 2.6,
          checkInAverage: 2.7,
          recoveryAverage: 2.8,
          disagreementIndex: 0.8,
          riskLevel: "low",
          flaggedSignals: [],
        },
        completion: { done: 12, total: 12 },
      },
    });
    const current = makeRecord();

    const summary = buildProgressComparisonSummary({
      record: current,
      history: [current, baseline],
      recommendationSummary: makeSummary(),
      plan,
    });

    expect(summary.tone).toBe("encouraging");
    expect(summary.improvedLabels).toContain("Movement");
    expect(summary.planEffectiveness.status).toBe("supporting_progress");
  });

  it("flags support-needed patterns when domains regress", () => {
    const baseline = makeRecord({
      _id: "baseline",
      createdAt: "2026-05-01T09:00:00.000Z",
      computed: {
        movementAverage: 4,
        socialAverage: 4.1,
        mentalAverage: 3.9,
        ski: 4.1,
        mentalWellbeing: {
          phase: "baseline",
          mentalSkillsAverage: 3.8,
          checkInAverage: 3.7,
          recoveryAverage: 3.8,
          disagreementIndex: 0.4,
          riskLevel: "low",
          flaggedSignals: [],
        },
        completion: { done: 12, total: 12 },
      },
    });
    const current = makeRecord({
      computed: {
        movementAverage: 3,
        socialAverage: 3.1,
        mentalAverage: 2.8,
        ski: 3,
        mentalWellbeing: {
          phase: "follow_up",
          mentalSkillsAverage: 2.9,
          checkInAverage: 2.8,
          recoveryAverage: 2.7,
          disagreementIndex: 0.4,
          riskLevel: "medium",
          flaggedSignals: ["overload"],
        },
        completion: { done: 12, total: 12 },
      },
    });

    const summary = buildProgressComparisonSummary({
      record: current,
      history: [current, baseline],
      recommendationSummary: makeSummary(),
      plan,
    });

    expect(summary.tone).toBe("support_needed");
    expect(summary.regressedLabels.length).toBeGreaterThan(0);
    expect(summary.planEffectiveness.status).toBe("needs_adjustment");
  });

  it("marks comparisons as too early without enough history", () => {
    const current = makeRecord();
    const summary = buildProgressComparisonSummary({
      record: current,
      history: [current],
      recommendationSummary: makeSummary(),
      plan: null,
    });

    expect(summary.tone).toBe("insufficient_data");
    expect(summary.planEffectiveness.status).toBe("no_active_plan");
    expect(summary.limitations.some((entry) => entry.includes("only one recorded assessment"))).toBe(true);
  });
});
