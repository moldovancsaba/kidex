import type { ScoreSection } from "@/lib/kidex-schema";
import type { AssessmentDomain, AssessmentPayload, ScoreItemDefinition } from "@/types/assessment";

export interface AssessmentItemGuidance {
  lookFor: string;
  scoreAnchors: Array<{ label: string; description: string }>;
  driftPrompt: string;
}

export interface AssessmentConsistencySummary {
  scoredCount: number;
  lowConfidenceCount: number;
  mediumConfidenceCount: number;
  highConfidenceCount: number;
  missingConfidenceCount: number;
  lowConfidenceWithoutNote: string[];
  lowConfidenceItems: string[];
}

function domainLookFor(domain: AssessmentDomain): string {
  if (domain === "movement") return "Look for repeatable body control, not one isolated success.";
  if (domain === "social") return "Look for how the child responds with others across more than one interaction.";
  return "Look for attention, understanding, and self-correction across repeated moments, not one instant.";
}

function domainDriftPrompt(domain: AssessmentDomain): string {
  if (domain === "movement") return "If performance changed by context, score the most typical repeated pattern rather than the best single attempt.";
  if (domain === "social") return "If behaviour changed by partner or pressure level, score the most typical social response rather than the most extreme moment.";
  return "If understanding or regulation changed by task difficulty, score the most stable pattern rather than the strongest or weakest moment alone.";
}

export function guidanceForItem(item: ScoreItemDefinition): AssessmentItemGuidance {
  return {
    lookFor: domainLookFor(item.domain),
    scoreAnchors: [
      { label: "1-2", description: "Not yet stable, rarely shown, or only seen with heavy adult help." },
      { label: "3-4", description: "Emerging and visible, but still inconsistent across repetitions or contexts." },
      { label: "5-6", description: "Clear, repeatable, and adaptable with less adult correction." },
    ],
    driftPrompt: domainDriftPrompt(item.domain),
  };
}

export function buildAssessmentConsistencySummary(
  assessment: AssessmentPayload,
  sections: ScoreSection[],
  translateSchema: (key: string) => string,
): AssessmentConsistencySummary {
  const scoredItems = sections.flatMap((section) => section.items).map((item) => ({
    item,
    entry: assessment.scores[item.key],
  })).filter(({ entry }) => typeof entry?.score === "number");

  const lowConfidenceEntries = scoredItems.filter(({ entry }) => entry?.confidence === "low");

  return {
    scoredCount: scoredItems.length,
    lowConfidenceCount: scoredItems.filter(({ entry }) => entry?.confidence === "low").length,
    mediumConfidenceCount: scoredItems.filter(({ entry }) => entry?.confidence === "medium").length,
    highConfidenceCount: scoredItems.filter(({ entry }) => entry?.confidence === "high").length,
    missingConfidenceCount: scoredItems.filter(({ entry }) => !entry?.confidence).length,
    lowConfidenceWithoutNote: lowConfidenceEntries
      .filter(({ entry }) => !entry?.note?.trim())
      .map(({ item }) => translateSchema(`${item.key}.title`)),
    lowConfidenceItems: lowConfidenceEntries
      .map(({ item }) => translateSchema(`${item.key}.title`))
      .slice(0, 5),
  };
}
