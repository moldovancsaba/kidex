import { describe, expect, it } from "vitest";

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
    labboltozat: { score: 2, note: "" },
    egyensuly_rapid: { score: 2, note: "" },
    szokdeles: { score: 5, note: "" },
    testtartas: { score: 4, note: "" },
    figyelem_rapid: { score: 3, note: "" },
    feladatmegertes: { score: 3, note: "" },
    kitartas_rapid: { score: 2, note: "" },
    frusztracio: { score: 2, note: "" },
    egyuttmukodes_rapid: { score: 4, note: "" },
    szabalykovetes_rapid: { score: 4, note: "" },
    kommunikacio_rapid: { score: 3, note: "" },
    versenyreakcio: { score: 3, note: "" },
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
  createdAt: "2026-05-11T09:00:00.000Z",
  updatedAt: "2026-05-11T09:00:00.000Z",
  computed: {
    movementAverage: 3.25,
    socialAverage: 3.5,
    mentalAverage: 2.5,
    ski: 3.13,
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
  });
});
