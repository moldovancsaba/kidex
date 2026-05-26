import { describe, expect, it } from "vitest";
import {
  buildChildQuickSwitchTargets,
  getChildQuickSwitchFollowUpStatus,
  parseQuickSwitchRecentChildIds,
  rankChildQuickSwitchResults,
  rememberQuickSwitchRecentChild,
} from "@/lib/child-quick-switch";
import type { ChildProfile } from "@/repositories/child.repository";

function child(overrides: Partial<ChildProfile> = {}): ChildProfile {
  return {
    _id: overrides._id || "child-1",
    kidexId: overrides.kidexId || "KDX-001",
    name: overrides.name || "Anna Kovacs",
    birthDate: overrides.birthDate || "2016-04-12",
    ageGroup: overrides.ageGroup || "7-9",
    createdAt: overrides.createdAt || "2026-05-01T12:00:00.000Z",
    updatedAt: overrides.updatedAt || "2026-05-01T12:00:00.000Z",
    latestLocation: overrides.latestLocation || "Budapest",
    latestRecordId: overrides.latestRecordId,
    latestAssessmentAt: overrides.latestAssessmentAt || "2026-05-20T10:00:00.000Z",
    nextAssessmentDueDate: overrides.nextAssessmentDueDate,
    latestPlanStatus: overrides.latestPlanStatus,
  };
}

describe("child quick switch", () => {
  it("parses and caps recent child ids", () => {
    expect(parseQuickSwitchRecentChildIds("[\"a\",\"b\",\"c\"]")).toEqual(["a", "b", "c"]);
    expect(parseQuickSwitchRecentChildIds("[1,true]")).toEqual([]);
  });

  it("remembers a recent child without duplicates", () => {
    expect(rememberQuickSwitchRecentChild(["b", "a"], "a")).toEqual(["a", "b"]);
  });

  it("derives follow-up status", () => {
    expect(getChildQuickSwitchFollowUpStatus(child({ nextAssessmentDueDate: "2026-05-01" }), new Date("2026-05-03T09:00:00.000Z"))).toBe("overdue");
    expect(getChildQuickSwitchFollowUpStatus(child({ nextAssessmentDueDate: "2026-05-10" }), new Date("2026-05-03T09:00:00.000Z"))).toBe("due_soon");
    expect(getChildQuickSwitchFollowUpStatus(child({ nextAssessmentDueDate: "2026-07-10" }), new Date("2026-05-03T09:00:00.000Z"))).toBe("none");
  });

  it("builds child targets from available context", () => {
    const targets = buildChildQuickSwitchTargets(
      child({
        _id: "child-7",
        latestRecordId: "record-9",
        nextAssessmentDueDate: "2026-05-02",
      }),
      true,
    );

    expect(targets.map((target) => target.kind)).toEqual(["child", "record", "follow_up", "survey"]);
  });

  it("ranks matching children and boosts follow-up / recents", () => {
    const results = rankChildQuickSwitchResults(
      [
        child({
          _id: "child-1",
          name: "Anna Kovacs",
          latestRecordId: "record-1",
          nextAssessmentDueDate: "2026-05-02",
        }),
        child({
          _id: "child-2",
          name: "Bela Nagy",
          kidexId: "KDX-888",
          latestLocation: "Gyor",
        }),
      ],
      "anna",
      {
        recentChildIds: ["child-1"],
        canWriteAssessments: true,
        now: new Date("2026-05-03T09:00:00.000Z"),
      },
    );

    expect(results).toHaveLength(1);
    expect(results[0]?.child._id).toBe("child-1");
    expect(results[0]?.recent).toBe(true);
    expect(results[0]?.followUpStatus).toBe("overdue");
    expect(results[0]?.primaryTarget.kind).toBe("follow_up");
  });

  it("returns suggested children when query is empty", () => {
    const results = rankChildQuickSwitchResults(
      [
        child({
          _id: "child-1",
          name: "Anna Kovacs",
          nextAssessmentDueDate: "2026-05-02",
        }),
        child({
          _id: "child-2",
          name: "Bela Nagy",
          latestRecordId: "record-2",
        }),
      ],
      "",
      {
        recentChildIds: ["child-2"],
        now: new Date("2026-05-03T09:00:00.000Z"),
      },
    );

    expect(results[0]?.child._id).toBe("child-1");
    expect(results[1]?.child._id).toBe("child-2");
  });
});
