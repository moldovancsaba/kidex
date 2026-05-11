import type { ChildProfile } from "@/repositories/child.repository";
import type { AssessmentRecord } from "@/types/assessment";
import { getConsentAlerts } from "@/lib/consent-policy";
import { getStandardForAssessment } from "@/lib/standards";
import type { StandardsConfiguration } from "@/lib/standards-config";

type BenchmarkBand = "watch" | "developing" | "ready";
type OrientationLabel = "movement" | "social" | "mental" | "balanced";
type RiskLevel = "high" | "medium" | "low";

export interface DashboardTrendPoint {
  label: string;
  readiness: number;
  function: number;
  wellbeing: number;
  count: number;
}

export interface DashboardAgeBandPoint {
  ageGroup: string;
  watch: number;
  developing: number;
  ready: number;
}

export interface DashboardOrientationPoint {
  label: OrientationLabel;
  count: number;
}

export interface DashboardBenchmarkCoveragePoint {
  ageGroup: string;
  meetingTarget: number;
  onTrack: number;
  belowMinimum: number;
}

export interface DashboardRiskItem {
  childId?: string;
  childName: string;
  ageGroup: string;
  latestSki: number | null;
  latestAssessmentAt?: string;
  latestRecordId?: string;
  level: RiskLevel;
  score: number;
  band: BenchmarkBand;
  reasons: string[];
  action: string;
}

export interface DashboardRiskBuckets {
  high: number;
  medium: number;
  low: number;
}

export interface DashboardAnalyticsResult {
  monthlyTrend: DashboardTrendPoint[];
  readinessByAgeGroup: DashboardAgeBandPoint[];
  orientationMix: DashboardOrientationPoint[];
  benchmarkCoverage: DashboardBenchmarkCoveragePoint[];
  watchlist: DashboardRiskItem[];
  riskBuckets: DashboardRiskBuckets;
  activeChildren: number;
  staleChildren: number;
  childrenNeedingConsentReview: number;
}

interface ChildAnalyticsNode {
  child: ChildProfile;
  records: AssessmentRecord[];
  latest: AssessmentRecord | null;
  previous: AssessmentRecord | null;
}

function childIdentityKey(child: { _id?: string; name?: string; birthDate?: string }) {
  return child._id || `${child.name || "unknown"}|${child.birthDate || "unknown"}`;
}

function assessmentIdentityKey(assessment: AssessmentRecord) {
  return assessment.childId || childIdentityKey(assessment.child);
}

function average(values: Array<number | null | undefined>) {
  const filtered = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (filtered.length === 0) return 0;
  return Number((filtered.reduce((sum, value) => sum + value, 0) / filtered.length).toFixed(2));
}

function monthKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(date: Date) {
  return new Intl.DateTimeFormat(undefined, { month: "short" }).format(date);
}

function daysBetween(older: string | undefined, newerIso: string) {
  if (!older) return Number.POSITIVE_INFINITY;
  const olderTime = new Date(older).getTime();
  const newerTime = new Date(newerIso).getTime();
  return (newerTime - olderTime) / (1000 * 60 * 60 * 24);
}

function benchmarkBandForRecord(
  standards: StandardsConfiguration | undefined,
  record: AssessmentRecord | null,
): BenchmarkBand {
  if (!record) return "watch";
  const standard = getStandardForAssessment(
    standards,
    record.standardsVersionUsed,
    record.child.ageGroup,
  );
  const ski = record.computed.ski;
  if (!standard || typeof ski !== "number") return "developing";
  if (ski < standard.ski.min) return "watch";
  if (ski < standard.ski.target) return "developing";
  return "ready";
}

function orientationForRecord(record: AssessmentRecord | null): OrientationLabel {
  if (!record) return "balanced";
  const entries = [
    { key: "movement" as const, value: record.computed.movementAverage ?? 0 },
    { key: "social" as const, value: record.computed.socialAverage ?? 0 },
    { key: "mental" as const, value: record.computed.mentalAverage ?? 0 },
  ].sort((left, right) => right.value - left.value);

  if (entries[0].value - entries[1].value < 0.25) {
    return "balanced";
  }

  return entries[0].key;
}

