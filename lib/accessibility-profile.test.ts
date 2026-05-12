import { describe, expect, it } from "vitest";
import { defaultAccessibilityProfile, normalizeAccessibilityProfile } from "./accessibility-profile";

describe("normalizeAccessibilityProfile", () => {
  it("normalizes known options and drops invalid entries", () => {
    const profile = normalizeAccessibilityProfile({
      familyViewMode: "simplified",
      communicationSupport: "visual_supports",
      accommodations: ["visual_schedule", "movement_breaks", "invalid"],
      participationBarriers: "  Busy transitions  ",
    });

    expect(profile).toEqual({
      familyViewMode: "simplified",
      communicationSupport: "visual_supports",
      accommodations: ["visual_schedule", "movement_breaks"],
      participationBarriers: "Busy transitions",
      supportNotes: "",
      strengthsNotes: "",
    });
  });

  it("falls back to defaults for missing values", () => {
    expect(normalizeAccessibilityProfile({})).toEqual(defaultAccessibilityProfile());
  });
});
