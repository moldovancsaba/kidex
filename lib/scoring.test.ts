import { describe, expect, it } from "vitest";

import { defaultMentalWellbeingProfile } from "./mental-wellbeing";
import { computeAssessment } from "./scoring";
import type { AssessmentPayload } from "@/types/assessment";

const payload: AssessmentPayload = {
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
    location: "A",
    conductor: "coach@kidex.test",
    observers: "",
    groupSize: "",
    context: "mixed",
    consentPhoto: false,
    consentReport: true,
  },
  scores: {
    labboltozat: { score: 6, note: "" },
    egyensuly_rapid: { score: 6, note: "" },
    szokdeles: { score: 6, note: "" },
    testtartas: { score: 6, note: "" },
    figyelem_rapid: { score: 3, note: "" },
    feladatmegertes: { score: 3, note: "" },
    kitartas_rapid: { score: 3, note: "" },
    frusztracio: { score: 3, note: "" },
    egyuttmukodes_rapid: { score: 1, note: "" },
    szabalykovetes_rapid: { score: 1, note: "" },
    kommunikacio_rapid: { score: 1, note: "" },
    versenyreakcio: { score: 1, note: "" },
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
    perspectives: {
      child: { focus: 3, resilience: 3, selfTalk: 4, confidence: 4, selfRegulation: 3, helpSeeking: 4 },
      observer: { focus: 3, resilience: 3, selfTalk: 3, confidence: 3, selfRegulation: 3, helpSeeking: 3 },
      caregiver: { focus: 4, resilience: 4, selfTalk: 4, confidence: 4, selfRegulation: 4, helpSeeking: 4 },
    },
    checkIn: { mood: 4, stress: 2, readiness: 4, sleepQuality: 4, fatigue: 2, soreness: 2 },
  },
  attachments: [],
};

describe("computeAssessment", () => {
  it("uses configurable domain weights for ski", () => {
    const result = computeAssessment(payload, {
      domainWeights: {
        movement: 0.2,
        social: 0.2,
        mental: 0.6,
      },
      readinessMetric: "ski",
      readinessThreshold: "min",
      aspirationThreshold: "target",
    });

    expect(result.movementAverage).toBe(6);
    expect(result.socialAverage).toBe(1);
    expect(result.mentalAverage).toBe(3);
    expect(result.ski).toBe(3.2);
    expect(result.mentalWellbeing.mentalSkillsAverage).toBeGreaterThan(3);
    expect(result.mentalWellbeing.riskLevel).toBe("low");
  });
});