function watchlistAction(reasons: string[]) {
  if (reasons.some((reason) => reason.includes("consent"))) return "Refresh caregiver consent before the next share or export.";
  if (reasons.some((reason) => reason.includes("follow-up"))) return "Schedule a follow-up assessment and re-open the support plan.";
  if (reasons.some((reason) => reason.includes("benchmark"))) return "Review benchmark fit and update the current development plan.";
  if (reasons.some((reason) => reason.includes("declined"))) return "Review the previous two records and discuss context with the practitioner.";
  return "Review the child profile in the next case meeting.";
}

function buildChildNodes(children: ChildProfile[], assessments: AssessmentRecord[]): ChildAnalyticsNode[] {
  const recordsByChild = new Map<string, AssessmentRecord[]>();
  for (const assessment of assessments) {
    const key = assessmentIdentityKey(assessment);
    if (!recordsByChild.has(key)) recordsByChild.set(key, []);
    recordsByChild.get(key)?.push(assessment);
  }

  return children.map((child) => {
    const records = (recordsByChild.get(childIdentityKey(child)) || []).slice().sort((left, right) => (
      new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
    ));
    return {
      child,
      records,
      latest: records.at(-1) || null,
      previous: records.length > 1 ? records.at(-2) || null : null,
    };
  });
}

