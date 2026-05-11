import { sectionsForMode } from "@/lib/kidex-schema";
import type { StandardsFormulaDefinition } from "@/lib/standards-config";
import type { AssessmentPayload, AssessmentRecord } from "@/types/assessment";

const DEFAULT_FORMULA: StandardsFormulaDefinition = {
  domainWeights: {
    movement: 0.5,
    social: 0.3,
    mental: 0.2,
  },
  readinessMetric: "ski",
  readinessThreshold: "min",
  aspirationThreshold: "target",
};

export function computeAssessment(
  payload: AssessmentPayload,
  formula: StandardsFormulaDefinition = DEFAULT_FORMULA,
): AssessmentRecord["computed"] {
  const sections = sectionsForMode(payload.mode);
  
  // Calculate averages by domain
  const domainValues: Record<string, number[]> = {
    movement: [],
    social: [],
    mental: []
  };

  sections.forEach((section) => {
    section.items.forEach((item) => {
      const score = payload.scores[item.key]?.score;
      if (typeof score === "number" && score >= 1 && score <= 6) {
        domainValues[section.domain].push(score);
      }
    });
  });

  const averages = {
    movement: domainValues.movement.length ? domainValues.movement.reduce((a, b) => a + b, 0) / domainValues.movement.length : null,
    social: domainValues.social.length ? domainValues.social.reduce((a, b) => a + b, 0) / domainValues.social.length : null,
    mental: domainValues.mental.length ? domainValues.mental.reduce((a, b) => a + b, 0) / domainValues.mental.length : null
  };

  const allItems = sections.flatMap((section) => section.items);
  const done = allItems.filter((item) => {
    const score = payload.scores[item.key]?.score;
    return typeof score === "number" && score >= 1 && score <= 6;
  }).length;

  const ski = averages.movement === null || averages.social === null || averages.mental === null
    ? null
    : Number((
      averages.movement * formula.domainWeights.movement
      + averages.social * formula.domainWeights.social
      + averages.mental * formula.domainWeights.mental
    ).toFixed(4));

  return {
    movementAverage: averages.movement,
    socialAverage: averages.social,
    mentalAverage: averages.mental,
    ski,
    completion: { done, total: allItems.length }
  };
}
