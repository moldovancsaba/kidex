import type { SupportedRuntimeRole } from "@/lib/roles";

export type CultureSurveyTargetRole = "athlete" | "caregiver" | "staff";
export type CultureSurveyStatus = "active" | "closed";
export type CultureSurveyDimension =
  | "trust"
  | "belonging"
  | "enjoyment"
  | "voice"
  | "safety"
  | "adultBehavior"
  | "communication"
  | "pressure";

export interface CultureSurveyResponse {
  submittedAt: string;
  targetRole: CultureSurveyTargetRole;
  answers: Record<CultureSurveyDimension, number>;
}

export interface CultureSurveyLaunch {
  _id?: string;
  institutionId: string;
  title: string;
  scopeLabel: string;
  targetRole: CultureSurveyTargetRole;
  minResponses: number;
  opensAt: string;
  closesAt?: string;
  status: CultureSurveyStatus;
  createdAt: string;
  updatedAt: string;
  createdByUserEmail?: string;
  responses: CultureSurveyResponse[];
}

export interface CultureSurveyLaunchSummary {
  id?: string;
  title: string;
  institutionId: string;
  scopeLabel: string;
  targetRole: CultureSurveyTargetRole;
  status: CultureSurveyStatus;
  opensAt: string;
  closesAt?: string;
  minResponses: number;
  responseCount: number;
  publishable: boolean;
  cultureIndex: number | null;
  dimensions: Array<{ key: CultureSurveyDimension; label: string; average: number | null }>;
}

export interface CultureAnalyticsSummary {
  launchSummaries: CultureSurveyLaunchSummary[];
  trend: Array<{ label: string; index: number; role: CultureSurveyTargetRole }>;
  roleComparison: Array<{ role: CultureSurveyTargetRole; index: number | null; launches: number; responses: number }>;
  scorecards: Array<{ scopeLabel: string; index: number; launches: number; latestLabel: string }>;
  headline: {
    publishableLaunches: number;
    totalResponses: number;
    averageCultureIndex: number | null;
    watchCount: number;
  };
}

export const CULTURE_SURVEY_DIMENSIONS: Array<{
  key: CultureSurveyDimension;
  label: string;
  reverse?: boolean;
  roles: CultureSurveyTargetRole[];
  prompt: Record<CultureSurveyTargetRole, string>;
}> = [
  {
    key: "trust",
    label: "Trust",
    roles: ["athlete", "caregiver", "staff"],
    prompt: {
      athlete: "I can trust the adults around this sport environment to support me fairly.",
      caregiver: "I trust the adults around this sport environment to support children fairly.",
      staff: "Adults in this environment act in ways that build trust with children and families.",
    },
  },
  {
    key: "belonging",
    label: "Belonging",
    roles: ["athlete", "caregiver", "staff"],
    prompt: {
      athlete: "I feel like I belong here even when things are hard.",
      caregiver: "My child feels like they belong here even when things are hard.",
      staff: "Children are helped to feel that they belong here, not only when they succeed.",
    },
  },
  {
    key: "enjoyment",
    label: "Enjoyment",
    roles: ["athlete", "caregiver", "staff"],
    prompt: {
      athlete: "This environment still feels enjoyable more often than stressful.",
      caregiver: "This environment still feels enjoyable for children more often than stressful.",
      staff: "This environment protects enjoyment rather than making everything feel outcome-heavy.",
    },
  },
  {
    key: "voice",
    label: "Voice",
    roles: ["athlete", "caregiver", "staff"],
    prompt: {
      athlete: "Young people are listened to here when they speak up.",
      caregiver: "Families and children are listened to here when they speak up.",
      staff: "Children and families have a real chance to be heard here.",
    },
  },
  {
    key: "safety",
    label: "Safety",
    roles: ["athlete", "caregiver", "staff"],
    prompt: {
      athlete: "I feel emotionally and socially safe in this environment.",
      caregiver: "This environment feels emotionally and socially safe for children.",
      staff: "This environment protects emotional and social safety for children.",
    },
  },
  {
    key: "adultBehavior",
    label: "Adult behavior",
    roles: ["athlete", "caregiver", "staff"],
    prompt: {
      athlete: "Adults here usually act in calm, respectful, child-supportive ways.",
      caregiver: "Adults here usually act in calm, respectful, child-supportive ways.",
      staff: "Adults here usually model calm, respectful, child-supportive behavior.",
    },
  },
  {
    key: "communication",
    label: "Communication",
    roles: ["athlete", "caregiver", "staff"],
    prompt: {
      athlete: "Communication here is clear and not confusing or shaming.",
      caregiver: "Communication here is clear and not confusing or shaming.",
      staff: "Communication here is clear enough to support children well.",
    },
  },
  {
    key: "pressure",
    label: "Pressure",
    reverse: true,
    roles: ["athlete", "caregiver", "staff"],
    prompt: {
      athlete: "This environment feels too pressure-heavy for children.",
      caregiver: "This environment feels too pressure-heavy for children.",
      staff: "This environment sometimes pushes pressure too high for children.",
    },
  },
];

