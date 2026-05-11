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

export function buildFamilyFriendlyReportSummary(input: {
  record: AssessmentRecord;
  recommendationSummary: RecommendationSummary;
  plan?: DevelopmentPlan | null;
}): FamilyFriendlyReportSummary {
  const { recommendationSummary, plan } = input;
  const recommendations = recommendationSummary.recommendations.slice(0, 3).map((recommendation) => ({
    title: recommendation.title,
    message: recommendation.domain
      ? `This suggestion focuses on ${safeDomainName(recommendation.domain)} and gives the family a clear way to support progress between sessions.`
      : "This suggestion helps maintain the current positive direction through regular, supportive practice.",
    evidence: recommendation.sourceEvidence.slice(0, 2).map((entry) => entry.detail),
  }));

  const nextSteps = plan?.assignments.slice(0, 3).map((assignment) => assignment.title)
    || recommendationSummary.focusAreas.slice(0, 3).map((item) => `Support ${item.label.toLowerCase()} with one short, low-pressure practice each week.`);

  return {
    headline: readinessHeadline(recommendationSummary),
    summary: `This report summarizes current progress in a child-safe, non-diagnostic way. It reflects the latest observations and highlights where simple, steady support can help next.`,
    recommendations,
    nextSteps,
  };
}
