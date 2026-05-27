import { getConsentAlerts, type ConsentAlert } from "@/lib/consent-policy";
import { buildReassessmentSummary, type ReassessmentStatus } from "@/lib/reassessment";
import type { ChildProfile } from "@/repositories/child.repository";

export type FollowUpReasonCode = "reassessment_overdue" | "reassessment_due_soon" | "reassessment_date_missing";
export type FollowUpBlockerCode = "consent_expired" | "consent_future" | "no_latest_record";

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
  reasonCode: FollowUpReasonCode;
  reasonLabel: string;
  blockerCodes: FollowUpBlockerCode[];
  blockerSummary?: string;
  hasBlockers: boolean;
  primaryTargetHref?: string;
  recordTargetHref?: string;
  surveyTargetHref?: string;
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

function reasonLabel(status: ReassessmentStatus): string {
  if (status === "overdue") return "Reassessment overdue";
  if (status === "due_soon") return "Reassessment due soon";
  return "Next reassessment date missing";
}

function reasonCode(status: ReassessmentStatus): FollowUpReasonCode {
  if (status === "overdue") return "reassessment_overdue";
  if (status === "due_soon") return "reassessment_due_soon";
  return "reassessment_date_missing";
}

function blockerCodes(child: ChildProfile, consentAlerts: ConsentAlert[]): FollowUpBlockerCode[] {
  const codes: FollowUpBlockerCode[] = [];

  if (!child.latestRecordId) {
    codes.push("no_latest_record");
  }

  if (consentAlerts.some((alert) => alert.reason === "expired")) {
    codes.push("consent_expired");
  } else if (consentAlerts.some((alert) => alert.reason === "future")) {
    codes.push("consent_future");
  }

  return codes;
}

function blockerSummary(codes: FollowUpBlockerCode[]): string | undefined {
  if (codes.length === 0) return undefined;

  const parts = codes.map((code) => {
    if (code === "consent_expired") return "one or more consent approvals are expired";
    if (code === "consent_future") return "one or more consent approvals are not active yet";
    return "no latest record is linked yet";
  });

  return `Blocked context: ${parts.join("; ")}.`;
}

export function buildFollowUpQueue(children: ChildProfile[], now?: string): FollowUpQueueItem[] {
  const items = children
    .map<FollowUpQueueItem | null>((child) => {
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

      if (summary.status === "on_track") return null;

      const alerts = getConsentAlerts(child.consentPolicy, now);
      const blockers = blockerCodes(child, alerts);
      const childHref = child._id ? `/dashboard/children/${child._id}` : undefined;

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
        reasonCode: reasonCode(summary.status),
        reasonLabel: reasonLabel(summary.status),
        blockerCodes: blockers,
        blockerSummary: blockerSummary(blockers),
        hasBlockers: blockers.length > 0,
        primaryTargetHref: childHref,
        recordTargetHref: child.latestRecordId ? `/dashboard/records/${child.latestRecordId}` : undefined,
        surveyTargetHref: child._id ? `/dashboard/assessment?childId=${child._id}` : undefined,
      } satisfies FollowUpQueueItem;
    });

  return items.filter((item): item is FollowUpQueueItem => item !== null).sort((left, right) => {
      const statusDelta = statusWeight(left.status) - statusWeight(right.status);
      if (statusDelta !== 0) return statusDelta;
      if (left.hasBlockers !== right.hasBlockers) return left.hasBlockers ? -1 : 1;
      const dueDelta = (left.daysUntilDue ?? Number.POSITIVE_INFINITY) - (right.daysUntilDue ?? Number.POSITIVE_INFINITY);
      if (dueDelta !== 0) return dueDelta;
      return left.childName.localeCompare(right.childName);
  });
}
