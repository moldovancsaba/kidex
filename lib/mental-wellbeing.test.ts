import { describe, expect, it } from "vitest";

import { computeMentalWellbeing, normalizeMentalWellbeingProfile, wellbeingRiskSignalLabel } from "./mental-wellbeing";

describe("mental wellbeing", () => {
  it("normalizes inputs and computes recovery and risk signals", () => {
    const profile = normalizeMentalWellbeingProfile({
      phase: "follow_up",
      perspectives: {
        child: { focus: 2, resilience: 2, selfTalk: 2, confidence: 3, selfRegulation: 2, helpSeeking: 4 },
        observer: { focus: 3, resilience: 2, selfTalk: 2, confidence: 3, selfRegulation: 2, helpSeeking: 3 },
        caregiver: { focus: 4, resilience: 3, selfTalk: 3, confidence: 4, selfRegulation: 3, helpSeeking: 4 },
      },
      checkIn: { mood: 2, stress: 4, readiness: 2, sleepQuality: 2, fatigue: 4, soreness: 3 },
      goalModules: ["self_talk", "breathing"],
      riskSignals: { overload: true, urgentConcern: true },
    });

    const computed = computeMentalWellbeing(profile);

    expect(profile.goalModules).toEqual(["self_talk", "breathing"]);
    expect(computed.mentalSkillsAverage).toBeGreaterThan(2);
    expect(computed.recoveryAverage).toBeLessThan(3);
    expect(computed.riskLevel).toBe("high");
    expect(computed.flaggedSignals).toContain("urgentConcern");
    expect(wellbeingRiskSignalLabel("urgentConcern")).toBe("Urgent follow-up concern");
  });
});
