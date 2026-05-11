import { describe, expect, it } from "vitest";
import {
  buildAssessmentConsentSnapshot,
  buildConsentHistoryEvents,
  deriveLegacyConsents,
  hasActiveConsent,
  normalizeConsentPolicy,
} from "./consent-policy";

describe("normalizeConsentPolicy", () => {
  it("derives a policy from legacy booleans", () => {
    const policy = normalizeConsentPolicy(undefined, { consentPhoto: true, consentReport: false });
    expect(policy.mediaCapture.granted).toBe(true);
    expect(policy.familyReport.granted).toBe(false);
    expect(policy.dataSharing.granted).toBe(false);
  });
});

describe("hasActiveConsent", () => {
  it("respects effective and expiry dates", () => {
    const policy = normalizeConsentPolicy({
      familyReport: {
        granted: true,
        effectiveFrom: "2026-05-01",
        expiresAt: "2026-05-31",
      },
    });

    expect(hasActiveConsent(policy, "familyReport", "2026-05-11")).toBe(true);
    expect(hasActiveConsent(policy, "familyReport", "2026-06-01")).toBe(false);
  });
});

describe("buildConsentHistoryEvents", () => {
  it("captures consent changes", () => {
    const previous = normalizeConsentPolicy(undefined, { consentPhoto: false, consentReport: false });
    const next = normalizeConsentPolicy({
      mediaCapture: { granted: true, notes: "Signed by parent" },
    });

    const events = buildConsentHistoryEvents({
      previous,
      next,
      actorEmail: "coach@example.com",
      createdAt: "2026-05-11T12:00:00.000Z",
    });

    expect(events).toHaveLength(1);
    expect(events[0].key).toBe("mediaCapture");
    expect(events[0].actorEmail).toBe("coach@example.com");
  });
});

describe("assessment consent snapshot", () => {
  it("captures point-in-time legacy and snapshot values", () => {
    const policy = normalizeConsentPolicy({
      mediaCapture: { granted: true },
      familyReport: { granted: true, expiresAt: "2026-05-20" },
    });

    expect(deriveLegacyConsents(policy, "2026-05-11")).toEqual({
      consentPhoto: true,
      consentReport: true,
    });
    expect(buildAssessmentConsentSnapshot(policy, "2026-05-11")).toMatchObject({
      mediaCapture: true,
      familyReport: true,
    });
  });
});
