import { describe, expect, it } from "vitest";

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
  });
});
