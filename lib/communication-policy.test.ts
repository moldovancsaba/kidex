import { describe, expect, it } from "vitest";
import { DEFAULT_COMMUNICATION_POLICY, determineCommunicationDeliveryStatus, isWithinQuietHours, normalizeCommunicationPolicy } from "./communication-policy";

describe("communication policy", () => {
  it("normalizes defaults", () => {
    expect(normalizeCommunicationPolicy({})).toEqual(DEFAULT_COMMUNICATION_POLICY);
  });

  it("detects quiet hours across midnight", () => {
    const policy = normalizeCommunicationPolicy({ quietHoursStart: "20:00", quietHoursEnd: "07:00" });
    expect(isWithinQuietHours(policy, new Date("2026-05-12T21:15:00"))).toBe(true);
    expect(isWithinQuietHours(policy, new Date("2026-05-12T10:15:00"))).toBe(false);
  });

  it("returns scheduled hold when policy requires it", () => {
    expect(determineCommunicationDeliveryStatus(DEFAULT_COMMUNICATION_POLICY, new Date("2026-05-12T21:15:00"))).toBe("scheduled_quiet_hours");
  });
});
