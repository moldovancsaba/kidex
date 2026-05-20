import type { ChildAccessibilityProfile } from "@/lib/accessibility-profile";
import { buildChildStateSummary, type ChildStateDomainSummary } from "@/lib/child-state-summary";
import type { DevelopmentPlan } from "@/lib/development-plans";
import { buildParentImprovementGuidance, type ParentImprovementGuidance } from "@/lib/parent-guidance";
import { buildProgressComparisonSummary } from "@/lib/progress-comparison";
import type { RecommendationSummary } from "@/lib/recommendations";
import type { ChildSupportWorkspace } from "@/lib/support-workspace";
import type { AssessmentRecord } from "@/types/assessment";

export interface FamilyFriendlyRecommendation {
  title: string;
  message: string;
  evidence: string[];
}

export interface FamilyFriendlyReportSummary {
  headline: string;
  summary: string;
  currentStateHeadline: string;
  currentStateSummary: string;
  currentStateDomains: ChildStateDomainSummary[];
  currentStateConfidence: string;
  progressHeadline: string;
  progressSummary: string;
  planEffectivenessSummary: string;
  parentGuidance: ParentImprovementGuidance[];
  recommendations: FamilyFriendlyRecommendation[];
  nextSteps: string[];
  accessibilityNotes: string[];
  referralNotes: string[];
  evidenceMoments: string[];
}

function readinessHeadline(summary: RecommendationSummary): string {
  if (summary.readinessStatus === "ready") return "Steady progress and confidence";
  if (summary.readinessStatus === "developing") return "Good foundation with clear next steps";
  if (summary.readinessStatus === "below_min") return "Extra support will help the next stage";
  return "More observation will help guide the next step";
}

function safeDomainName(domain?: string): string {
  if (domain === "movement") return "movement confidence";
  if (domain === "social") return "social participation";
  if (domain === "mental") return "attention and self-management";
  return "overall development";
}

function accommodationLabel(value: string): string {
  switch (value) {
    case "visual_schedule":
      return "Use a simple visual schedule before sessions.";
    case "quiet_space":
      return "Offer a quiet reset space when the environment feels too busy.";
    case "movement_breaks":
      return "Build in short movement breaks during longer tasks.";
    case "step_by_step_instructions":
      return "Give one step at a time instead of multiple instructions at once.";
    case "extra_processing_time":
      return "Allow extra processing time before expecting a response.";
    case "caregiver_present":
      return "Let a trusted caregiver stay nearby when that improves comfort.";
    default:
      return "";
  }
}

export function buildFamilyFriendlyReportSummary(input: {
  record: AssessmentRecord;
  recommendationSummary: RecommendationSummary;
  history?: AssessmentRecord[];
  historyCount?: number;
  plan?: DevelopmentPlan | null;
  accessibilityProfile?: ChildAccessibilityProfile | null;
  supportWorkspace?: ChildSupportWorkspace | null;
}): FamilyFriendlyReportSummary {
  const { record, recommendationSummary, history = [record], historyCount = history.length, plan, accessibilityProfile, supportWorkspace } = input;
  const simplifiedFamilyView = accessibilityProfile?.familyViewMode === "simplified";
  const childStateSummary = buildChildStateSummary(record, recommendationSummary, historyCount);
  const progressSummary = buildProgressComparisonSummary({
    record,
    history,
    recommendationSummary,
    plan,
  });
  const parentGuidance = buildParentImprovementGuidance({ recommendationSummary, plan, supportWorkspace });
  const recommendations = recommendationSummary.recommendations.slice(0, 3).map((recommendation) => ({
    title: recommendation.title,
    message: recommendation.domain
      ? simplifiedFamilyView
        ? `This suggestion supports ${safeDomainName(recommendation.domain)} with one clear next action for home or the next session.`
        : `This suggestion focuses on ${safeDomainName(recommendation.domain)} and gives the family a clear way to support progress between sessions.`
      : simplifiedFamilyView
        ? "This suggestion helps keep progress steady with simple, supportive practice."
        : "This suggestion helps maintain the current positive direction through regular, supportive practice.",
    evidence: recommendation.sourceEvidence.slice(0, 2).map((entry) => entry.detail),
  }));

  const nextSteps = plan?.assignments.slice(0, 3).map((assignment) => assignment.title)
    || recommendationSummary.focusAreas.slice(0, 3).map((item) => simplifiedFamilyView
      ? `Practice ${item.label.toLowerCase()} in one short, calm moment each week.`
      : `Support ${item.label.toLowerCase()} with one short, low-pressure practice each week.`);
  const wellbeingSummary = typeof recommendationSummary.mentalWellbeing.recoveryAverage === "number"
    ? ` Current recovery check-in is ${recommendationSummary.mentalWellbeing.recoveryAverage < 3 ? "showing some strain" : "holding reasonably steady"}, and the support plan should stay practical and low-pressure.`
    : "";
  const referralNotes = (supportWorkspace?.referrals || [])
    .filter((entry) => entry.status !== "closed")
    .slice(0, 2)
    .map((entry) => entry.resourceName
      ? `${entry.concernType}: consider ${entry.resourceName}${entry.locality ? ` in ${entry.locality}` : ""}.`
      : `${entry.concernType}: the team has flagged a follow-up support pathway and should explain the next step clearly.`);
  const evidenceMoments = (supportWorkspace?.evidenceJournal || []).slice(0, 3).map((entry) => entry.title);
  const accessibilityNotes = [
    ...(accessibilityProfile?.accommodations || []).map(accommodationLabel).filter(Boolean),
    accessibilityProfile?.supportNotes || "",
  ].filter(Boolean);
  const profileSummary = accessibilityProfile?.participationBarriers
    ? simplifiedFamilyView
      ? `The team is also watching for participation barriers such as ${accessibilityProfile.participationBarriers.toLowerCase()}.`
      : `The team is also watching for participation barriers such as ${accessibilityProfile.participationBarriers.toLowerCase()} and will adjust support as needed.`
    : "";

  return {
    headline: readinessHeadline(recommendationSummary),
    summary: `${simplifiedFamilyView
      ? "This report uses simpler family-facing language and focuses on the next helpful step."
      : "This report summarizes current progress in a child-safe, non-diagnostic way."} It reflects the latest observations and highlights where simple, steady support can help next.${wellbeingSummary}${profileSummary ? ` ${profileSummary}` : ""}`,
    currentStateHeadline: childStateSummary.parentHeadline,
    currentStateSummary: childStateSummary.parentSummary,
    currentStateDomains: childStateSummary.domains,
    currentStateConfidence: childStateSummary.confidence === "high"
      ? "This picture is supported by a fuller set of observations."
      : childStateSummary.confidence === "medium"
        ? "This picture is useful, but the next follow-up will help confirm the pattern."
        : "Parts of this picture are still incomplete, so the next follow-up is important before drawing strong conclusions.",
    progressHeadline: progressSummary.headline,
    progressSummary: progressSummary.parentSummary,
    planEffectivenessSummary: progressSummary.planEffectiveness.summary,
    parentGuidance,
    recommendations,
    nextSteps,
    accessibilityNotes,
    referralNotes,
    evidenceMoments,
  };
}
