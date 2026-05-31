import { sectionsForMode } from "@/lib/kidex-schema";
import type { AssessmentPayload, AssessmentQualityReason, AssessmentQualitySummary } from "@/types/assessment";

const QUALITY_THRESHOLDS = {
  ready: 80,
  review: 60,
  minimumCoverage: 0.85,
  lowConfidenceRatio: 0.35,
  domainVariance: 1.75,
};

const REASON_MESSAGES: Record<AssessmentQualityReason["code"], string> = {
  low_domain_coverage: "Too many expected observation items are still unscored for a strong interpretation.",
  low_scorer_confidence: "A high share of scored items were marked low-confidence, so interpretation should be reviewed.",
  missing_observer_context: "Session observer or conductor context is missing, which weakens traceability.",
  missing_evidence: "No evidence attachment is linked to this measurement session.",
  large_domain_variance: "The measured domains are far apart, so the result needs conductor review before parent-facing use.",
  quality_derivation_failed: "Quality could not be derived safely, so this assessment needs review.",
};

function reason(code: AssessmentQualityReason["code"], severity: AssessmentQualityReason["severity"]): AssessmentQualityReason {
  return {
    code,
    severity,
    messageKey: `assessmentQuality.${code}`,
    message: REASON_MESSAGES[code],
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function validScore(value: unknown): value is number {
  return typeof value === "number" && value >= 1 && value <= 6;
}

function domainValues(payload: AssessmentPayload) {
  const values = {
    movement: [] as number[],
    social: [] as number[],
    mental: [] as number[],
  };

  for (const section of sectionsForMode(payload.mode)) {
    for (const item of section.items) {
      const score = payload.scores[item.key]?.score;
      if (validScore(score)) values[item.domain].push(score);
    }
  }

  return values;
}

function average(values: number[]) {
  return values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function domainVariance(payload: AssessmentPayload) {
  const values = domainValues(payload);
  const averages = [average(values.movement), average(values.social), average(values.mental)].filter((value): value is number => typeof value === "number");
  if (averages.length < 2) return 0;
  return Math.max(...averages) - Math.min(...averages);
}

export function evaluateAssessmentQuality(payload: AssessmentPayload, computedAt = new Date().toISOString()): AssessmentQualitySummary {
  try {
    const sections = sectionsForMode(payload.mode);
    const items = sections.flatMap((section) => section.items);
    const scoredEntries = items
      .map((item) => payload.scores[item.key])
      .filter((entry) => validScore(entry?.score));
    const coverage = items.length > 0 ? scoredEntries.length / items.length : 0;
    const lowConfidenceCount = scoredEntries.filter((entry) => entry.confidence === "low").length;
    const missingConfidenceCount = scoredEntries.filter((entry) => !entry.confidence).length;
    const lowConfidenceRatio = scoredEntries.length > 0 ? (lowConfidenceCount + missingConfidenceCount * 0.5) / scoredEntries.length : 1;
    const variance = domainVariance(payload);
    const reasons: AssessmentQualityReason[] = [];

    if (coverage < QUALITY_THRESHOLDS.minimumCoverage) reasons.push(reason("low_domain_coverage", "blocking"));
    if (lowConfidenceRatio >= QUALITY_THRESHOLDS.lowConfidenceRatio) reasons.push(reason("low_scorer_confidence", "warning"));
    if (!payload.session.conductor.trim() || !payload.session.observers.trim()) reasons.push(reason("missing_observer_context", "warning"));
    if ((payload.attachments || []).length === 0) reasons.push(reason("missing_evidence", "warning"));
    if (variance >= QUALITY_THRESHOLDS.domainVariance) reasons.push(reason("large_domain_variance", "warning"));

    const coveragePenalty = Math.round((1 - coverage) * 45);
    const confidencePenalty = Math.round(lowConfidenceRatio * 25);
    const evidencePenalty = (payload.attachments || []).length === 0 ? 10 : 0;
    const contextPenalty = !payload.session.conductor.trim() || !payload.session.observers.trim() ? 10 : 0;
    const variancePenalty = variance >= QUALITY_THRESHOLDS.domainVariance ? 10 : 0;
    const score = clamp(100 - coveragePenalty - confidencePenalty - evidencePenalty - contextPenalty - variancePenalty, 0, 100);
    const hasBlockingReason = reasons.some((item) => item.severity === "blocking");
    const state = hasBlockingReason || score < QUALITY_THRESHOLDS.review
      ? "insufficient"
      : score < QUALITY_THRESHOLDS.ready
        ? "review_needed"
        : "ready";

    return { score, state, reasons, computedAt };
  } catch {
    return {
      score: 0,
      state: "review_needed",
      reasons: [reason("quality_derivation_failed", "warning")],
      computedAt,
    };
  }
}

export function qualityBadgeColor(state: AssessmentQualitySummary["state"]) {
  if (state === "ready") return "teal";
  if (state === "review_needed") return "yellow";
  return "red";
}

export function qualityStateLabel(state: AssessmentQualitySummary["state"]) {
  if (state === "ready") return "Ready";
  if (state === "review_needed") return "Review needed";
  return "Insufficient";
}
