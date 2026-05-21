import { buildReassessmentSummary, type ReassessmentStatus } from "@/lib/reassessment";
import type { ChildProfile } from "@/repositories/child.repository";

export interface FollowUpQueueItem {
  childId?: string;
  childName: string;
  ageGroup: string;
  latestRecordId?: string;
  latestAssessmentAt?: string;
  latestSki: number | null;
  dueDate?: string;
  status: ReassessmentStatus;
  planStatus?: ChildProfile["latestPlanStatus"];
  daysUntilDue?: number;
  summary: string;
  action: string;
}

function statusWeight(status: ReassessmentStatus): number {
  if (status === "overdue") return 0;
  if (status === "due_soon") return 1;
  if (status === "missing") return 2;
  return 3;
}

function actionLabel(status: ReassessmentStatus): string {
  if (status === "overdue") return "Book the reassessment now and review whether the current plan still fits.";
  if (status === "due_soon") return "Prepare the next reassessment cycle and collect brief progress notes before it happens.";
  if (status === "missing") return "Set the next reassessment date so the support plan has a real follow-up point.";
  return "Follow the current cadence and keep collecting progress evidence.";
}

export function buildFollowUpQueue(children: ChildProfile[], now?: string): FollowUpQueueItem[] {
  return children
    .map((child) => {
      const summary = buildReassessmentSummary({
        latestAssessmentAt: child.latestAssessmentAt,
        plan: {
          childId: child._id || "",
          summary: "",
          status: child.latestPlanStatus || "draft",
          reviewCadenceDays: child.reviewCadenceDays ?? 0,
          nextAssessmentDueDate: child.nextAssessmentDueDate,
          reassessmentNotes: child.reassessmentNotes || "",
          assignments: [],
          checkpoints: [],
          progressNotes: "",
          createdAt: child.createdAt,
          updatedAt: child.updatedAt,
        },
        now,
      });

      return {
        childId: child._id,
        childName: child.name,
        ageGroup: child.ageGroup || "—",
        latestRecordId: child.latestRecordId,
        latestAssessmentAt: child.latestAssessmentAt,
        latestSki: typeof child.latestSki === "number" ? child.latestSki : null,
        dueDate: summary.dueDate,
        status: summary.status,
        planStatus: child.latestPlanStatus,
        daysUntilDue: summary.daysUntilDue,
        summary: summary.summary,
        action: actionLabel(summary.status),
      } satisfies FollowUpQueueItem;
    })
    .filter((item) => item.status !== "on_track")
    .sort((left, right) => {
      const statusDelta = statusWeight(left.status) - statusWeight(right.status);
      if (statusDelta !== 0) return statusDelta;
      const dueDelta = (left.daysUntilDue ?? Number.POSITIVE_INFINITY) - (right.daysUntilDue ?? Number.POSITIVE_INFINITY);
      if (dueDelta !== 0) return dueDelta;
      return left.childName.localeCompare(right.childName);
    });
}
