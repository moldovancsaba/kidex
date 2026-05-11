import { sectionsForMode } from "@/lib/kidex-schema";
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

export interface RecommendationSummary {
  readinessStatus: RecommendationStatus;
  standardsVersionUsed?: string;
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
    focusItems: RecommendationItem[];
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

export function buildRecommendationSummary(
  record: AssessmentRecord,
  history: AssessmentRecord[],
  benchmark: AgeGroupStandard | null,
  translateSchema: (key: string) => string,
): RecommendationSummary {
  const baseline = history.length > 0 ? history[history.length - 1] : null;
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

      return {
        id: `${entry.domain}-${entry.status}`,
        title,
        rationale,
        domain: entry.domain,
        severity: severityForStatus(entry.status),
        focusItems: focusItemsForDomain,
      };
    });

  const skiMin = benchmark?.ski.min ?? 0;
  const skiTarget = benchmark?.ski.target ?? 0;
  const readinessStatus = statusForScore(record.computed.ski, skiMin, skiTarget);

  if (recommendationEntries.length === 0) {
    recommendationEntries.push({
      id: "readiness-maintain",
      title: "Maintain current progression",
      rationale: "Current domain scores are meeting target expectations for this benchmark version. Keep progression broad and continue observational monitoring.",
      severity: "low",
      focusItems: strengths.slice(0, 2),
    });
  }

  return {
    readinessStatus,
    standardsVersionUsed: record.standardsVersionUsed,
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
