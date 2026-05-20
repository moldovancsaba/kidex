import type { DevelopmentPlan } from "@/lib/development-plans";
import type { RecommendationSummary } from "@/lib/recommendations";
import type { AssessmentRecord } from "@/types/assessment";

export type ProgressDirection = "improved" | "stable" | "regressed" | "insufficient_data";
export type ProgressTone = "encouraging" | "mixed" | "support_needed" | "insufficient_data";
export type PlanEffectivenessStatus = "supporting_progress" | "mixed" | "needs_adjustment" | "no_active_plan" | "too_early";

export interface DomainProgressComparison {
  key: "movement" | "social" | "mental" | "ski";
  label: string;
  current: number | null;
  baseline: number | null;
  delta: number | null;
  direction: ProgressDirection;
}

export interface ProgressComparisonSummary {
  tone: ProgressTone;
  headline: string;
  conductorSummary: string;
  parentSummary: string;
  planEffectiveness: {
    status: PlanEffectivenessStatus;
    label: string;
    summary: string;
  };
  domains: DomainProgressComparison[];
  improvedLabels: string[];
  stableLabels: string[];
  regressedLabels: string[];
  limitations: string[];
}

const STABLE_DELTA_THRESHOLD = 0.35;

function compareValue(current: number | null, baseline: number | null): Pick<DomainProgressComparison, "delta" | "direction"> {
  if (typeof current !== "number" || typeof baseline !== "number") {
    return { delta: null, direction: "insufficient_data" };
  }
  const delta = Number((current - baseline).toFixed(2));
  if (delta >= STABLE_DELTA_THRESHOLD) return { delta, direction: "improved" };
  if (delta <= -STABLE_DELTA_THRESHOLD) return { delta, direction: "regressed" };
  return { delta, direction: "stable" };
}

function toneFromDirections(improved: number, regressed: number, hasHistory: boolean): ProgressTone {
  if (!hasHistory) return "insufficient_data";
  if (regressed >= 2 || (regressed >= 1 && improved === 0)) return "support_needed";
  if (improved >= 2 && regressed === 0) return "encouraging";
  return "mixed";
}

function headlineForTone(tone: ProgressTone): string {
  if (tone === "encouraging") return "Current plan is showing useful progress";
  if (tone === "support_needed") return "Current pattern suggests the plan needs adjustment";
  if (tone === "mixed") return "Progress is mixed and needs a narrow follow-up focus";
  return "More follow-up is needed before judging change over time";
}

function buildPlanEffectiveness(
  tone: ProgressTone,
  plan: DevelopmentPlan | null | undefined,
  recommendationSummary: RecommendationSummary,
  limitations: string[],
): ProgressComparisonSummary["planEffectiveness"] {
  if (!plan) {
    return {
      status: "no_active_plan",
      label: "No active plan yet",
      summary: "There is no saved development plan to compare against yet, so the next step is to convert the current support priorities into one focused follow-up plan.",
    };
  }

  const completedAssignments = plan.assignments.filter((assignment) => assignment.status === "done").length;
  const inProgressAssignments = plan.assignments.filter((assignment) => assignment.status === "in_progress").length;
  const completedCheckpoints = plan.checkpoints.filter((checkpoint) => checkpoint.completed).length;

  if (limitations.some((entry) => entry.includes("not enough history"))) {
    return {
      status: "too_early",
      label: "Too early to judge plan effect",
      summary: `The current plan is active, with ${completedAssignments} completed and ${inProgressAssignments} in progress, but there is not enough comparison history yet to judge whether the plan is working reliably.`,
    };
  }

  if (tone === "encouraging") {
    return {
      status: "supporting_progress",
      label: "Plan appears to support progress",
      summary: `The current plan is moving in a helpful direction. ${completedAssignments} assignment${completedAssignments === 1 ? "" : "s"} and ${completedCheckpoints} checkpoint${completedCheckpoints === 1 ? "" : "s"} have been completed, and the measured profile is improving more than it is slipping.`,
    };
  }

  if (tone === "support_needed") {
    return {
      status: "needs_adjustment",
      label: "Plan needs adjustment",
      summary: `The current plan is not yet producing a stable positive pattern. Narrow the next cycle around the highest-pressure recommendation, especially ${recommendationSummary.focusAreas.slice(0, 2).map((item) => item.label).join(" and ") || "the current lowest-scoring areas"}.`,
    };
  }

  return {
    status: "mixed",
    label: "Plan effect is mixed",
    summary: `The current plan shows partial movement but not a clean positive pattern yet. Keep what is helping, reduce overload, and tighten the next follow-up around one or two practical priorities.`,
  };
}

