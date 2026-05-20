import { describe, expect, it } from "vitest";

import { buildAssessmentConsistencySummary, guidanceForItem } from "./assessment-consistency";
import { rapidSections } from "./kidex-schema";
import { defaultMentalWellbeingProfile } from "./mental-wellbeing";
import type { AssessmentPayload } from "@/types/assessment";

const assessment: AssessmentPayload = {
  childId: "child-1",
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
  },
  scores: {
    labboltozat: { score: 2, note: "", confidence: "low" },
    egyensuly_rapid: { score: 4, note: "Repeated with better stability later.", confidence: "medium" },
    szokdeles: { score: 5, note: "Consistent across repetitions.", confidence: "high" },
    testtartas: { score: 4, note: "", confidence: undefined },
  },
  notes: {
    general: "",
    movement: "",
    social: "",
    mental: "",
    adaptations: "",
    referral: "",
  },
  mentalWellbeing: defaultMentalWellbeingProfile(),
  attachments: [],
};

describe("assessment consistency helpers", () => {
  it("summarizes confidence counts and low-confidence items missing notes", () => {
    const summary = buildAssessmentConsistencySummary(assessment, rapidSections, (key) => key);

    expect(summary.scoredCount).toBe(4);
    expect(summary.lowConfidenceCount).toBe(1);
    expect(summary.mediumConfidenceCount).toBe(1);
    expect(summary.highConfidenceCount).toBe(1);
    expect(summary.missingConfidenceCount).toBe(1);
    expect(summary.lowConfidenceWithoutNote).toEqual(["labboltozat.title"]);
  });

  it("provides low-friction guidance for an item", () => {
    const guidance = guidanceForItem(rapidSections[0].items[0]);

    expect(guidance.lookFor).toContain("repeatable body control");
    expect(guidance.scoreAnchors).toHaveLength(3);
    expect(guidance.driftPrompt).toContain("best single attempt");
  });
});
