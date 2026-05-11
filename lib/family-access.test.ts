import { describe, expect, it } from "vitest";
import { buildFamilyAccessEvents, normalizeFamilyCaregivers } from "./family-access";

describe("normalizeFamilyCaregivers", () => {
  it("keeps structured caregiver data and drops invalid rows", () => {
    const caregivers = normalizeFamilyCaregivers([
      {
        name: "  Anna Smith ",
        email: "ANNA@EXAMPLE.COM ",
        relationship: "mother",
        accessLevel: "full",
        contactPreferences: { email: true, sms: true },
      },
      {
        name: " ",
      },
    ]);

    expect(caregivers).toHaveLength(1);
    expect(caregivers[0]).toMatchObject({
      name: "Anna Smith",
      email: "anna@example.com",
      preferredLocale: "en",
      relationship: "mother",
      accessLevel: "full",
      status: "active",
      inviteStatus: "not_invited",
      contactPreferences: {
        email: true,
        phone: false,
        sms: true,
      },
    });
  });
});

describe("buildFamilyAccessEvents", () => {
  it("creates add and access-change events", () => {
    const previous = normalizeFamilyCaregivers([
      {
        id: "a1",
        name: "Alex Smith",
        email: "alex@example.com",
        preferredLocale: "hu",
        relationship: "guardian",
        accessLevel: "routine",
        canReceiveReports: false,
        canReceiveScheduling: true,
      },
    ]);

    const next = normalizeFamilyCaregivers([
      {
        id: "a1",
        name: "Alex Smith",
        email: "alex@example.com",
        preferredLocale: "hu",
        relationship: "guardian",
        accessLevel: "full",
        canReceiveReports: true,
        canReceiveScheduling: true,
      },
      {
        id: "a2",
        name: "Bea Smith",
        preferredLocale: "ar",
        relationship: "mother",
        accessLevel: "routine",
      },
    ]);

    const events = buildFamilyAccessEvents({
      previous,
      next,
      actorEmail: "coach@example.com",
      createdAt: "2026-05-11T10:00:00.000Z",
    });

    expect(events).toHaveLength(2);
    expect(events.map((event) => event.eventType)).toEqual(["access_changed", "caregiver_added"]);
    expect(events[0].actorEmail).toBe("coach@example.com");
  });
});
