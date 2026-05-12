export const MENTAL_SKILL_KEYS = [
  "focus",
  "resilience",
  "selfTalk",
  "confidence",
  "selfRegulation",
  "helpSeeking",
] as const;

export const WELLBEING_CHECKIN_KEYS = [
  "mood",
  "stress",
  "readiness",
  "sleepQuality",
  "fatigue",
  "soreness",
] as const;

export const WELLBEING_PERSPECTIVES = [
  "child",
  "observer",
  "caregiver",
] as const;

export const WELLBEING_GOAL_MODULES = [
  { key: "goal_setting", title: "Goal-setting and next-step planning" },
  { key: "self_talk", title: "Positive self-talk reset" },
  { key: "imagery", title: "Imagery and rehearsal" },
  { key: "breathing", title: "Breathing and reset routine" },
  { key: "confidence", title: "Confidence reminders and success review" },
  { key: "help_seeking", title: "Help-seeking and support check-in" },
] as const;

export type MentalSkillKey = (typeof MENTAL_SKILL_KEYS)[number];
export type WellbeingCheckInKey = (typeof WELLBEING_CHECKIN_KEYS)[number];
export type WellbeingPerspectiveKey = (typeof WELLBEING_PERSPECTIVES)[number];
export type WellbeingGoalModuleKey = (typeof WELLBEING_GOAL_MODULES)[number]["key"];

export interface MentalSkillsScores {
  focus: number | "";
  resilience: number | "";
  selfTalk: number | "";
  confidence: number | "";
  selfRegulation: number | "";
  helpSeeking: number | "";
}

export interface WellbeingCheckIn {
  mood: number | "";
  stress: number | "";
  readiness: number | "";
  sleepQuality: number | "";
  fatigue: number | "";
  soreness: number | "";
}

export interface WellbeingRiskSignals {
  withdrawal: boolean;
  overload: boolean;
  conflict: boolean;
  fearResponse: boolean;
  sleepConcern: boolean;
  painConcern: boolean;
  askedForHelp: boolean;
  urgentConcern: boolean;
}

export interface MentalWellbeingProfile {
  phase: "baseline" | "follow_up";
  perspectives: Record<WellbeingPerspectiveKey, MentalSkillsScores>;
  checkIn: WellbeingCheckIn;
  goalModules: WellbeingGoalModuleKey[];
  reflection: string;
  supportNeeds: string;
  riskSignals: WellbeingRiskSignals;
}

export interface MentalWellbeingComputed {
  phase: "baseline" | "follow_up";
  mentalSkillsAverage: number | null;
  checkInAverage: number | null;
  recoveryAverage: number | null;
  disagreementIndex: number | null;
  riskLevel: "low" | "medium" | "high";
  flaggedSignals: string[];
}

const RISK_SIGNAL_LABELS: Record<keyof WellbeingRiskSignals, string> = {
  withdrawal: "Withdrawal or shutdown",
  overload: "Overload or overwhelm",
  conflict: "Conflict spillover",
  fearResponse: "Fear or panic response",
  sleepConcern: "Sleep concern",
  painConcern: "Pain or soreness concern",
  askedForHelp: "Child asked for help",
  urgentConcern: "Urgent follow-up concern",
};

function scoreValue(value: unknown): number | "" {
  return typeof value === "number" && value >= 1 && value <= 5 ? value : "";
}

function textValue(value: unknown, max = 4000): string {
  return typeof value === "string" ? value.slice(0, max).trim() : "";
}

function booleanValue(value: unknown): boolean {
  return typeof value === "boolean" ? value : false;
}

function average(values: Array<number | "" | null | undefined>): number | null {
  const numbers = values.filter((value): value is number => typeof value === "number");
  if (numbers.length === 0) return null;
  return Number((numbers.reduce((sum, value) => sum + value, 0) / numbers.length).toFixed(2));
}

function normalizeMentalSkillsScores(input: unknown): MentalSkillsScores {
  const data = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  return {
    focus: scoreValue(data.focus),
    resilience: scoreValue(data.resilience),
    selfTalk: scoreValue(data.selfTalk),
    confidence: scoreValue(data.confidence),
    selfRegulation: scoreValue(data.selfRegulation),
    helpSeeking: scoreValue(data.helpSeeking),
  };
}

function normalizeCheckIn(input: unknown): WellbeingCheckIn {
  const data = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  return {
    mood: scoreValue(data.mood),
    stress: scoreValue(data.stress),
    readiness: scoreValue(data.readiness),
    sleepQuality: scoreValue(data.sleepQuality),
    fatigue: scoreValue(data.fatigue),
    soreness: scoreValue(data.soreness),
  };
}

