import { describe, expect, it } from "vitest";
import { buildDashboardAnalytics } from "@/lib/dashboard-analytics";
import { defaultConsentPolicy } from "@/lib/consent-policy";
import type { ChildProfile } from "@/repositories/child.repository";
import type { AssessmentRecord } from "@/types/assessment";
import { DEFAULT_KIDEX_SETTINGS } from "@/services/settings-service";

function makeChild(overrides: Partial<ChildProfile>): ChildProfile {
  return {
    _id: overrides._id || crypto.randomUUID(),
    name: overrides.name || "Child",
    birthDate: overrides.birthDate || "2018-01-01",
    ageGroup: overrides.ageGroup || "7-9",
    consentPhoto: true,
    consentReport: true,
    consentPolicy: overrides.consentPolicy,
    dominantHand: "",
    dominantEye: "",
    dominantFoot: "",
    knownTraits: "",
    parentSignals: "",
    caregivers: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeAssessment(overrides: Partial<AssessmentRecord>): AssessmentRecord {
  return {
    _id: overrides._id || crypto.randomUUID(),
    childId: overrides.childId || "child-1",
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
      ...(overrides.child || {}),
    },
    session: {
      date: "2026-05-01",
      location: "Hall A",
      conductor: "coach@example.com",
      observers: "",
      groupSize: "8",
      context: "structured",
      consentPhoto: true,
      consentReport: true,
      ...(overrides.session || {}),
    },
    scores: overrides.scores || {},
    notes: overrides.notes || {
      general: "",
      movement: "",
      social: "",
      mental: "",
      adaptations: "",
      referral: "",
    },
    attachments: overrides.attachments || [],
    createdAt: overrides.createdAt || "2026-05-01T09:00:00.000Z",
    updatedAt: overrides.updatedAt || "2026-05-01T09:00:00.000Z",
    computed: {
      movementAverage: 4.2,
      socialAverage: 4,
      mentalAverage: 3.8,
      ski: 4.1,
      completion: { done: 10, total: 10 },
      ...(overrides.computed || {}),
    },
    ...overrides,
  };
}

describe("buildDashboardAnalytics", () => {
  it("derives readiness buckets, watchlist items, and orientation mix", () => {
    const childA = makeChild({ _id: "child-a", name: "Ada", ageGroup: "7-9" });
    childA.consentPolicy = defaultConsentPolicy({ consentPhoto: true, consentReport: true });
    const childB = makeChild({
      _id: "child-b",
      name: "Ben",
      ageGroup: "7-9",
      consentPolicy: {
        mediaCapture: { granted: false, notes: "" },
        familyReport: { granted: false, notes: "" },
        dataSharing: { granted: false, notes: "" },
        publicity: { granted: false, notes: "" },
      },
    });

    const analytics = buildDashboardAnalytics({
      children: [childA, childB],
      assessments: [
        makeAssessment({
          _id: "a1",
          childId: "child-a",
          child: { name: "Ada", birthDate: "2018-01-01", ageGroup: "7-9", dominantHand: "", dominantEye: "", dominantFoot: "", knownTraits: "", parentSignals: "" },
          createdAt: "2026-03-01T09:00:00.000Z",
          computed: { movementAverage: 4.1, socialAverage: 4, mentalAverage: 3.9, ski: 4.0, completion: { done: 10, total: 10 } },
        }),
        makeAssessment({
          _id: "a2",
          childId: "child-a",
          child: { name: "Ada", birthDate: "2018-01-01", ageGroup: "7-9", dominantHand: "", dominantEye: "", dominantFoot: "", knownTraits: "", parentSignals: "" },
          createdAt: "2026-05-01T09:00:00.000Z",
          computed: { movementAverage: 5.1, socialAverage: 4.6, mentalAverage: 4.4, ski: 4.8, completion: { done: 10, total: 10 } },
        }),
        makeAssessment({
          _id: "b1",
          childId: "child-b",
          child: { name: "Ben", birthDate: "2018-02-01", ageGroup: "7-9", dominantHand: "", dominantEye: "", dominantFoot: "", knownTraits: "", parentSignals: "" },
          createdAt: "2026-01-10T09:00:00.000Z",
          computed: { movementAverage: 3.3, socialAverage: 3, mentalAverage: 2.8, ski: 2.9, completion: { done: 10, total: 10 } },
        }),
      ],
      standards: DEFAULT_KIDEX_SETTINGS.standards,
      now: "2026-05-11T12:00:00.000Z",
    });

    expect(analytics.readinessByAgeGroup.find((entry) => entry.ageGroup === "7-9")).toMatchObject({
      ready: 1,
      watch: 1,
    });
    expect(analytics.watchlist[0]).toMatchObject({
      childName: "Ben",
      level: "high",
      band: "watch",
    });
    expect(analytics.orientationMix.find((entry) => entry.label === "movement")?.count).toBe(2);
    expect(analytics.childrenNeedingConsentReview).toBe(2);
  });
});