export function cultureSurveyRoleLabel(role: CultureSurveyTargetRole) {
  if (role === "athlete") return "Athlete voice";
  if (role === "caregiver") return "Caregiver perspective";
  return "Staff perspective";
}

export function supportedSurveyDimensions(role: CultureSurveyTargetRole) {
  return CULTURE_SURVEY_DIMENSIONS.filter((dimension) => dimension.roles.includes(role));
}

function clampScore(value: unknown): number {
  return typeof value === "number" && value >= 1 && value <= 5 ? Math.round(value) : 3;
}

function stringValue(value: unknown, max = 240): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function nowIso() {
  return new Date().toISOString();
}

export function normalizeCultureSurveyResponse(input: unknown, targetRole: CultureSurveyTargetRole): CultureSurveyResponse {
  const data = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const answerInput = data.answers && typeof data.answers === "object" ? (data.answers as Record<string, unknown>) : {};
  const answers = Object.fromEntries(
    CULTURE_SURVEY_DIMENSIONS.map((dimension) => [dimension.key, clampScore(answerInput[dimension.key])]),
  ) as Record<CultureSurveyDimension, number>;
  return {
    submittedAt: stringValue(data.submittedAt, 80) || nowIso(),
    targetRole,
    answers,
  };
}

export function normalizeCultureSurveyLaunch(input: unknown): CultureSurveyLaunch {
  const data = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const targetRole = data.targetRole === "caregiver" || data.targetRole === "staff" ? data.targetRole : "athlete";
  const createdAt = stringValue(data.createdAt, 80) || nowIso();
  const updatedAt = stringValue(data.updatedAt, 80) || createdAt;
  const responses = Array.isArray(data.responses) ? data.responses : [];
  return {
    _id: stringValue(data._id, 80) || undefined,
    institutionId: stringValue(data.institutionId, 120) || "default",
    title: stringValue(data.title, 240) || `${cultureSurveyRoleLabel(targetRole)} pulse`,
    scopeLabel: stringValue(data.scopeLabel, 240) || "Institution",
    targetRole,
    minResponses: typeof data.minResponses === "number" ? Math.max(3, Math.min(30, Math.round(data.minResponses))) : 5,
    opensAt: stringValue(data.opensAt, 80) || createdAt,
    closesAt: stringValue(data.closesAt, 80) || undefined,
    status: data.status === "closed" ? "closed" : "active",
    createdAt,
    updatedAt,
    createdByUserEmail: stringValue(data.createdByUserEmail, 240) || undefined,
    responses: responses.map((response) => normalizeCultureSurveyResponse(response, targetRole)),
  };
}

function average(values: number[]) {
  if (values.length === 0) return null;
  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2));
}

function normalizedDimensionScore(key: CultureSurveyDimension, value: number) {
  const definition = CULTURE_SURVEY_DIMENSIONS.find((entry) => entry.key === key);
  return definition?.reverse ? 6 - value : value;
}

function cultureIndexFromResponses(responses: CultureSurveyResponse[]) {
  const normalizedValues = responses.flatMap((response) =>
    Object.entries(response.answers).map(([key, value]) => normalizedDimensionScore(key as CultureSurveyDimension, value)),
  );
  return average(normalizedValues);
}

function dimensionAverage(responses: CultureSurveyResponse[], key: CultureSurveyDimension) {
  return average(responses.map((response) => normalizedDimensionScore(key, response.answers[key])));
}

function launchLabel(input: { scopeLabel: string; opensAt: string }) {
  return `${input.scopeLabel} · ${new Date(input.opensAt).toLocaleDateString()}`;
}