export function buildDashboardAnalytics(input: {
  children: ChildProfile[];
  assessments: AssessmentRecord[];
  standards?: StandardsConfiguration;
  now?: string;
}): DashboardAnalyticsResult {
  const now = input.now || new Date().toISOString();
  const nowDate = new Date(now);
  const childNodes = buildChildNodes(input.children, input.assessments);

  const monthlyBuckets = new Map<string, {
    date: Date;
    readiness: number[];
    function: number[];
    wellbeing: number[];
  }>();
  for (let offset = 5; offset >= 0; offset -= 1) {
    const bucketDate = new Date(Date.UTC(nowDate.getUTCFullYear(), nowDate.getUTCMonth() - offset, 1));
    monthlyBuckets.set(monthKey(bucketDate), {
      date: bucketDate,
      readiness: [],
      function: [],
      wellbeing: [],
    });
  }

  for (const assessment of input.assessments) {
    const createdAt = new Date(assessment.createdAt);
    const bucket = monthlyBuckets.get(monthKey(createdAt));
    if (!bucket) continue;
    if (typeof assessment.computed.ski === "number") bucket.readiness.push(assessment.computed.ski);
    if (typeof assessment.computed.movementAverage === "number") bucket.function.push(assessment.computed.movementAverage);
    bucket.wellbeing.push(average([assessment.computed.socialAverage, assessment.computed.mentalAverage]));
  }

  const readinessByAgeGroupMap = new Map<string, DashboardAgeBandPoint>();
  const orientationCounts: DashboardOrientationPoint[] = [
    { label: "movement", count: 0 },
    { label: "social", count: 0 },
    { label: "mental", count: 0 },
    { label: "balanced", count: 0 },
  ];
  const benchmarkCoverageMap = new Map<string, DashboardBenchmarkCoveragePoint>();
  const riskBuckets: DashboardRiskBuckets = { high: 0, medium: 0, low: 0 };

  const watchlist = childNodes
    .map((node): DashboardRiskItem => {
      const reasons: string[] = [];
      let score = 0;
      const latestAt = node.latest?.createdAt;
      const daysSinceLatest = daysBetween(latestAt, now);
      const consentAlerts = getConsentAlerts(node.child.consentPolicy, now);
      const band = benchmarkBandForRecord(input.standards, node.latest);

      if (node.records.length === 0) {
        score += 6;
        reasons.push("No assessment history yet.");
      } else if (daysSinceLatest > 90) {
        score += 3;
        reasons.push("No follow-up assessment in more than 90 days.");
      } else if (daysSinceLatest > 45) {
        score += 1;
        reasons.push("Follow-up assessment window is stretching beyond 45 days.");
      }

      if (band === "watch") {
        score += 2;
        reasons.push("Latest SKI is below the current minimum benchmark.");
      }

      const latestSki = node.latest?.computed.ski ?? null;
      const previousSki = node.previous?.computed.ski ?? null;
      if (typeof latestSki === "number" && typeof previousSki === "number") {
        const delta = Number((latestSki - previousSki).toFixed(2));
        if (delta <= -0.5) {
          score += 2;
          reasons.push(`Readiness declined by ${Math.abs(delta).toFixed(2)} points since the previous cycle.`);
        } else if (delta <= -0.25) {
          score += 1;
          reasons.push(`Readiness declined by ${Math.abs(delta).toFixed(2)} points since the previous cycle.`);
        }
      }

      if (consentAlerts.length > 0) {
        score += consentAlerts.some((alert) => alert.severity === "error") ? 2 : 1;
        reasons.push("Family consent requires review before the next share or export.");
      }

      const level: RiskLevel = score >= 5 ? "high" : score >= 3 ? "medium" : "low";
      riskBuckets[level] += 1;

      return {
        childId: node.child._id,
        childName: node.child.name,
        ageGroup: node.child.ageGroup || "—",
        latestSki,
        latestAssessmentAt: latestAt,
        latestRecordId: node.latest?._id,
        level,
        score,
        band,
        reasons,
        action: watchlistAction(reasons),
      };
    })
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score || left.childName.localeCompare(right.childName));

  for (const node of childNodes) {
    const ageGroup = node.child.ageGroup || "—";
    const band = benchmarkBandForRecord(input.standards, node.latest);
    const readinessEntry = readinessByAgeGroupMap.get(ageGroup) || { ageGroup, watch: 0, developing: 0, ready: 0 };
    readinessEntry[band] += 1;
    readinessByAgeGroupMap.set(ageGroup, readinessEntry);

    const coverageEntry = benchmarkCoverageMap.get(ageGroup) || {
      ageGroup,
      meetingTarget: 0,
      onTrack: 0,
      belowMinimum: 0,
    };
    if (band === "ready") coverageEntry.meetingTarget += 1;
    else if (band === "developing") coverageEntry.onTrack += 1;
    else coverageEntry.belowMinimum += 1;
    benchmarkCoverageMap.set(ageGroup, coverageEntry);

    const orientation = orientationForRecord(node.latest);
    const orientationEntry = orientationCounts.find((entry) => entry.label === orientation);
    if (orientationEntry) orientationEntry.count += 1;
  }

  const activeChildren = childNodes.filter((node) => daysBetween(node.latest?.createdAt, now) <= 45).length;
  const staleChildren = childNodes.filter((node) => node.records.length > 0 && daysBetween(node.latest?.createdAt, now) > 90).length;
  const childrenNeedingConsentReview = childNodes.filter((node) => getConsentAlerts(node.child.consentPolicy, now).length > 0).length;

  return {
    monthlyTrend: Array.from(monthlyBuckets.values()).map((bucket) => ({
      label: monthLabel(bucket.date),
      readiness: average(bucket.readiness),
      function: average(bucket.function),
      wellbeing: average(bucket.wellbeing),
      count: bucket.readiness.length,
    })),
    readinessByAgeGroup: Array.from(readinessByAgeGroupMap.values()),
    orientationMix: orientationCounts,
    benchmarkCoverage: Array.from(benchmarkCoverageMap.values()),
    watchlist: watchlist.slice(0, 8),
    riskBuckets,
    activeChildren,
    staleChildren,
    childrenNeedingConsentReview,
  };
}
