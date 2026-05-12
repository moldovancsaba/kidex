import { sectionsForMode } from "@/lib/kidex-schema";
import { wellbeingGoalLabel, wellbeingRiskSignalLabel } from "@/lib/mental-wellbeing";
import type { AgeGroupStandard } from "@/lib/standards";
import type { AssessmentDomain, AssessmentRecord } from "@/types/assessment";

export type RecommendationStatus = "below_min" | "developing" | "ready" | "insufficient_data";

export interface RecommendationItem {
  key: string;
  label: string;
  score: number;
  domain: AssessmentDomain;
}

export interface DomainRecommendation {
  domain: AssessmentDomain;
  label: string;
  average: number | null;
  min: number;
  target: number;
  status: RecommendationStatus;
  gapToMin: number | null;
  gapToTarget: number | null;
}

export interface RecommendationEvidence {
  type: "benchmark" | "observation" | "trend";
  label: string;
  detail: string;
  strength: "high" | "medium" | "low";
}

export interface RecommendationSummary {
  readinessStatus: RecommendationStatus;
  standardsVersionUsed?: string;
  standardsVariantUsed?: string;
  mentalWellbeing: {
    phase: "baseline" | "follow_up";
    mentalSkillsAverage: number | null;
    baselineMentalSkillsAverage: number | null;
    checkInAverage: number | null;
    recoveryAverage: number | null;
    disagreementIndex: number | null;
    riskLevel: "low" | "medium" | "high";
    goalModules: string[];
    flaggedSignals: string[];
  };
  ski: {
    current: number | null;
    baseline: number | null;
    min: number;
    target: number;
    gapToMin: number | null;
    gapToTarget: number | null;
  };
  domainBenchmarks: DomainRecommendation[];
  strengths: RecommendationItem[];
  focusAreas: RecommendationItem[];
  recommendations: Array<{
    id: string;
    title: string;
    rationale: string;
    domain?: AssessmentDomain;
    severity: "high" | "medium" | "low";
    evidenceStrength: "high" | "medium" | "low";
    focusItems: RecommendationItem[];
    sourceEvidence: RecommendationEvidence[];
  }>;
}

type RecommendationEntry = RecommendationSummary["recommendations"][number];

function domainAverage(record: AssessmentRecord, domain: AssessmentDomain): number | null {
  if (domain === "movement") return record.computed.movementAverage;
  if (domain === "social") return record.computed.socialAverage;
  return record.computed.mentalAverage;
}

function statusForScore(score: number | null, min: number, target: number): RecommendationStatus {
  if (score === null) return "insufficient_data";
  if (score < min) return "below_min";
  if (score < target) return "developing";
  return "ready";
}

function gap(value: number | null, threshold: number): number | null {
  if (value === null) return null;
  return Number((threshold - value).toFixed(2));
}

function severityForStatus(status: RecommendationStatus): "high" | "medium" | "low" {
  if (status === "below_min") return "high";
  if (status === "developing") return "medium";
  return "low";
}

function evidenceStrength(entry: DomainRecommendation, focusItems: RecommendationItem[]): "high" | "medium" | "low" {
  if (entry.status === "below_min" && focusItems.length >= 1) return "high";
  if (entry.status === "developing") return "medium";
  return "low";
}

