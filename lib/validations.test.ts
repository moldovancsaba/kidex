import { describe, expect, it } from "vitest";
import { parseAssessmentPayload, parseChildPayload, parseSettingsPayload, parseUserPayload } from "./validations";

describe("parseUserPayload", () => {
  it("keeps valid roles and normalizes values", () => {
    const parsed = parseUserPayload({
      name: "  Alex  ",
      roles: ["CONDUCTOR", "observer", "invalid"]
    });

    expect(parsed).toEqual({
      name: "Alex",
      email: "",
      roles: ["conductor", "observer"],
      institutionIds: ["default"],
      primaryInstitutionId: "default",
      preferredLocale: "en",
    });
  });
});

describe("parseSettingsPayload", () => {
  it("returns trimmed lists and removes blanks", () => {
    const parsed = parseSettingsPayload({
      conductors: [" Anna ", "", "Bela"],
      observers: ["  "],
      locations: [" Budapest ", "Debrecen"]
    });

    expect(parsed.conductors).toEqual(["Anna", "Bela"]);
    expect(parsed.observers).toEqual([]);
    expect(parsed.locations).toEqual(["Budapest", "Debrecen"]);
    expect(parsed.institutions[0].id).toBe("default");
    expect(parsed.company).toBeTruthy();
    expect(parsed.emailTemplates).toBeTruthy();
    expect(parsed.communicationPolicy.quietHoursStart).toBe("20:00");
    expect(parsed.standards).toBeTruthy();
  });
});

describe("parseChildPayload", () => {
  it("extracts known fields only", () => {
    const parsed = parseChildPayload({
      name: "  Test Kid ",
      birthDate: "2020-01-01",
      dominantHand: "right",
      caregivers: [{ name: " Parent One ", email: "PARENT@EXAMPLE.COM", preferredLocale: "ar" }],
      accessibilityProfile: {
        familyViewMode: "simplified",
        communicationSupport: "visual_supports",
        accommodations: ["visual_schedule", "movement_breaks", "invalid"],
        participationBarriers: "Crowded spaces and rushed transitions",
      },
      consentPolicy: {
        mediaCapture: { granted: true, effectiveFrom: "2026-05-11" },
      },
      extra: "ignored"
    });

    expect(parsed.name).toBe("Test Kid");
    expect(parsed.birthDate).toBe("2020-01-01");
    expect(parsed.dominantHand).toBe("right");
    expect(parsed.knownTraits).toBe("");
    expect(parsed.caregivers).toHaveLength(1);
    expect(parsed.caregivers[0].email).toBe("parent@example.com");
    expect(parsed.caregivers[0].preferredLocale).toBe("ar");
    expect(parsed.accessibilityProfile.familyViewMode).toBe("simplified");
    expect(parsed.accessibilityProfile.communicationSupport).toBe("visual_supports");
    expect(parsed.accessibilityProfile.accommodations).toEqual(["visual_schedule", "movement_breaks"]);
    expect(parsed.consentPolicy.mediaCapture.granted).toBe(true);
  });
});

describe("parseAssessmentPayload", () => {
  it("normalizes mental wellbeing inputs", () => {
    const parsed = parseAssessmentPayload({
      mode: "rapid",
      child: { name: "Kid", birthDate: "2018-01-01", ageGroup: "7-9" },
      session: { date: "2026-05-12", context: "structured" },
      mentalWellbeing: {
        phase: "follow_up",
        perspectives: {
          child: { focus: 2, resilience: 3, selfTalk: 4 },
        },
        checkIn: { mood: 2, stress: 4, readiness: 3, sleepQuality: 2, fatigue: 5, soreness: 4 },
        goalModules: ["self_talk", "invalid"],
        riskSignals: { urgentConcern: true },
      },
    });

    expect(parsed.mentalWellbeing.phase).toBe("follow_up");
    expect(parsed.mentalWellbeing.perspectives.child.focus).toBe(2);
    expect(parsed.mentalWellbeing.goalModules).toEqual(["self_talk"]);
    expect(parsed.mentalWellbeing.riskSignals.urgentConcern).toBe(true);
  });
});
