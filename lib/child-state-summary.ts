import type { RecommendationSummary, RecommendationStatus } from "@/lib/recommendations";
import type { AssessmentRecord } from "@/types/assessment";

export type ChildStateTone = "support_needed" | "mixed" | "steady" | "strength_led";
export type ChildStateConfidence = "low" | "medium" | "high";

export interface ChildStateDomainSummary {
  key: "movement" | "social" | "mental";
  label: string;
  average: number | null;
  status: RecommendationStatus;
  conductorLabel: string;
  parentLabel: string;
}

export interface ChildStateSummary {
  tone: ChildStateTone;
  confidence: ChildStateConfidence;
  readinessStatus: RecommendationStatus;
  conductorHeadline: string;
  conductorSummary: string;
  parentHeadline: string;
  parentSummary: string;
  supportPressure: "low" | "medium" | "high";
  domains: ChildStateDomainSummary[];
  focusLabels: string[];
  strengthLabels: string[];
  limitations: string[];
}

function toneHeadlines(tone: ChildStateTone) {
  if (tone === "support_needed") {
    return {
      conductor: "Current state shows clear support pressure",
      parent: "Right now your child needs closer support",
    };
  }
  if (tone === "mixed") {
    return {
      conductor: "Current state is mixed with a few important support areas",
      parent: "Your child has a good base with a few areas needing extra help",
    };
  }
  if (tone === "steady") {
    return {
      conductor: "Current state is broadly steady with focused growth areas",
      parent: "Your child is broadly steady and building toward the next step",
    };
  }
  return {
    conductor: "Current state is strong and ready for progression",
    parent: "Your child is showing strong progress right now",
  };
}

function domainConductorLabel(status: RecommendationStatus) {
  if (status === "below_min") return "support needed";
  if (status === "developing") return "developing";
  if (status === "ready") return "ready";
  return "limited data";
}

function domainParentLabel(status: RecommendationStatus) {
  if (status === "below_min") return "needs extra support";
  if (status === "developing") return "building";
  if (status === "ready") return "steady";
  return "still being observed";
}

function supportPressure(summary: RecommendationSummary): "low" | "medium" | "high" {
  if (summary.mentalWellbeing.riskLevel === "high") return "high";
  if (
    summary.mentalWellbeing.riskLevel === "medium"
    || (typeof summary.mentalWellbeing.recoveryAverage === "number" && summary.mentalWellbeing.recoveryAverage < 3)
  ) return "medium";
  return "low";
}

function determineTone(summary: RecommendationSummary): ChildStateTone {
  const belowMin = summary.domainBenchmarks.filter((entry) => entry.status === "below_min").length;
  const developing = summary.domainBenchmarks.filter((entry) => entry.status === "developing").length;
  const pressure = supportPressure(summary);

  if (pressure === "high" || belowMin >= 2) return "support_needed";
  if (belowMin >= 1 || pressure === "medium" || developing >= 2) return "mixed";
  if (developing >= 1) return "steady";
  return "strength_led";
}

function determineConfidence(record: AssessmentRecord, summary: RecommendationSummary, historyCount: number): ChildStateConfidence {
  const completionRatio = record.computed.completion.total > 0
    ? record.computed.completion.done / record.computed.completion.total
    : 0;
  if (completionRatio < 0.65 || summary.confidenceContext.lowConfidenceCount >= 3) return "low";
  if (
    completionRatio < 1
    || summary.confidenceContext.lowConfidenceCount >= 1
    || summary.confidenceContext.missingConfidenceCount >= 2
    || (typeof summary.mentalWellbeing.disagreementIndex === "number" && summary.mentalWellbeing.disagreementIndex >= 1.5)
    || historyCount < 2
  ) return "medium";
  return "high";
}

function buildLimitations(record: AssessmentRecord, summary: RecommendationSummary, historyCount: number): string[] {
  const limitations: string[] = [];
  const completionRatio = record.computed.completion.total > 0
    ? record.computed.completion.done / record.computed.completion.total
    : 0;
  if (completionRatio < 1) {
    limitations.push(`Assessment completion is ${record.computed.completion.done}/${record.computed.completion.total}, so the current state should be read with some caution.`);
  }
  if (historyCount < 2) {
    limitations.push("There is not enough history yet for a stable change-over-time interpretation.");
  }
  if (typeof summary.mentalWellbeing.disagreementIndex === "number" && summary.mentalWellbeing.disagreementIndex >= 1.5) {
    limitations.push("Child, observer, and caregiver views differ meaningfully, so the next follow-up should clarify context before overinterpreting the result.");
  }
  if (summary.confidenceContext.lowConfidenceCount > 0) {
    limitations.push(`The scorer marked ${summary.confidenceContext.lowConfidenceCount} item${summary.confidenceContext.lowConfidenceCount === 1 ? "" : "s"} as low-confidence, so the current interpretation should be confirmed with another observed cycle.`);
  }
  if (summary.confidenceContext.missingConfidenceCount > 0) {
    limitations.push(`Confidence was not recorded for ${summary.confidenceContext.missingConfidenceCount} scored item${summary.confidenceContext.missingConfidenceCount === 1 ? "" : "s"}, which reduces interpretive reliability.`);
  }
  return limitations;
}