export function summarizeCultureLaunch(launch: CultureSurveyLaunch): CultureSurveyLaunchSummary {
  const publishable = launch.responses.length >= launch.minResponses;
  return {
    id: launch._id,
    title: launch.title,
    institutionId: launch.institutionId,
    scopeLabel: launch.scopeLabel,
    targetRole: launch.targetRole,
    status: launch.status,
    opensAt: launch.opensAt,
    closesAt: launch.closesAt,
    minResponses: launch.minResponses,
    responseCount: launch.responses.length,
    publishable,
    cultureIndex: publishable ? cultureIndexFromResponses(launch.responses) : null,
    dimensions: CULTURE_SURVEY_DIMENSIONS.map((dimension) => ({
      key: dimension.key,
      label: dimension.label,
      average: publishable ? dimensionAverage(launch.responses, dimension.key) : null,
    })),
  };
}

export function buildCultureAnalytics(launches: CultureSurveyLaunch[]): CultureAnalyticsSummary {
  const summaries = launches
    .map(summarizeCultureLaunch)
    .sort((left, right) => new Date(right.opensAt).getTime() - new Date(left.opensAt).getTime());

  const publishable = summaries.filter((launch) => launch.publishable && typeof launch.cultureIndex === "number");
  const trend = publishable
    .slice()
    .sort((left, right) => new Date(left.opensAt).getTime() - new Date(right.opensAt).getTime())
    .slice(-8)
    .map((launch) => ({
      label: new Intl.DateTimeFormat(undefined, { month: "short", day: "2-digit" }).format(new Date(launch.opensAt)),
      index: launch.cultureIndex || 0,
      role: launch.targetRole,
    }));

  const roleComparison = (["athlete", "caregiver", "staff"] as CultureSurveyTargetRole[]).map((role) => {
    const roleLaunches = publishable.filter((launch) => launch.targetRole === role);
    return {
      role,
      index: average(roleLaunches.map((launch) => launch.cultureIndex || 0)),
      launches: roleLaunches.length,
      responses: roleLaunches.reduce((sum, launch) => sum + launch.responseCount, 0),
    };
  });

  const scorecardMap = new Map<string, { scopeLabel: string; scores: number[]; launches: number; latest: string }>();
  for (const launch of publishable) {
    const card = scorecardMap.get(launch.scopeLabel) || {
      scopeLabel: launch.scopeLabel,
      scores: [],
      launches: 0,
      latest: launchLabel(launch),
    };
    card.scores.push(launch.cultureIndex || 0);
    card.launches += 1;
    card.latest = launchLabel(launch);
    scorecardMap.set(launch.scopeLabel, card);
  }

  const scorecards = Array.from(scorecardMap.values()).map((entry) => ({
    scopeLabel: entry.scopeLabel,
    index: average(entry.scores) || 0,
    launches: entry.launches,
    latestLabel: entry.latest,
  })).sort((left, right) => right.index - left.index);

  const averageCultureIndex = average(publishable.map((launch) => launch.cultureIndex || 0));
  const watchCount = publishable.filter((launch) => (launch.cultureIndex || 0) < 3.2).length;

  return {
    launchSummaries: summaries,
    trend,
    roleComparison,
    scorecards,
    headline: {
      publishableLaunches: publishable.length,
      totalResponses: launches.reduce((sum, launch) => sum + launch.responses.length, 0),
      averageCultureIndex,
      watchCount,
    },
  };
}

export function createCultureSurveyLaunch(input: {
  institutionId: string;
  title: string;
  scopeLabel: string;
  targetRole: CultureSurveyTargetRole;
  minResponses?: number;
  closesAt?: string;
  createdByUserEmail?: string;
}): CultureSurveyLaunch {
  const now = nowIso();
  return normalizeCultureSurveyLaunch({
    institutionId: input.institutionId,
    title: input.title,
    scopeLabel: input.scopeLabel,
    targetRole: input.targetRole,
    minResponses: input.minResponses,
    opensAt: now,
    closesAt: input.closesAt,
    createdAt: now,
    updatedAt: now,
    createdByUserEmail: input.createdByUserEmail,
    responses: [],
    status: "active",
  });
}

export function canReadCultureLaunch(actor: { roles: SupportedRuntimeRole[]; institutionIds: string[] } | null, institutionId: string) {
  if (!actor) return false;
  if (actor.roles.includes("admin")) return true;
  return actor.institutionIds.includes(institutionId);
}
