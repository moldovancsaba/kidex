import type { DevelopmentPlan } from "@/lib/development-plans";

export type ReassessmentStatus = "missing" | "overdue" | "due_soon" | "on_track";

export interface ReassessmentSummary {
  dueDate?: string;
  status: ReassessmentStatus;
  cadenceDays?: number;
  daysUntilDue?: number;
  summary: string;
  conductorMessage: string;
  parentMessage: string;
}

function addDays(isoDate: string, days: number): string {
  const date = new Date(isoDate);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function startOfDay(isoDate: string): number {
  return new Date(`${isoDate.slice(0, 10)}T00:00:00.000Z`).getTime();
}

export function resolveNextAssessmentDueDate(plan?: DevelopmentPlan | null, latestAssessmentAt?: string): string | undefined {
  if (plan?.nextAssessmentDueDate) return plan.nextAssessmentDueDate;
  const checkpointDueDate = plan?.checkpoints.find((checkpoint) => checkpoint.id === "checkpoint-2" || /next assessment/i.test(checkpoint.title))?.dueDate;
  if (checkpointDueDate) return checkpointDueDate;
  if (plan?.reviewCadenceDays && latestAssessmentAt) return addDays(latestAssessmentAt, plan.reviewCadenceDays);
  return undefined;
}

export function buildReassessmentSummary(input: {
  plan?: DevelopmentPlan | null;
  latestAssessmentAt?: string;
  now?: string;
}): ReassessmentSummary {
  const now = input.now || new Date().toISOString();
  const dueDate = resolveNextAssessmentDueDate(input.plan, input.latestAssessmentAt);
  const cadenceDays = input.plan?.reviewCadenceDays;

  if (!dueDate) {
    return {
      status: "missing",
      cadenceDays,
      summary: "No reassessment date is set yet.",
      conductorMessage: "Set the next reassessment date so the current plan turns into a real follow-up cycle.",
      parentMessage: "The team should confirm the next check-in date so progress can be reviewed on time.",
    };
  }

  const dayDiff = Math.ceil((startOfDay(dueDate) - startOfDay(now)) / (1000 * 60 * 60 * 24));
  if (dayDiff < 0) {
    return {
      dueDate,
      status: "overdue",
      cadenceDays,
      daysUntilDue: dayDiff,
      summary: `Reassessment is overdue by ${Math.abs(dayDiff)} day${Math.abs(dayDiff) === 1 ? "" : "s"}.`,
      conductorMessage: "Book the next assessment now and review whether the current plan needs to be narrowed or escalated.",
      parentMessage: "A follow-up review is overdue, so the team should arrange the next check-in soon.",
    };
  }
  if (dayDiff <= 7) {
    return {
      dueDate,
      status: "due_soon",
      cadenceDays,
      daysUntilDue: dayDiff,
      summary: `Reassessment is due within ${dayDiff} day${dayDiff === 1 ? "" : "s"}.`,
      conductorMessage: "Keep the current support focus tight and prepare the next assessment cycle now.",
      parentMessage: "The next review is coming soon, so recent progress and concerns should be noted clearly.",
    };
  }

  return {
    dueDate,
    status: "on_track",
    cadenceDays,
    daysUntilDue: dayDiff,
    summary: `Reassessment is scheduled in ${dayDiff} days.`,
    conductorMessage: "The current follow-up window is still on track. Use the remaining time to collect practical progress notes.",
    parentMessage: "The next review date is already set, and steady follow-through between now and then will help make that review useful.",
  };
}
