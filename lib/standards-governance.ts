import type { StandardsAgeGroup, StandardsBenchmarkVariant, StandardsDomain, StandardsFormulaDefinition, StandardsVersion } from "@/lib/standards-config";
import { AGE_GROUPS, DOMAINS, getVariantForVersion } from "@/lib/standards-config";

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

function variantRows(variant: StandardsBenchmarkVariant) {
  return AGE_GROUPS.flatMap((ageGroup) => DOMAINS.map((domain) => variant[ageGroup][domain]));
}

export function summarizeVersionThresholds(version: StandardsVersion, variantName?: string) {
  const variant = getVariantForVersion(version, variantName);
  if (!variant) {
    return { averageTarget: 0, averageMinimum: 0 };
  }
  const rows = variantRows(variant);
  const targetTotal = rows.reduce((sum, row) => sum + row.target, 0);
  const minTotal = rows.reduce((sum, row) => sum + row.min, 0);

  return {
    averageTarget: Number((targetTotal / rows.length).toFixed(2)),
    averageMinimum: Number((minTotal / rows.length).toFixed(2)),
  };
}

export function validateStandardsVersion(version: StandardsVersion, variantName?: string): StandardsVersionIssue[] {
  const issues: StandardsVersionIssue[] = [];
  const variant = getVariantForVersion(version, variantName);
  if (!variant) {
    return [{ severity: "error", message: "No benchmark variant is configured for this version." }];
  }

  for (const ageGroup of AGE_GROUPS) {
    for (const domain of DOMAINS) {
      const row = variant[ageGroup][domain];
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
  if (!variant.meta?.label?.trim()) {
    issues.push({ severity: "warning", message: "Variant label is empty. Add a clear benchmark-set label." });
  }
  if (!variant.meta?.applicability?.trim()) {
    issues.push({ severity: "warning", message: "Variant applicability is empty. Explain when this benchmark set should be used." });
  }

  return issues;
}

export function computeReadinessImpactPreview(
  baselineVersion: StandardsVersion | undefined,
  candidateVersion: StandardsVersion | undefined,
  assessments: ReadinessImpactPreviewInput[],
  baselineVariantName?: string,
  candidateVariantName?: string,
) {
  if (!baselineVersion || !candidateVersion) return null;
  const baselineVariant = getVariantForVersion(baselineVersion, baselineVariantName);
  const candidateVariant = getVariantForVersion(candidateVersion, candidateVariantName);
  if (!baselineVariant || !candidateVariant) return null;

  let readyToDeveloping = 0;
  let developingToReady = 0;
  let total = 0;

  for (const assessment of assessments) {
    const ageGroup = assessment.child?.ageGroup as StandardsAgeGroup | undefined;
    const ski = assessment.computed?.ski;
    if (!ageGroup || !AGE_GROUPS.includes(ageGroup) || typeof ski !== "number") continue;

    total += 1;
    const baselineReady = ski >= baselineVariant[ageGroup].ski.min;
    const candidateReady = ski >= candidateVariant[ageGroup].ski.min;

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
