export type StandardsDomain = "movement" | "social" | "mental" | "ski";
export type StandardsAgeGroup = "4-6" | "7-9" | "10-12";

export interface StandardsDomainThreshold {
  target: number;
  min: number;
}

export interface StandardsFormulaWeights {
  movement: number;
  social: number;
  mental: number;
}

export interface StandardsFormulaDefinition {
  domainWeights: StandardsFormulaWeights;
  readinessMetric: "ski";
  readinessThreshold: "min";
  aspirationThreshold: "target";
}

export interface StandardsVersion {
  meta?: {
    createdBy?: string;
    createdAt?: string;
    notes?: string;
    status?: "draft" | "published";
    publishedAt?: string;
    publishedBy?: string;
    sourceVersion?: string;
  };
  formula?: StandardsFormulaDefinition;
  "4-6": Record<StandardsDomain, StandardsDomainThreshold>;
  "7-9": Record<StandardsDomain, StandardsDomainThreshold>;
  "10-12": Record<StandardsDomain, StandardsDomainThreshold>;
}

export interface StandardsConfiguration {
  activeVersion: string;
  versions: Record<string, StandardsVersion>;
}

export const AGE_GROUPS: readonly StandardsAgeGroup[] = ["4-6", "7-9", "10-12"];
export const DOMAINS: readonly StandardsDomain[] = ["movement", "social", "mental", "ski"];
const FORMULA_DOMAINS: readonly Exclude<StandardsDomain, "ski">[] = ["movement", "social", "mental"];

function toFiniteNumber(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function normalizeThreshold(raw: unknown, fallback: StandardsDomainThreshold): StandardsDomainThreshold {
  const next = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const target = toFiniteNumber(next.target, fallback.target);
  const min = toFiniteNumber(next.min, fallback.min);
  return {
    target: Math.max(0, Number(target.toFixed(2))),
    min: Math.max(0, Math.min(target, Number(min.toFixed(2)))),
  };
}

function normalizeDomainWeights(raw: unknown, fallback: StandardsFormulaWeights): StandardsFormulaWeights {
  const next = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const unclamped = {
    movement: Math.max(0, toFiniteNumber(next.movement, fallback.movement)),
    social: Math.max(0, toFiniteNumber(next.social, fallback.social)),
    mental: Math.max(0, toFiniteNumber(next.mental, fallback.mental)),
  };
  const total = unclamped.movement + unclamped.social + unclamped.mental;

  if (total <= 0) {
    return { ...fallback };
  }

  const normalized = {
    movement: unclamped.movement / total,
    social: unclamped.social / total,
    mental: unclamped.mental / total,
  };
  const rounded = Object.fromEntries(
    FORMULA_DOMAINS.map((domain) => [domain, Number(normalized[domain].toFixed(4))]),
  ) as unknown as StandardsFormulaWeights;
  const roundedTotal = rounded.movement + rounded.social + rounded.mental;

  return {
    movement: rounded.movement,
    social: rounded.social,
    mental: Number((rounded.mental + (1 - roundedTotal)).toFixed(4)),
  };
}

function normalizeFormula(raw: unknown, fallback: StandardsFormulaDefinition): StandardsFormulaDefinition {
  const next = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};

  return {
    domainWeights: normalizeDomainWeights(next.domainWeights, fallback.domainWeights),
    readinessMetric: "ski",
    readinessThreshold: "min",
    aspirationThreshold: "target",
  };
}

export function normalizeStandardsConfiguration(
  raw: unknown,
  fallback: StandardsConfiguration,
  actorEmail?: string,
): StandardsConfiguration {
  const data = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const versionsInput = data.versions && typeof data.versions === "object"
    ? (data.versions as Record<string, unknown>)
    : {};

  const versions = Object.fromEntries(
    Object.entries(versionsInput).map(([versionName, versionValue]) => {
      const fallbackVersion = fallback.versions[versionName] || fallback.versions[fallback.activeVersion];
      const nextVersion = versionValue && typeof versionValue === "object"
        ? (versionValue as Record<string, unknown>)
        : {};

      const normalizedVersion = Object.fromEntries(
        AGE_GROUPS.map((ageGroup) => {
          const fallbackAgeGroup = fallbackVersion[ageGroup];
          const ageValue = nextVersion[ageGroup] && typeof nextVersion[ageGroup] === "object"
            ? (nextVersion[ageGroup] as Record<string, unknown>)
            : {};
          return [ageGroup, Object.fromEntries(
            DOMAINS.map((domain) => [domain, normalizeThreshold(ageValue[domain], fallbackAgeGroup[domain])]),
          )];
        }),
      ) as unknown as StandardsVersion;

      const metaInput = nextVersion.meta && typeof nextVersion.meta === "object"
        ? (nextVersion.meta as Record<string, unknown>)
        : {};
      const fallbackFormula = fallbackVersion.formula || {
        domainWeights: { movement: 0.5, social: 0.3, mental: 0.2 },
        readinessMetric: "ski" as const,
        readinessThreshold: "min" as const,
        aspirationThreshold: "target" as const,
      };
      const now = new Date().toISOString();
      const status = metaInput.status === "draft" || metaInput.status === "published"
        ? metaInput.status
        : fallbackVersion.meta?.status || "draft";
      normalizedVersion.meta = {
        createdAt: typeof metaInput.createdAt === "string" && metaInput.createdAt ? metaInput.createdAt : fallbackVersion.meta?.createdAt || now,
        createdBy: typeof metaInput.createdBy === "string" && metaInput.createdBy ? metaInput.createdBy : fallbackVersion.meta?.createdBy || actorEmail,
        notes: typeof metaInput.notes === "string" ? metaInput.notes.trim() : fallbackVersion.meta?.notes || "",
        status,
        sourceVersion: typeof metaInput.sourceVersion === "string" && metaInput.sourceVersion
          ? metaInput.sourceVersion
          : fallbackVersion.meta?.sourceVersion,
        publishedAt: status === "published"
          ? (typeof metaInput.publishedAt === "string" && metaInput.publishedAt ? metaInput.publishedAt : fallbackVersion.meta?.publishedAt || now)
          : undefined,
        publishedBy: status === "published"
          ? (typeof metaInput.publishedBy === "string" && metaInput.publishedBy ? metaInput.publishedBy : fallbackVersion.meta?.publishedBy || actorEmail)
          : undefined,
      };
      normalizedVersion.formula = normalizeFormula(nextVersion.formula, fallbackFormula);

      return [versionName, normalizedVersion];
    }),
  );

  const activeVersionInput = typeof data.activeVersion === "string" ? data.activeVersion.trim() : "";
  const activeVersion = activeVersionInput && versions[activeVersionInput]
    ? activeVersionInput
    : fallback.activeVersion;

  return {
    activeVersion,
    versions: Object.keys(versions).length > 0 ? versions : fallback.versions,
  };
}
