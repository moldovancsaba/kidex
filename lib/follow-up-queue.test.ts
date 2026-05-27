import { describe, expect, it } from "vitest";
import { buildFollowUpQueue } from "@/lib/follow-up-queue";
import type { ChildProfile } from "@/repositories/child.repository";

function child(overrides: Partial<ChildProfile> = {}): ChildProfile {
  return {
    _id: overrides._id || "child-1",
    name: overrides.name || "Anna Kovacs",
    birthDate: overrides.birthDate || "2016-04-12",
    ageGroup: overrides.ageGroup || "7-9",
    consentPolicy: overrides.consentPolicy,
    createdAt: overrides.createdAt || "2026-05-01T12:00:00.000Z",
    updatedAt: overrides.updatedAt || "2026-05-01T12:00:00.000Z",
    latestAssessmentAt: overrides.latestAssessmentAt,
    latestRecordId: overrides.latestRecordId,
    latestPlanStatus: overrides.latestPlanStatus,
    latestSki: overrides.latestSki,
    nextAssessmentDueDate: overrides.nextAssessmentDueDate,
    reviewCadenceDays: overrides.reviewCadenceDays,
    reassessmentNotes: overrides.reassessmentNotes,
  };
}

describe("buildFollowUpQueue", () => {
  it("omits on-track children", () => {
    const queue = buildFollowUpQueue(
      [
        child({
          latestAssessmentAt: "2026-05-10T10:00:00.000Z",
          reviewCadenceDays: 30,
          nextAssessmentDueDate: "2026-06-20",
        }),
      ],
      "2026-05-20T10:00:00.000Z",
    );

    expect(queue).toEqual([]);
  });

  it("builds overdue items with direct targets", () => {
    const queue = buildFollowUpQueue(
      [
        child({
          _id: "child-7",
          latestAssessmentAt: "2026-05-01T10:00:00.000Z",
          latestRecordId: "record-9",
          latestPlanStatus: "active",
          nextAssessmentDueDate: "2026-05-10",
        }),
      ],
      "2026-05-20T10:00:00.000Z",
    );

    expect(queue).toHaveLength(1);
    expect(queue[0]?.status).toBe("overdue");
    expect(queue[0]?.reasonCode).toBe("reassessment_overdue");
    expect(queue[0]?.primaryTargetHref).toBe("/dashboard/children/child-7");
    expect(queue[0]?.recordTargetHref).toBe("/dashboard/records/record-9");
    expect(queue[0]?.surveyTargetHref).toBe("/dashboard/assessment?childId=child-7");
  });

  it("flags blocker conditions", () => {
    const queue = buildFollowUpQueue(
      [
        child({
          latestAssessmentAt: "2026-05-01T10:00:00.000Z",
          nextAssessmentDueDate: "2026-05-18",
          consentPolicy: {
            mediaCapture: { granted: true, notes: "" },
            familyReport: { granted: false, notes: "" },
            dataSharing: { granted: true, expiresAt: "2026-05-02", notes: "" },
            publicity: { granted: false, notes: "" },
          },
        }),
      ],
      "2026-05-20T10:00:00.000Z",
    );

    expect(queue[0]?.hasBlockers).toBe(true);
    expect(queue[0]?.blockerCodes).toContain("no_latest_record");
    expect(queue[0]?.blockerCodes).toContain("consent_expired");
  });

  it("prioritizes overdue before due soon and missing", () => {
    const queue = buildFollowUpQueue(
      [
        child({
          _id: "missing",
          name: "Missing Date",
          latestAssessmentAt: "2026-05-01T10:00:00.000Z",
          reviewCadenceDays: 0,
        }),
        child({
          _id: "soon",
          name: "Due Soon",
          latestAssessmentAt: "2026-05-01T10:00:00.000Z",
          nextAssessmentDueDate: "2026-05-25",
        }),
        child({
          _id: "overdue",
          name: "Overdue",
          latestAssessmentAt: "2026-05-01T10:00:00.000Z",
          nextAssessmentDueDate: "2026-05-10",
        }),
      ],
      "2026-05-20T10:00:00.000Z",
    );

    expect(queue.map((item) => item.childId)).toEqual(["overdue", "soon", "missing"]);
  });
});
