import type { StandardsAgeGroup, StandardsDomain, StandardsFormulaDefinition, StandardsVersion } from "@/lib/standards-config";
import { AGE_GROUPS, DOMAINS } from "@/lib/standards-config";

const SCORING_DOMAINS: readonly Exclude<StandardsDomain, "ski">[] = ["movement", "social", "mental"];

export interface StandardsVersionIssue {
  severity: "error" | "warning";
  message: string;
}

export interface ReadinessImpactPreviewInput {
  child?: {
    ageGroup?: string;
  };
  computed?: {
    ski?: number | null;
  };
}

export function summarizeVersionThresholds(version: StandardsVersion) {
  const rows = AGE_GROUPS.flatMap((ageGroup) => DOMAINS.map((domain) => version[ageGroup][domain]));
  const targetTotal = rows.reduce((sum, row) => sum + row.target, 0);
  const minTotal = rows.reduce((sum, row) => sum + row.min, 0);

  return {
    averageTarget: Number((targetTotal / rows.length).toFixed(2)),
    averageMinimum: Number((minTotal / rows.length).toFixed(2)),
  };
}

export function validateStandardsVersion(version: StandardsVersion): StandardsVersionIssue[] {
  const issues: StandardsVersionIssue[] = [];

  for (const ageGroup of AGE_GROUPS) {
    for (const domain of DOMAINS) {
      const row = version[ageGroup][domain];
      if (!Number.isFinite(row.target) || !Number.isFinite(row.min)) {
        issues.push({ severity: "error", message: `${ageGroup} ${domain} contains a non-numeric threshold.` });
        continue;
      }
      if (row.target < 0 || row.min < 0) {
        issues.push({ severity: "error", message: `${ageGroup} ${domain} thresholds cannot be negative.` });
      }
      if (row.min > row.target) {
        issues.push({ severity: "error", message: `${ageGroup} ${domain} minimum is greater than target.` });
      }
      if (row.target > 6 || row.min > 6) {
        issues.push({ severity: "warning", message: `${ageGroup} ${domain} exceeds the current 1-6 scoring scale.` });
      }
    }
  }

  const weights = version.formula?.domainWeights;
  if (weights) {
    const total = weights.movement + weights.social + weights.mental;
    if (SCORING_DOMAINS.some((domain) => weights[domain] < 0)) {
      issues.push({ severity: "error", message: "Formula weights cannot be negative." });
    }
    if (Math.abs(total - 1) > 0.0015) {
      issues.push({ severity: "warning", message: "Formula weights should sum to 1. They will be normalized on save." });
    }
  }

  if (!version.meta?.notes?.trim()) {
    issues.push({ severity: "warning", message: "Version notes are empty. Add rationale before publishing." });
  }

  return issues;
}

export function computeReadinessImpactPreview(
  baselineVersion: StandardsVersion | undefined,
  candidateVersion: StandardsVersion | undefined,
  assessments: ReadinessImpactPreviewInput[],
) {
  if (!baselineVersion || !candidateVersion) return null;

  let readyToDeveloping = 0;
  let developingToReady = 0;
  let total = 0;

  for (const assessment of assessments) {
    const ageGroup = assessment.child?.ageGroup as StandardsAgeGroup | undefined;
    const ski = assessment.computed?.ski;
    if (!ageGroup || !AGE_GROUPS.includes(ageGroup) || typeof ski !== "number") continue;

    total += 1;
    const baselineReady = ski >= baselineVersion[ageGroup].ski.min;
    const candidateReady = ski >= candidateVersion[ageGroup].ski.min;

    if (baselineReady && !candidateReady) readyToDeveloping += 1;
    if (!baselineReady && candidateReady) developingToReady += 1;
  }

  return { readyToDeveloping, developingToReady, total };
}

export function formulaWeightPercentages(formula: StandardsFormulaDefinition | undefined) {
  const weights = formula?.domainWeights || { movement: 0.5, social: 0.3, mental: 0.2 };
  return {
    movement: Number((weights.movement * 100).toFixed(1)),
    social: Number((weights.social * 100).toFixed(1)),
    mental: Number((weights.mental * 100).toFixed(1)),
  };
}
