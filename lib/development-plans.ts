import type { RecommendationSummary } from "@/lib/recommendations";

export type PlanAssignmentAudience = "child" | "family" | "practitioner";
export type PlanAssignmentStatus = "pending" | "in_progress" | "done";

export interface DevelopmentPlanAssignment {
  id: string;
  title: string;
  notes: string;
  audience: PlanAssignmentAudience;
  status: PlanAssignmentStatus;
  dueDate?: string;
  focusAreaIds: string[];
}

export interface DevelopmentPlanCheckpoint {
  id: string;
  title: string;
  dueDate?: string;
  notes: string;
  completed: boolean;
}

export interface DevelopmentPlan {
  _id?: string;
  childId: string;
  assessmentId?: string;
  institutionId?: string;
  standardsVersionUsed?: string;
  status: "draft" | "active" | "completed";
  summary: string;
  assignments: DevelopmentPlanAssignment[];
  checkpoints: DevelopmentPlanCheckpoint[];
  progressNotes: string;
  createdAt: string;
  updatedAt: string;
  createdByUserEmail?: string;
}

function plusDays(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function audienceForIndex(index: number): PlanAssignmentAudience {
  if (index % 3 === 0) return "practitioner";
  if (index % 3 === 1) return "family";
  return "child";
}

function assignmentCopy(audience: PlanAssignmentAudience, title: string): string {
  if (audience === "family") return `Use ${title.toLowerCase()} as a short home routine and note what felt easier or harder.`;
  if (audience === "child") return `Practice ${title.toLowerCase()} in a playful, low-pressure way between sessions.`;
  return `Reinforce ${title.toLowerCase()} in the next coached session and record brief progress notes.`;
}

function moduleAssignmentNotes(audience: PlanAssignmentAudience, moduleTitle: string): string {
  if (audience === "family") return `Use ${moduleTitle.toLowerCase()} as a short home routine and keep the language calm, practical, and non-judgmental.`;
  if (audience === "child") return `Practice ${moduleTitle.toLowerCase()} in one short, low-pressure moment between sessions.`;
  return `Model ${moduleTitle.toLowerCase()} in the next session and record what support level was needed.`;
}

export function buildSuggestedDevelopmentPlan(input: {
  childId: string;
  assessmentId?: string;
  institutionId?: string;
  createdByUserEmail?: string;
  recommendationSummary: RecommendationSummary;
}): DevelopmentPlan {
  const createdAt = new Date().toISOString();
  const recommendationTargets = input.recommendationSummary.recommendations.slice(0, 3);
  const assignments = recommendationTargets.map((recommendation, index) => {
    const audience = audienceForIndex(index);
    const firstFocus = recommendation.focusItems[0];
    const title = firstFocus
      ? `${recommendation.title}: ${firstFocus.label}`
      : recommendation.title;
    return {
      id: `assignment-${index + 1}`,
      title,
      notes: assignmentCopy(audience, title),
      audience,
      status: "pending" as const,
      dueDate: plusDays(7 * (index + 1)),
      focusAreaIds: recommendation.focusItems.map((item) => item.key),
    };
  });

  const wellbeingAssignments = (input.recommendationSummary.mentalWellbeing?.goalModules || []).slice(0, 3).map((moduleTitle, index) => {
    const audience = audienceForIndex(index + assignments.length);
    return {
      id: `wellbeing-assignment-${index + 1}`,
      title: moduleTitle,
      notes: moduleAssignmentNotes(audience, moduleTitle),
      audience,
      status: "pending" as const,
      dueDate: plusDays(5 + index * 7),
      focusAreaIds: [`wellbeing-module-${index + 1}`],
    };
  });

  const checkpoints: DevelopmentPlanCheckpoint[] = [
    {
      id: "checkpoint-1",
      title: "2-week review",
      dueDate: plusDays(14),
      notes: "Confirm whether assignments were realistic, whether recovery context changed, and whether one focus area should be narrowed.",
      completed: false,
    },
    {
      id: "checkpoint-2",
      title: "Next assessment review",
      dueDate: plusDays(30),
      notes: "Review progress against the current plan, including mental-skills growth and wellbeing signals, before or during the next assessment cycle.",
      completed: false,
    },
  ];

  const focusSummary = input.recommendationSummary.focusAreas.map((item) => item.label).join(", ");
  const moduleSummary = input.recommendationSummary.mentalWellbeing?.goalModules?.join(", ") || "";
  return {
    childId: input.childId,
    assessmentId: input.assessmentId,
    institutionId: input.institutionId,
    standardsVersionUsed: input.recommendationSummary.standardsVersionUsed,
    status: "draft",
    summary: focusSummary
      ? `Current plan targets: ${focusSummary}${moduleSummary ? `, with guided practice in ${moduleSummary}` : ""}. Keep family-facing language practical, supportive, and non-diagnostic.`
      : "Use this plan to translate the latest support recommendations into realistic weekly actions.",
    assignments: [...assignments, ...wellbeingAssignments].slice(0, 6),
    checkpoints,
    progressNotes: "",
    createdAt,
    updatedAt: createdAt,
    createdByUserEmail: input.createdByUserEmail,
  };
}