export function buildRecommendationSummary(
  record: AssessmentRecord,
  history: AssessmentRecord[],
  benchmark: AgeGroupStandard | null,
  translateSchema: (key: string) => string,
): RecommendationSummary {
  const baseline = history.length > 0 ? history[history.length - 1] : null;
  const wellbeing = record.computed.mentalWellbeing;
  const baselineWellbeing = baseline?.computed.mentalWellbeing ?? null;
  const sections = sectionsForMode(record.mode);
  const scoredItems = sections.flatMap((section) =>
    section.items
      .map((item) => {
        const score = record.scores[item.key]?.score;
        return typeof score === "number"
          ? {
              key: item.key,
              label: translateSchema(`${item.key}.title`),
              score,
              domain: item.domain,
            }
          : null;
      })
      .filter((item): item is RecommendationItem => Boolean(item)),
  );

  const strengths = [...scoredItems].sort((a, b) => b.score - a.score).slice(0, 3);
  const focusAreas = [...scoredItems].sort((a, b) => a.score - b.score).slice(0, 5);

  const domains: AssessmentDomain[] = ["movement", "social", "mental"];
  const domainBenchmarks = domains.map((domain) => {
    const standard = benchmark?.[domain];
    const average = domainAverage(record, domain);
    const min = standard?.min ?? 0;
    const target = standard?.target ?? 0;
    return {
      domain,
      label: translateSchema(domain),
      average,
      min,
      target,
      status: statusForScore(average, min, target),
      gapToMin: gap(average, min),
      gapToTarget: gap(average, target),
    } satisfies DomainRecommendation;
  });

  const recommendationEntries: RecommendationEntry[] = domainBenchmarks
    .filter((entry) => entry.status !== "ready" && entry.status !== "insufficient_data")
    .map((entry) => {
      const focusItemsForDomain = focusAreas.filter((item) => item.domain === entry.domain).slice(0, 2);
      const title = entry.status === "below_min"
        ? `${entry.label} stabilization`
        : `${entry.label} consolidation`;
      const rationale = entry.status === "below_min"
        ? `${entry.label} is below the minimum benchmark for this age band and should be prioritized in the next cycle.`
        : `${entry.label} is above the minimum benchmark but still below target, so this is the best area for guided improvement.`;
      const sourceEvidence: RecommendationEvidence[] = [
        {
          type: "benchmark",
          label: `${entry.label} benchmark`,
          detail: `${entry.label} average ${entry.average === null ? "not recorded" : entry.average.toFixed(2)} against minimum ${entry.min.toFixed(2)} and target ${entry.target.toFixed(2)}.`,
          strength: entry.status === "below_min" ? "high" : "medium",
        },
        ...focusItemsForDomain.map((item) => ({
          type: "observation" as const,
          label: item.label,
          detail: `${item.label} scored ${item.score}, which contributes to the ${entry.label.toLowerCase()} recommendation.`,
          strength: item.score <= 2 ? ("high" as const) : ("medium" as const),
        })),
        ...(baseline && entry.average !== null
          ? [{
              type: "trend" as const,
              label: `${entry.label} trend`,
              detail: `${entry.label} moved from ${domainAverage(baseline, entry.domain)?.toFixed(2) ?? "n/a"} at baseline to ${entry.average.toFixed(2)} in the current record.`,
              strength: "low" as const,
            }]
          : []),
      ];

      return {
        id: `${entry.domain}-${entry.status}`,
        title,
        rationale,
        domain: entry.domain,
        severity: severityForStatus(entry.status),
        evidenceStrength: evidenceStrength(entry, focusItemsForDomain),
        focusItems: focusItemsForDomain,
        sourceEvidence,
      };
    });

  if (typeof wellbeing.mentalSkillsAverage === "number" && wellbeing.mentalSkillsAverage < 3.5) {
    recommendationEntries.push({
      id: "mental-growth-baseline",
      title: wellbeing.phase === "baseline" ? "Mental skills baseline support" : "Mental skills follow-up support",
      rationale: wellbeing.phase === "baseline"
        ? "The mental skills baseline shows that self-management support should be built into the next cycle before expectations increase."
        : "The current follow-up still shows room to strengthen everyday coping tools and confidence under challenge.",
      domain: "mental",
      severity: wellbeing.mentalSkillsAverage < 2.75 ? "high" : "medium",
      evidenceStrength: "high",
      focusItems: focusAreas.filter((item) => item.domain === "mental").slice(0, 2),
      sourceEvidence: [
        {
          type: "benchmark",
          label: "Mental skills profile",
          detail: `Current mental skills average is ${wellbeing.mentalSkillsAverage.toFixed(2)}${typeof baselineWellbeing?.mentalSkillsAverage === "number" ? ` compared with ${baselineWellbeing.mentalSkillsAverage.toFixed(2)} at the earliest recorded baseline.` : ""}`,
          strength: "high",
        },
        ...(typeof wellbeing.disagreementIndex === "number"
          ? [{
              type: "observation" as const,
              label: "Perspective disagreement",
              detail: `Child, observer, and caregiver ratings differ by ${wellbeing.disagreementIndex.toFixed(2)} on average, so support should stay collaborative and explicit.`,
              strength: wellbeing.disagreementIndex >= 2 ? "high" as const : "medium" as const,
            }]
          : []),
      ],
    });
  }

  if (typeof wellbeing.recoveryAverage === "number" && wellbeing.recoveryAverage < 3.25) {
    recommendationEntries.push({
      id: "recovery-support",
      title: "Recovery and load adjustment support",
      rationale: "Recent recovery signals suggest the child may need lighter expectations, closer observation, and a simpler recovery routine before pushing progression.",
      severity: wellbeing.recoveryAverage < 2.5 ? "high" : "medium",
      evidenceStrength: "high",
      focusItems: [],
      sourceEvidence: [
        {
          type: "trend",
          label: "Recovery profile",
          detail: `Recovery average is ${wellbeing.recoveryAverage.toFixed(2)} based on sleep quality, fatigue, and soreness check-ins.`,
          strength: "high",
        },
        ...(typeof wellbeing.checkInAverage === "number"
          ? [{
              type: "observation" as const,
              label: "Overall check-in",
              detail: `Overall wellbeing check-in average is ${wellbeing.checkInAverage.toFixed(2)}.`,
              strength: "medium" as const,
            }]
          : []),
      ],
    });
  }

  if (wellbeing.riskLevel !== "low" || wellbeing.flaggedSignals.length > 0) {
    recommendationEntries.push({
      id: "wellbeing-escalation",
      title: wellbeing.riskLevel === "high" ? "Immediate wellbeing follow-up" : "Structured wellbeing follow-up",
      rationale: wellbeing.riskLevel === "high"
        ? "The current wellbeing pattern includes concern signals that should trigger timely adult follow-up and documented next steps."
        : "The current wellbeing pattern should be reviewed in the next support conversation so adults can adjust expectations and check context.",
      severity: wellbeing.riskLevel === "high" ? "high" : "medium",
      evidenceStrength: wellbeing.riskLevel === "high" ? "high" : "medium",
      focusItems: [],
      sourceEvidence: [
        ...wellbeing.flaggedSignals.slice(0, 4).map((signal) => ({
          type: "observation" as const,
          label: wellbeingRiskSignalLabel(signal),
          detail: `${wellbeingRiskSignalLabel(signal)} was explicitly flagged in the assessment record.`,
          strength: signal === "urgentConcern" ? "high" as const : "medium" as const,
        })),
        ...(typeof wellbeing.recoveryAverage === "number"
          ? [{
              type: "trend" as const,
              label: "Recovery context",
              detail: `Recovery average is ${wellbeing.recoveryAverage.toFixed(2)} and risk level is currently ${wellbeing.riskLevel}.`,
              strength: wellbeing.riskLevel === "high" ? "high" as const : "medium" as const,
            }]
          : []),
      ],
    });
  }

  for (const moduleKey of record.mentalWellbeing.goalModules) {
    recommendationEntries.push({
      id: `module-${moduleKey}`,
      title: wellbeingGoalLabel(moduleKey),
      rationale: "This guided practice module was selected during the assessment and should be carried into the next development-plan cycle.",
      severity: "low",
      evidenceStrength: "medium",
      focusItems: focusAreas.filter((item) => item.domain === "mental").slice(0, 1),
      sourceEvidence: [
        {
          type: "observation",
          label: "Selected practice module",
          detail: `${wellbeingGoalLabel(moduleKey)} was selected as a current support focus.`,
          strength: "medium",
        },
      ],
    });
  }

  const skiMin = benchmark?.ski.min ?? 0;
  const skiTarget = benchmark?.ski.target ?? 0;
  const readinessStatus = statusForScore(record.computed.ski, skiMin, skiTarget);

  if (recommendationEntries.length === 0) {
    recommendationEntries.push({
      id: "readiness-maintain",
      title: "Maintain current progression",
      rationale: "Current domain scores are meeting target expectations for this benchmark version. Keep progression broad and continue observational monitoring.",
      severity: "low",
      evidenceStrength: "medium",
      focusItems: strengths.slice(0, 2),
      sourceEvidence: [
        {
          type: "benchmark",
          label: "Current benchmark position",
          detail: `SKI ${record.computed.ski === null ? "not recorded" : record.computed.ski.toFixed(2)} is meeting current target expectations.`,
          strength: "medium",
        },
      ],
    });
  }

  return {
    readinessStatus,
    standardsVersionUsed: record.standardsVersionUsed,
    standardsVariantUsed: record.standardsVariantUsed,
    mentalWellbeing: {
      phase: wellbeing.phase,
      mentalSkillsAverage: wellbeing.mentalSkillsAverage,
      baselineMentalSkillsAverage: baselineWellbeing?.mentalSkillsAverage ?? null,
      checkInAverage: wellbeing.checkInAverage,
      recoveryAverage: wellbeing.recoveryAverage,
      disagreementIndex: wellbeing.disagreementIndex,
      riskLevel: wellbeing.riskLevel,
      goalModules: record.mentalWellbeing.goalModules.map((key) => wellbeingGoalLabel(key)),
      flaggedSignals: wellbeing.flaggedSignals.map((signal) => wellbeingRiskSignalLabel(signal)),
    },
    ski: {
      current: record.computed.ski,
      baseline: baseline?.computed.ski ?? null,
      min: skiMin,
      target: skiTarget,
      gapToMin: gap(record.computed.ski, skiMin),
      gapToTarget: gap(record.computed.ski, skiTarget),
    },
    domainBenchmarks,
    strengths,
    focusAreas: focusAreas.slice(0, 3),
    recommendations: recommendationEntries,
  };
}
