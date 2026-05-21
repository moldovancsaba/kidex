import { describe, expect, it } from "vitest";

import { buildReassessmentSummary, resolveNextAssessmentDueDate } from "./reassessment";
import type { DevelopmentPlan } from "./development-plans";

function makePlan(overrides: Partial<DevelopmentPlan> = {}): DevelopmentPlan {
  return {
    childId: "child-1",
    status: "active",
    summary: "Plan",
    reviewCadenceDays: 30,
    nextAssessmentDueDate: "2026-06-01",
    reassessmentNotes: "",
    assignments: [],
    checkpoints: [],
    progressNotes: "",
    createdAt: "2026-05-01T00:00:00.000Z",
    updatedAt: "2026-05-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("resolveNextAssessmentDueDate", () => {
  it("prefers the explicit plan due date", () => {
    expect(resolveNextAssessmentDueDate(makePlan(), "2026-05-01T00:00:00.000Z")).toBe("2026-06-01");
  });

  it("falls back to cadence from the latest assessment", () => {
    expect(resolveNextAssessmentDueDate(makePlan({ nextAssessmentDueDate: undefined }), "2026-05-01T00:00:00.000Z")).toBe("2026-05-31");
  });
});

describe("buildReassessmentSummary", () => {
  it("marks overdue follow-up when the due date has passed", () => {
    const summary = buildReassessmentSummary({
      plan: makePlan({ nextAssessmentDueDate: "2026-05-10" }),
      latestAssessmentAt: "2026-04-10T00:00:00.000Z",
      now: "2026-05-20T12:00:00.000Z",
    });

    expect(summary.status).toBe("overdue");
    expect(summary.summary).toContain("overdue");
  });

  it("marks due soon follow-up inside the 7 day window", () => {
    const summary = buildReassessmentSummary({
      plan: makePlan({ nextAssessmentDueDate: "2026-05-24" }),
      latestAssessmentAt: "2026-04-24T00:00:00.000Z",
      now: "2026-05-20T12:00:00.000Z",
    });

    expect(summary.status).toBe("due_soon");
  });

  it("returns missing when no follow-up date can be derived", () => {
    const summary = buildReassessmentSummary({
      plan: makePlan({ nextAssessmentDueDate: undefined, reviewCadenceDays: 0 }),
      now: "2026-05-20T12:00:00.000Z",
    });

    expect(summary.status).toBe("missing");
  });
});