function normalizeRiskSignals(input: unknown): WellbeingRiskSignals {
  const data = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  return {
    withdrawal: booleanValue(data.withdrawal),
    overload: booleanValue(data.overload),
    conflict: booleanValue(data.conflict),
    fearResponse: booleanValue(data.fearResponse),
    sleepConcern: booleanValue(data.sleepConcern),
    painConcern: booleanValue(data.painConcern),
    askedForHelp: booleanValue(data.askedForHelp),
    urgentConcern: booleanValue(data.urgentConcern),
  };
}

export function defaultMentalWellbeingProfile(): MentalWellbeingProfile {
  const emptyScores = normalizeMentalSkillsScores({});
  return {
    phase: "baseline",
    perspectives: {
      child: { ...emptyScores },
      observer: { ...emptyScores },
      caregiver: { ...emptyScores },
    },
    checkIn: normalizeCheckIn({}),
    goalModules: [],
    reflection: "",
    supportNeeds: "",
    riskSignals: normalizeRiskSignals({}),
  };
}

export function normalizeMentalWellbeingProfile(input: unknown): MentalWellbeingProfile {
  const data = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const perspectives = data.perspectives && typeof data.perspectives === "object" ? (data.perspectives as Record<string, unknown>) : {};
  const goalModules = Array.isArray(data.goalModules)
    ? Array.from(new Set(data.goalModules.filter((value): value is WellbeingGoalModuleKey => (
        typeof value === "string" && WELLBEING_GOAL_MODULES.some((module) => module.key === value)
      ))))
    : [];

  return {
    phase: data.phase === "follow_up" ? "follow_up" : "baseline",
    perspectives: {
      child: normalizeMentalSkillsScores(perspectives.child),
      observer: normalizeMentalSkillsScores(perspectives.observer),
      caregiver: normalizeMentalSkillsScores(perspectives.caregiver),
    },
    checkIn: normalizeCheckIn(data.checkIn),
    goalModules,
    reflection: textValue(data.reflection),
    supportNeeds: textValue(data.supportNeeds),
    riskSignals: normalizeRiskSignals(data.riskSignals),
  };
}

export function computeMentalWellbeing(profile: MentalWellbeingProfile): MentalWellbeingComputed {
  const perspectiveAverages = WELLBEING_PERSPECTIVES.map((perspective) => average(
    MENTAL_SKILL_KEYS.map((key) => profile.perspectives[perspective][key]),
  ));
  const mentalSkillsAverage = average(perspectiveAverages);
  const checkInAverage = average([
    profile.checkIn.mood,
    profile.checkIn.readiness,
    profile.checkIn.sleepQuality,
    typeof profile.checkIn.stress === "number" ? 6 - profile.checkIn.stress : "",
    typeof profile.checkIn.fatigue === "number" ? 6 - profile.checkIn.fatigue : "",
    typeof profile.checkIn.soreness === "number" ? 6 - profile.checkIn.soreness : "",
  ]);
  const recoveryAverage = average([
    profile.checkIn.sleepQuality,
    typeof profile.checkIn.fatigue === "number" ? 6 - profile.checkIn.fatigue : "",
    typeof profile.checkIn.soreness === "number" ? 6 - profile.checkIn.soreness : "",
  ]);

  const disagreementValues = MENTAL_SKILL_KEYS.map((key) => {
    const values = WELLBEING_PERSPECTIVES
      .map((perspective) => profile.perspectives[perspective][key])
      .filter((value): value is number => typeof value === "number");
    if (values.length < 2) return null;
    return Math.max(...values) - Math.min(...values);
  }).filter((value): value is number => typeof value === "number");
  const disagreementIndex = disagreementValues.length
    ? Number((disagreementValues.reduce((sum, value) => sum + value, 0) / disagreementValues.length).toFixed(2))
    : null;

  const flaggedSignals = Object.entries(profile.riskSignals)
    .filter(([, active]) => active)
    .map(([key]) => key);

  let riskScore = 0;
  if (profile.riskSignals.urgentConcern) riskScore += 5;
  riskScore += flaggedSignals.filter((key) => key !== "urgentConcern").length;
  if (typeof recoveryAverage === "number" && recoveryAverage <= 2.5) riskScore += 2;
  if (typeof checkInAverage === "number" && checkInAverage <= 2.5) riskScore += 2;
  if (typeof disagreementIndex === "number" && disagreementIndex >= 2) riskScore += 1;

  const riskLevel = riskScore >= 5 ? "high" : riskScore >= 3 ? "medium" : "low";

  return {
    phase: profile.phase,
    mentalSkillsAverage,
    checkInAverage,
    recoveryAverage,
    disagreementIndex,
    riskLevel,
    flaggedSignals,
  };
}

export function wellbeingGoalLabel(key: WellbeingGoalModuleKey): string {
  return WELLBEING_GOAL_MODULES.find((module) => module.key === key)?.title || key;
}

export function wellbeingRiskSignalLabel(key: string): string {
  return RISK_SIGNAL_LABELS[key as keyof WellbeingRiskSignals] || key;
}
