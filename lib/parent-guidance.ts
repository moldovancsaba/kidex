import type { DevelopmentPlan } from "@/lib/development-plans";
import type { RecommendationSummary } from "@/lib/recommendations";
import type { ChildSupportWorkspace } from "@/lib/support-workspace";
import type { AssessmentDomain } from "@/types/assessment";

export interface ParentImprovementGuidance {
  id: string;
  title: string;
  domain?: AssessmentDomain;
  whyNow: string;
  thisWeek: string[];
  linkedSupport: string[];
  boundaryNote?: string;
}

function safeDomainName(domain?: AssessmentDomain): string {
  if (domain === "movement") return "movement confidence";
  if (domain === "social") return "social participation";
  if (domain === "mental") return "attention and self-management";
  return "overall development";
}

function weeklyActionsForDomain(domain?: AssessmentDomain, focusLabel?: string): string[] {
  const focus = focusLabel?.toLowerCase() || "the current focus area";
  if (domain === "movement") {
    return [
      `Use one short, playful practice moment for ${focus} instead of a long drill.`,
      "Notice effort and body control first, not results or speed.",
    ];
  }
  if (domain === "social") {
    return [
      `Practice ${focus} in one calm social moment, such as taking turns or joining a simple group task.`,
      "Use brief praise for cooperation, recovery after mistakes, and asking for help.",
    ];
  }
  if (domain === "mental") {
    return [
      `Use one short routine for ${focus}, such as a reset phrase, two calm breaths, or one clear step at a time.`,
      "Keep the tone low-pressure and stop before the child feels overloaded.",
    ];
  }
  return [
    `Choose one small weekly support routine for ${focus}.`,
    "Keep the routine calm, brief, and easy to repeat.",
  ];
}

function whyNowCopy(summary: RecommendationSummary, domain?: AssessmentDomain, focusLabel?: string): string {
  const benchmark = domain ? summary.domainBenchmarks.find((entry) => entry.domain === domain) : null;
  const focus = focusLabel || safeDomainName(domain);
  if (benchmark?.status === "below_min") {
    return `${focus} is currently below the expected benchmark range, so steady support now matters more than pushing intensity.`;
  }
  if (benchmark?.status === "developing") {
    return `${focus} is showing a workable base, but it still needs steady repetition before it becomes more secure.`;
  }
  if (domain === "mental" && summary.mentalWellbeing.riskLevel !== "low") {
    return `Recent wellbeing signals suggest ${focus} needs calm support and clear expectations right now.`;
  }
  return `This area is worth supporting now because it connects directly to the child’s current measured profile.`;
}

function boundaryNote(recommendationId: string, summary: RecommendationSummary): string | undefined {
  if (recommendationId === "wellbeing-escalation") {
    return summary.mentalWellbeing.riskLevel === "high"
      ? "Home support should stay calm and consistent, but this pattern also needs timely adult follow-up beyond home routine alone."
      : "Home support can help, but the next adult follow-up conversation still matters for context and safe adjustment.";
  }
  if (recommendationId === "recovery-support") {
    return "If recovery strain keeps building, the next step should be adult review and schedule adjustment, not more pressure at home.";
  }
  return undefined;
}

export function buildParentImprovementGuidance(input: {
  recommendationSummary: RecommendationSummary;
  plan?: DevelopmentPlan | null;
  supportWorkspace?: ChildSupportWorkspace | null;
}): ParentImprovementGuidance[] {
  const { recommendationSummary, plan, supportWorkspace } = input;
  const familyAssignments = (plan?.assignments || []).filter((assignment) => assignment.audience === "family");
  const caregiverTools = (supportWorkspace?.caregiverTools || []).map((tool) => tool.title);

  return recommendationSummary.recommendations.slice(0, 3).map((recommendation, index) => {
    const focusLabel = recommendation.focusItems[0]?.label;
    const assignment = familyAssignments[index];
    const linkedSupport = [
      ...(assignment ? [assignment.title] : []),
      ...caregiverTools.filter((title) => {
        const normalized = title.toLowerCase();
        return recommendation.domain === "mental"
          ? normalized.includes("confidence") || normalized.includes("language") || normalized.includes("partnership")
          : recommendation.domain === "social"
            ? normalized.includes("partnership")
            : recommendation.domain === "movement"
              ? normalized.includes("partnership") || normalized.includes("support")
              : true;
      }).slice(0, assignment ? 1 : 2),
    ].slice(0, 2);

    return {
      id: recommendation.id,
      title: recommendation.domain
        ? `${safeDomainName(recommendation.domain)}: what to do this week`
        : `${recommendation.title}: what to do this week`,
      domain: recommendation.domain,
      whyNow: whyNowCopy(recommendationSummary, recommendation.domain, focusLabel),
      thisWeek: assignment
        ? [
            assignment.notes,
            ...weeklyActionsForDomain(recommendation.domain, focusLabel).slice(0, 1),
          ]
        : weeklyActionsForDomain(recommendation.domain, focusLabel),
      linkedSupport,
      boundaryNote: boundaryNote(recommendation.id, recommendationSummary),
    };
  });
}
