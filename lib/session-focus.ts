import type { DevelopmentPlan } from "@/lib/development-plans";
import type { ProgressComparisonSummary } from "@/lib/progress-comparison";
import type { RecommendationSummary } from "@/lib/recommendations";
import type { ChildSupportWorkspace } from "@/lib/support-workspace";
import type { AssessmentDomain } from "@/types/assessment";

export interface SessionFocusPriority {
  id: string;
  title: string;
  urgency: "high" | "medium" | "low";
  domain?: AssessmentDomain;
  whyNow: string;
  sessionActions: string[];
  linkedPlanAssignments: string[];
  linkedSupport: string[];
}

type SessionFocusPriorityCandidate = SessionFocusPriority & {
  score: number;
};

function basePriorityScore(priority: RecommendationSummary["recommendations"][number], progressSummary: ProgressComparisonSummary) {
  let score = priority.severity === "high" ? 6 : priority.severity === "medium" ? 4 : 2;
  if (priority.domain && progressSummary.regressedLabels.includes(domainLabel(priority.domain))) score += 4;
  if (priority.domain && progressSummary.improvedLabels.includes(domainLabel(priority.domain))) score -= 1;
  return score;
}

function domainLabel(domain: AssessmentDomain) {
  if (domain === "movement") return "Movement";
  if (domain === "social") return "Social";
  return "Mental";
}

function actionsForDomain(domain: AssessmentDomain | undefined, recommendationTitle: string): string[] {
  if (domain === "movement") {
    return [
      "Narrow the session to one movement pattern and one success cue instead of stacking corrections.",
      "Reduce speed or complexity first, then add progression only after two or three steady repetitions.",
      "End with one repeatable win so the child leaves the session with a clear success memory.",
    ];
  }
  if (domain === "social") {
    return [
      "Set one simple participation role before the activity starts so expectations feel predictable.",
      "Coach one visible cooperation or turn-taking cue instead of correcting multiple social behaviors at once.",
      "Reinforce one successful interaction immediately to make the next repetition easier to repeat.",
    ];
  }
  if (domain === "mental") {
    return [
      "Keep the next session low-pressure and explicit, with one reset cue the child can use after difficulty.",
      "Name success as calm re-engagement, not only outcome or intensity.",
      "Pause early when frustration rises and restart with one simpler next action rather than repeated correction.",
    ];
  }
  if (recommendationTitle.toLowerCase().includes("recovery")) {
    return [
      "Lower the load for the next session and watch whether calm engagement returns before pushing progression.",
      "Build in one planned reset point instead of waiting for visible overload.",
      "Finish before fatigue overwhelms effort quality so the child can leave with control rather than depletion.",
    ];
  }
  return [
    "Keep the next session narrow and practical rather than broad.",
    "Choose one clear cue and one success marker for the child to repeat.",
    "Record briefly what helped most so the next cycle can build on the same support pattern.",
  ];
}

export function buildSessionFocusPriorities(input: {
  recommendationSummary: RecommendationSummary;
  progressSummary: ProgressComparisonSummary;
  plan?: DevelopmentPlan | null;
  supportWorkspace?: ChildSupportWorkspace | null;
}): SessionFocusPriority[] {
  const rankedPriorities: SessionFocusPriorityCandidate[] = input.recommendationSummary.recommendations
    .map((recommendation): SessionFocusPriorityCandidate => {
      const linkedPlanAssignments = (input.plan?.assignments || [])
        .filter((assignment) =>
          recommendation.focusItems.some((item) => assignment.focusAreaIds.includes(item.key))
          || assignment.title.toLowerCase().includes(recommendation.title.toLowerCase()),
        )
        .slice(0, 2)
        .map((assignment) => assignment.title);
      const linkedSupport = [
        ...(input.supportWorkspace?.coachTools || [])
          .filter((tool) => recommendation.domain ? tool.focusTags.some((tag) => tag.toLowerCase().includes(recommendation.domain!)) : true)
          .slice(0, 2)
          .map((tool) => tool.title),
        ...(input.supportWorkspace?.microLearning || [])
          .filter((sequence) => recommendation.focusItems.some((item) => sequence.focusArea.toLowerCase().includes(item.label.toLowerCase())))
          .slice(0, 1)
          .map((sequence) => sequence.title),
      ];

      const regressed = recommendation.domain
        ? input.progressSummary.domains.find((entry) => entry.key === recommendation.domain)?.direction === "regressed"
        : false;
      const whyNow = regressed
        ? `${recommendation.title} should shape the next session first because this domain is slipping compared with the earlier baseline.`
        : recommendation.severity === "high"
          ? `${recommendation.title} should shape the next session first because the current profile shows enough support pressure to prioritize stabilization before wider progression.`
          : `${recommendation.title} is the most practical next-session focus because it links directly to the child’s current measured support areas.`;

      return {
        id: recommendation.id,
        title: recommendation.title,
        urgency: basePriorityScore(recommendation, input.progressSummary) >= 8 ? "high" : basePriorityScore(recommendation, input.progressSummary) >= 4 ? "medium" : "low",
        domain: recommendation.domain,
        whyNow,
        sessionActions: actionsForDomain(recommendation.domain, recommendation.title),
        linkedPlanAssignments,
        linkedSupport: Array.from(new Set(linkedSupport)),
        score: basePriorityScore(recommendation, input.progressSummary),
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  const priorities: SessionFocusPriority[] = rankedPriorities.map((priority) => {
      const { score, ...rest } = priority;
      void score;
      return rest;
    });

  if (
    input.recommendationSummary.mentalWellbeing.riskLevel !== "low"
    && !priorities.some((entry) => entry.id === "wellbeing-regulation-priority")
  ) {
    priorities.unshift({
      id: "wellbeing-regulation-priority",
      title: "Protect recovery and emotional load in the next session",
      urgency: input.recommendationSummary.mentalWellbeing.riskLevel === "high" ? "high" : "medium",
      domain: "mental",
      whyNow: "The current wellbeing profile still shows enough stress, recovery strain, or concern signals that the next session should prioritize regulation before performance demands.",
      sessionActions: [
        "Shorten the demand window and add one planned reset before signs of overload become visible.",
        "Use one calm cue for re-entry and reward steady re-engagement more than output intensity.",
        "Document whether lower pressure improves attention, recovery, or cooperation for the next review.",
      ],
      linkedPlanAssignments: (input.plan?.assignments || []).filter((assignment) => assignment.title.toLowerCase().includes("mental") || assignment.title.toLowerCase().includes("self")).slice(0, 2).map((assignment) => assignment.title),
      linkedSupport: (input.supportWorkspace?.coachTools || []).slice(0, 1).map((tool) => tool.title),
    });
  }

  return priorities.slice(0, 3);
}
