import { describe, expect, it } from "vitest";
import { parseChildPayload, parseSettingsPayload, parseUserPayload } from "./validations";

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
    expect(parsed.consentPolicy.mediaCapture.granted).toBe(true);
  });
});