function composeConductorSummary(summary: RecommendationSummary, tone: ChildStateTone, confidence: ChildStateConfidence, limitations: string[]) {
  const focus = summary.focusAreas.slice(0, 2).map((item) => item.label).join(", ");
  const strengths = summary.strengths.slice(0, 2).map((item) => item.label).join(", ");
  const pressure = supportPressure(summary);
  const base = tone === "support_needed"
    ? "The child is showing enough pressure or benchmark miss that the next cycle should prioritize stabilization before broader progression."
    : tone === "mixed"
      ? "The child has a mixed profile: some strengths are visible, but the next cycle should stay targeted rather than broad."
      : tone === "steady"
        ? "The child is broadly stable and can progress with a narrow improvement focus."
        : "The child is showing a strong current profile and can move into the next progression step with routine monitoring.";
  const focusLine = focus ? ` Main support focus: ${focus}.` : "";
  const strengthLine = strengths ? ` Current strengths: ${strengths}.` : "";
  const pressureLine = pressure !== "low" ? ` Support pressure is currently ${pressure}.` : "";
  const confidenceLine = confidence !== "high" ? ` Interpretation confidence is ${confidence}.` : "";
  const limitationLine = limitations[0] ? ` ${limitations[0]}` : "";
  return `${base}${focusLine}${strengthLine}${pressureLine}${confidenceLine}${limitationLine}`.trim();
}

function composeParentSummary(summary: RecommendationSummary, tone: ChildStateTone, confidence: ChildStateConfidence, limitations: string[]) {
  const focus = summary.focusAreas.slice(0, 2).map((item) => item.label.toLowerCase()).join(" and ");
  const strengths = summary.strengths.slice(0, 2).map((item) => item.label.toLowerCase()).join(" and ");
  const base = tone === "support_needed"
    ? "Right now your child would benefit from closer, calmer support before expectations increase."
    : tone === "mixed"
      ? "Your child is showing a good base, but a few areas need more support and repetition right now."
      : tone === "steady"
        ? "Your child is showing a steady current profile and can keep building with focused support."
        : "Your child is showing a strong current profile and can keep progressing with steady support.";
  const focusLine = focus ? ` The next support focus is mainly around ${focus}.` : "";
  const strengthLine = strengths ? ` Current strengths are showing in ${strengths}.` : "";
  const confidenceLine = confidence === "low"
    ? " Some parts of this picture are still incomplete, so the next assessment will help confirm it."
    : confidence === "medium"
      ? " Some parts of this picture still need follow-up to confirm the pattern."
      : "";
  const limitationLine = limitations.some((entry) => entry.includes("history"))
    ? " We still need more than one cycle to understand long-term change clearly."
    : "";
  return `${base}${focusLine}${strengthLine}${confidenceLine}${limitationLine}`.trim();
}

export function buildChildStateSummary(record: AssessmentRecord, summary: RecommendationSummary, historyCount: number): ChildStateSummary {
  const tone = determineTone(summary);
  const confidence = determineConfidence(record, summary, historyCount);
  const limitations = buildLimitations(record, summary, historyCount);
  const headlines = toneHeadlines(tone);

  return {
    tone,
    confidence,
    readinessStatus: summary.readinessStatus,
    conductorHeadline: headlines.conductor,
    conductorSummary: composeConductorSummary(summary, tone, confidence, limitations),
    parentHeadline: headlines.parent,
    parentSummary: composeParentSummary(summary, tone, confidence, limitations),
    supportPressure: supportPressure(summary),
    domains: summary.domainBenchmarks.map((entry) => ({
      key: entry.domain,
      label: entry.label,
      average: entry.average,
      status: entry.status,
      conductorLabel: domainConductorLabel(entry.status),
      parentLabel: domainParentLabel(entry.status),
    })),
    focusLabels: summary.focusAreas.slice(0, 3).map((item) => item.label),
    strengthLabels: summary.strengths.slice(0, 3).map((item) => item.label),
    limitations,
  };
}
