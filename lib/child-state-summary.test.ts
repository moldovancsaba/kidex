import { describe, expect, it } from "vitest";

import { buildChildStateSummary } from "./child-state-summary";
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
      date: "2026-05-13",
      location: "Hall A",
      conductor: "coach@example.com",
      observers: "",
      groupSize: "8",
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
    mentalWellbeing: overrides.mentalWellbeing || defaultMentalWellbeingProfile(),
    attachments: overrides.attachments || [],
    createdAt: overrides.createdAt || "2026-05-13T09:00:00.000Z",
    updatedAt: overrides.updatedAt || "2026-05-13T09:00:00.000Z",
    computed: {
      movementAverage: 3.2,
      socialAverage: 3.1,
      mentalAverage: 2.6,
      ski: 3.1,
      mentalWellbeing: {
        phase: "follow_up",
        mentalSkillsAverage: 2.8,
        checkInAverage: 2.7,
        recoveryAverage: 2.5,
        disagreementIndex: 1.7,
        riskLevel: "medium",
        flaggedSignals: ["overload"],
      },
      completion: { done: 8, total: 12 },
      ...(overrides.computed || {}),
    },
  };
}

function makeSummary(overrides: Partial<RecommendationSummary> = {}): RecommendationSummary {
  return {
    readinessStatus: "developing",
    standardsVersionUsed: "v1",
    standardsVariantUsed: "general",
    confidenceContext: {
      lowConfidenceCount: 1,
      mediumConfidenceCount: 7,
      highConfidenceCount: 0,
      missingConfidenceCount: 0,
      lowConfidenceItems: ["Self-regulation"],
    },
    mentalWellbeing: {
      phase: "follow_up",
      mentalSkillsAverage: 2.8,
      baselineMentalSkillsAverage: 2.9,
      checkInAverage: 2.7,
      recoveryAverage: 2.5,
      disagreementIndex: 1.7,
      riskLevel: "medium",
      goalModules: ["Positive self-talk reset"],
      flaggedSignals: ["Urgent follow-up concern"],
    },
    ski: {
      current: 3.1,
      baseline: 3,
      min: 3,
      target: 4.5,
      gapToMin: -0.1,
      gapToTarget: 1.4,
    },
    domainBenchmarks: [
      { domain: "movement", label: "Movement", average: 3.2, min: 3, target: 4.5, gapToMin: 0.2, gapToTarget: 1.3, status: "developing" },
      { domain: "social", label: "Social", average: 2.9, min: 3, target: 4.5, gapToMin: -0.1, gapToTarget: 1.6, status: "below_min" },
      { domain: "mental", label: "Mental", average: 2.6, min: 3, target: 4.5, gapToMin: -0.4, gapToTarget: 1.9, status: "below_min" },
    ],
    strengths: [{ key: "balance", label: "Balance", score: 4, domain: "movement" }],
    focusAreas: [
      { key: "self-regulation", label: "Self-regulation", score: 2, domain: "mental" },
      { key: "social-confidence", label: "Social confidence", score: 2, domain: "social" },
    ],
    recommendations: [],
    ...overrides,
  };
}

describe("buildChildStateSummary", () => {
  it("flags support-needed profiles with caution and limitations", () => {
    const summary = buildChildStateSummary(makeRecord(), makeSummary(), 1);

    expect(summary.tone).toBe("support_needed");
    expect(summary.supportPressure).toBe("medium");
    expect(summary.confidence).toBe("medium");
    expect(summary.parentHeadline).toContain("needs closer support");
    expect(summary.limitations.some((entry) => entry.includes("not enough history"))).toBe(true);
    expect(summary.domains.find((entry) => entry.key === "social")?.parentLabel).toBe("needs extra support");
  });

  it("produces a strength-led summary for stable, complete profiles", () => {
    const record = makeRecord({
      computed: {
        movementAverage: 5.1,
        socialAverage: 4.7,
        mentalAverage: 4.8,
        ski: 4.9,
        mentalWellbeing: {
          phase: "follow_up",
          mentalSkillsAverage: 4.8,
          checkInAverage: 4.6,
          recoveryAverage: 4.4,
          disagreementIndex: 0.4,
          riskLevel: "low",
          flaggedSignals: [],
        },
        completion: { done: 12, total: 12 },
      },
    });
    const summary = makeSummary({
      readinessStatus: "ready",
      confidenceContext: {
        lowConfidenceCount: 0,
        mediumConfidenceCount: 0,
        highConfidenceCount: 12,
        missingConfidenceCount: 0,
        lowConfidenceItems: [],
      },
      mentalWellbeing: {
        phase: "follow_up",
        mentalSkillsAverage: 4.8,
        baselineMentalSkillsAverage: 4.2,
        checkInAverage: 4.6,
        recoveryAverage: 4.4,
        disagreementIndex: 0.4,
        riskLevel: "low",
        goalModules: [],
        flaggedSignals: [],
      },
      domainBenchmarks: [
        { domain: "movement", label: "Movement", average: 5.1, min: 3, target: 4.5, gapToMin: 2.1, gapToTarget: -0.6, status: "ready" },
        { domain: "social", label: "Social", average: 4.7, min: 3, target: 4.5, gapToMin: 1.7, gapToTarget: -0.2, status: "ready" },
        { domain: "mental", label: "Mental", average: 4.8, min: 3, target: 4.5, gapToMin: 1.8, gapToTarget: -0.3, status: "ready" },
      ],
      focusAreas: [],
      strengths: [{ key: "confidence", label: "Confidence", score: 5, domain: "mental" }],
    });

    const result = buildChildStateSummary(record, summary, 3);

    expect(result.tone).toBe("strength_led");
    expect(result.confidence).toBe("high");
    expect(result.parentHeadline).toContain("strong progress");
    expect(result.limitations).toHaveLength(0);
    expect(result.domains.every((entry) => entry.parentLabel === "steady")).toBe(true);
  });
});