export function buildProgressComparisonSummary(input: {
  record: AssessmentRecord;
  history: AssessmentRecord[];
  recommendationSummary: RecommendationSummary;
  plan?: DevelopmentPlan | null;
}): ProgressComparisonSummary {
  const sortedHistory = [...input.history].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const baseline = sortedHistory.length > 1 ? sortedHistory[0] : null;
  const hasHistory = Boolean(baseline);

  const domains: DomainProgressComparison[] = [
    {
      key: "movement",
      label: "Movement",
      current: input.record.computed.movementAverage,
      baseline: baseline?.computed.movementAverage ?? null,
      ...compareValue(input.record.computed.movementAverage, baseline?.computed.movementAverage ?? null),
    },
    {
      key: "social",
      label: "Social",
      current: input.record.computed.socialAverage,
      baseline: baseline?.computed.socialAverage ?? null,
      ...compareValue(input.record.computed.socialAverage, baseline?.computed.socialAverage ?? null),
    },
    {
      key: "mental",
      label: "Mental",
      current: input.record.computed.mentalAverage,
      baseline: baseline?.computed.mentalAverage ?? null,
      ...compareValue(input.record.computed.mentalAverage, baseline?.computed.mentalAverage ?? null),
    },
    {
      key: "ski",
      label: "Overall readiness",
      current: input.record.computed.ski,
      baseline: baseline?.computed.ski ?? null,
      ...compareValue(input.record.computed.ski, baseline?.computed.ski ?? null),
    },
  ];

  const improvedLabels = domains.filter((entry) => entry.direction === "improved").map((entry) => entry.label);
  const stableLabels = domains.filter((entry) => entry.direction === "stable").map((entry) => entry.label);
  const regressedLabels = domains.filter((entry) => entry.direction === "regressed").map((entry) => entry.label);
  const limitations: string[] = [];

  if (!hasHistory) {
    limitations.push("There is only one recorded assessment, so this is still a current-state picture rather than a reliable change-over-time judgement.");
  }
  if (input.recommendationSummary.confidenceContext.lowConfidenceCount > 0) {
    limitations.push(`Low-confidence scoring is present in ${input.recommendationSummary.confidenceContext.lowConfidenceCount} item${input.recommendationSummary.confidenceContext.lowConfidenceCount === 1 ? "" : "s"}, so small changes should be treated cautiously.`);
  }
  if (input.recommendationSummary.confidenceContext.missingConfidenceCount > 0) {
    limitations.push(`Confidence was not recorded for ${input.recommendationSummary.confidenceContext.missingConfidenceCount} scored item${input.recommendationSummary.confidenceContext.missingConfidenceCount === 1 ? "" : "s"}, which weakens the comparison slightly.`);
  }
  if (typeof input.recommendationSummary.mentalWellbeing.disagreementIndex === "number" && input.recommendationSummary.mentalWellbeing.disagreementIndex >= 1.5) {
    limitations.push("Child, caregiver, and observer views still differ meaningfully, so trend conclusions should be checked against context before widening expectations.");
  }

  const tone = toneFromDirections(improvedLabels.length, regressedLabels.length, hasHistory);
  const focusLabels = input.recommendationSummary.focusAreas.slice(0, 2).map((item) => item.label);
  const headline = headlineForTone(tone);
  const conductorSummary = tone === "encouraging"
    ? `Since the earliest recorded baseline, the child is improving in ${improvedLabels.join(" and ")}.${stableLabels.length > 0 ? ` ${stableLabels.join(" and ")} remain broadly stable.` : ""}${focusLabels.length > 0 ? ` Keep the next cycle focused on ${focusLabels.join(" and ")} so progress stays durable.` : ""}`
    : tone === "support_needed"
      ? `Compared with the earliest recorded baseline, the child is losing ground in ${regressedLabels.join(" and ")}.${improvedLabels.length > 0 ? ` Some progress is still visible in ${improvedLabels.join(" and ")}.` : ""} The next cycle should tighten around ${focusLabels.join(" and ") || "one or two narrow support targets"} and reduce overload.`
      : tone === "mixed"
        ? `Change is mixed: progress is visible in ${improvedLabels.join(" and ") || "some areas"}, while ${regressedLabels.join(" and ") || "other areas"} still need closer support.${stableLabels.length > 0 ? ` ${stableLabels.join(" and ")} remain relatively steady.` : ""} Keep the next follow-up narrow and evidence-led.`
        : "There is not enough longitudinal evidence yet to say whether the child is improving, holding steady, or regressing. Use the current profile as a baseline and reassess with the next observed cycle.";
  const parentSummary = tone === "encouraging"
    ? `Compared with the earlier assessment, your child is showing improvement in ${improvedLabels.join(" and ")}.${stableLabels.length > 0 ? ` ${stableLabels.join(" and ")} look broadly steady.` : ""} Keep support calm and consistent so these gains hold.`
    : tone === "support_needed"
      ? `Compared with the earlier assessment, your child still needs closer support in ${regressedLabels.join(" and ")}.${improvedLabels.length > 0 ? ` There are still positive signs in ${improvedLabels.join(" and ")}.` : ""} The next step is to keep expectations simpler and focus on one or two steady support habits.`
      : tone === "mixed"
        ? `Compared with the earlier assessment, your child is showing some progress and some areas that still need support. That does not mean the plan is failing, but it does mean the next step should stay focused and realistic.`
        : "This is still an early picture. One more follow-up cycle will help show whether the current support approach is working over time.";

  return {
    tone,
    headline,
    conductorSummary,
    parentSummary,
    planEffectiveness: buildPlanEffectiveness(tone, input.plan, input.recommendationSummary, limitations),
    domains,
    improvedLabels,
    stableLabels,
    regressedLabels,
    limitations,
  };
}
