import type { ChildAccessibilityProfile } from "@/lib/accessibility-profile";
import type { DevelopmentPlan } from "@/lib/development-plans";
import type { RecommendationSummary } from "@/lib/recommendations";
import type { AssessmentRecord } from "@/types/assessment";

export interface FamilyFriendlyRecommendation {
  title: string;
  message: string;
  evidence: string[];
}

export interface FamilyFriendlyReportSummary {
  headline: string;
  summary: string;
  recommendations: FamilyFriendlyRecommendation[];
  nextSteps: string[];
  accessibilityNotes: string[];
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
  plan?: DevelopmentPlan | null;
  accessibilityProfile?: ChildAccessibilityProfile | null;
}): FamilyFriendlyReportSummary {
  const { recommendationSummary, plan, accessibilityProfile } = input;
  const simplifiedFamilyView = accessibilityProfile?.familyViewMode === "simplified";
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
      : "This report summarizes current progress in a child-safe, non-diagnostic way."} It reflects the latest observations and highlights where simple, steady support can help next.${profileSummary ? ` ${profileSummary}` : ""}`,
    recommendations,
    nextSteps,
    accessibilityNotes,
  };
}
