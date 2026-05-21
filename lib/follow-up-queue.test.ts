import { describe, expect, it } from "vitest";

import { buildFollowUpQueue } from "./follow-up-queue";
import type { ChildProfile } from "@/repositories/child.repository";

function makeChild(overrides: Partial<ChildProfile>): ChildProfile {
  return {
    _id: overrides._id || crypto.randomUUID(),
    name: overrides.name || "Child",
    birthDate: overrides.birthDate || "2018-01-01",
    ageGroup: overrides.ageGroup || "7-9",
    consentPhoto: true,
    consentReport: true,
    caregivers: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("buildFollowUpQueue", () => {
  it("prioritizes overdue, then due soon, then missing follow-up dates", () => {
    const queue = buildFollowUpQueue([
      makeChild({
        _id: "on-track",
        name: "On Track",
        latestAssessmentAt: "2026-05-01T00:00:00.000Z",
        nextAssessmentDueDate: "2026-06-20",
        reviewCadenceDays: 30,
      }),
      makeChild({
        _id: "missing",
        name: "Missing",
        latestAssessmentAt: "2026-05-01T00:00:00.000Z",
        nextAssessmentDueDate: undefined,
        reviewCadenceDays: 0,
      }),
      makeChild({
        _id: "soon",
        name: "Soon",
        latestAssessmentAt: "2026-05-01T00:00:00.000Z",
        nextAssessmentDueDate: "2026-05-23",
        reviewCadenceDays: 21,
      }),
      makeChild({
        _id: "overdue",
        name: "Overdue",
        latestAssessmentAt: "2026-04-01T00:00:00.000Z",
        nextAssessmentDueDate: "2026-05-10",
        reviewCadenceDays: 21,
      }),
    ], "2026-05-20T12:00:00.000Z");

    expect(queue.map((item) => item.childName)).toEqual(["Overdue", "Soon", "Missing"]);
    expect(queue[0]?.status).toBe("overdue");
    expect(queue[1]?.status).toBe("due_soon");
    expect(queue[2]?.status).toBe("missing");
  });
});
