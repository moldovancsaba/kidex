import { describe, expect, it } from "vitest";

import { evaluateAssessmentQuality } from "./assessment-quality";
import { rapidSections } from "./kidex-schema";
import { defaultMentalWellbeingProfile } from "./mental-wellbeing";
import type { AssessmentPayload, EvidenceAttachment, ScoreEntry } from "@/types/assessment";

function attachment(): EvidenceAttachment {
  return {
    id: "evidence-1",
    name: "Observation evidence",
    url: "https://kidex.test/evidence.jpg",
    mimeType: "image/jpeg",
    size: 128,
    uploadedAt: "2026-05-31T08:00:00.000Z",
  };
}

function buildScores(score: number | "", confidence: ScoreEntry["confidence"] = "high") {
  return rapidSections
    .flatMap((section) => section.items)
    .reduce<Record<string, ScoreEntry>>((scores, item) => {
      scores[item.key] = { score, note: "", confidence };
      return scores;
    }, {});
}

function payload(patch: Partial<AssessmentPayload> = {}): AssessmentPayload {
  return {
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
      date: "2026-05-31",
      location: "Gym",
      conductor: "Conductor",
      observers: "Observer",
      groupSize: "4",
      context: "mixed",
      consentPhoto: true,
      consentReport: true,
    },
    scores: buildScores(5),
    notes: {
      general: "",
      movement: "",
      social: "",
      mental: "",
      adaptations: "",
      referral: "",
    },
    mentalWellbeing: defaultMentalWellbeingProfile(),
    attachments: [attachment()],
    ...patch,
  };
}

describe("evaluateAssessmentQuality", () => {
  it("marks complete high-confidence assessments as parent-ready", () => {
    const quality = evaluateAssessmentQuality(payload(), "2026-05-31T08:00:00.000Z");

    expect(quality.state).toBe("ready");
    expect(quality.score).toBeGreaterThanOrEqual(80);
    expect(quality.reasons).toEqual([]);
  });

  it("blocks parent-facing use when domain coverage is too low", () => {
    const scores = buildScores("");
    scores.labboltozat = { score: 4, note: "", confidence: "high" };

    const quality = evaluateAssessmentQuality(payload({ scores }), "2026-05-31T08:00:00.000Z");

    expect(quality.state).toBe("insufficient");
    expect(quality.reasons.map((item) => item.code)).toContain("low_domain_coverage");
    expect(quality.reasons.find((item) => item.code === "low_domain_coverage")?.severity).toBe("blocking");
  });

  it("requires conductor review when evidence or scorer confidence is weak", () => {
    const quality = evaluateAssessmentQuality(
      payload({
        scores: buildScores(4, "low"),
        attachments: [],
      }),
      "2026-05-31T08:00:00.000Z",
    );

    expect(quality.state).toBe("review_needed");
    expect(quality.reasons.map((item) => item.code)).toEqual(expect.arrayContaining(["low_scorer_confidence", "missing_evidence"]));
  });
});
