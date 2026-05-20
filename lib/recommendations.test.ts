import { describe, expect, it } from "vitest";

import { defaultMentalWellbeingProfile } from "./mental-wellbeing";
import { buildRecommendationSummary } from "./recommendations";
import type { AssessmentRecord } from "@/types/assessment";
import { DEFAULT_KIDEX_SETTINGS } from "@/services/settings-service";
import { getStandardForAssessment } from "./standards";

const translateSchema = (key: string) => key;

const record: AssessmentRecord = {
  _id: "1",
  childId: "child-1",
  standardsVersionUsed: "v1",
  mode: "rapid",
  child: {
    name: "Test Child",
    birthDate: "2018-01-01",
    ageGroup: "7-9",
    dominantHand: "",
    dominantEye: "",
    dominantFoot: "",
    knownTraits: "",
    parentSignals: "",
  },
  session: {
    date: "2026-05-11",
    location: "",
    conductor: "coach@kidex.test",
    observers: "",
    groupSize: "",
    context: "structured",
    consentPhoto: true,
    consentReport: true,
  },
  scores: {
    labboltozat: { score: 2, note: "", confidence: "low" },
    egyensuly_rapid: { score: 2, note: "", confidence: "medium" },
    szokdeles: { score: 5, note: "", confidence: "high" },
    testtartas: { score: 4, note: "", confidence: "high" },
    figyelem_rapid: { score: 3, note: "", confidence: "medium" },
    feladatmegertes: { score: 3, note: "", confidence: "medium" },
    kitartas_rapid: { score: 2, note: "", confidence: "low" },
    frusztracio: { score: 2, note: "", confidence: "medium" },
    egyuttmukodes_rapid: { score: 4, note: "", confidence: "high" },
    szabalykovetes_rapid: { score: 4, note: "", confidence: "high" },
    kommunikacio_rapid: { score: 3, note: "", confidence: "medium" },
    versenyreakcio: { score: 3, note: "", confidence: undefined },
  },
  notes: {
    general: "",
    movement: "",
    social: "",
    mental: "",
    adaptations: "",
    referral: "",
  },
  mentalWellbeing: {
    ...defaultMentalWellbeingProfile(),
    phase: "follow_up",
    perspectives: {
      child: { focus: 2, resilience: 2, selfTalk: 3, confidence: 2, selfRegulation: 2, helpSeeking: 3 },
      observer: { focus: 2, resilience: 2, selfTalk: 2, confidence: 2, selfRegulation: 2, helpSeeking: 3 },
      caregiver: { focus: 3, resilience: 3, selfTalk: 3, confidence: 3, selfRegulation: 3, helpSeeking: 4 },
    },
    checkIn: { mood: 2, stress: 4, readiness: 2, sleepQuality: 2, fatigue: 4, soreness: 3 },
    goalModules: ["self_talk", "breathing"],
    riskSignals: { ...defaultMentalWellbeingProfile().riskSignals, overload: true },
  },
  attachments: [],
  createdAt: "2026-05-11T09:00:00.000Z",
  updatedAt: "2026-05-11T09:00:00.000Z",
  computed: {
    movementAverage: 3.25,
    socialAverage: 3.5,
    mentalAverage: 2.5,
    ski: 3.13,
    mentalWellbeing: {
      phase: "follow_up",
      mentalSkillsAverage: 2.61,
      checkInAverage: 2.5,
      recoveryAverage: 2.33,
      disagreementIndex: 0.83,
      riskLevel: "medium",
      flaggedSignals: ["overload"],
    },
    completion: {
      done: 12,
      total: 12,
    },
  },
};

describe("buildRecommendationSummary", () => {
  it("creates standards-aware recommendations and focus items", () => {
    const summary = buildRecommendationSummary(
      record,
      [record],
      getStandardForAssessment(DEFAULT_KIDEX_SETTINGS.standards, "v1", "7-9"),
      translateSchema,
    );

    expect(summary.readinessStatus).toBe("developing");
    expect(summary.recommendations.length).toBeGreaterThan(0);
    expect(summary.focusAreas[0]?.score).toBeLessThanOrEqual(summary.focusAreas[1]?.score ?? 6);
    expect(summary.domainBenchmarks.some((entry) => entry.status !== "ready")).toBe(true);
    expect(summary.recommendations[0]?.sourceEvidence.length).toBeGreaterThan(0);
    expect(summary.recommendations[0]?.evidenceStrength).toBeTruthy();
    expect(summary.mentalWellbeing.riskLevel).toBe("medium");
    expect(summary.mentalWellbeing.goalModules).toContain("Positive self-talk reset");
    expect(summary.recommendations.some((entry) => entry.id === "recovery-support")).toBe(true);
    expect(summary.confidenceContext.lowConfidenceCount).toBe(2);
    expect(summary.confidenceContext.missingConfidenceCount).toBe(1);
    expect(summary.recommendations.some((entry) => entry.sourceEvidence.some((evidence) => evidence.label === "Scoring confidence"))).toBe(true);
  });
});
