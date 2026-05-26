import type { ChildProfile } from "@/repositories/child.repository";

export const CHILD_QUICK_SWITCH_RECENTS_KEY = "kidex.child-quick-switch.recents.v1";
const MAX_RECENT_CHILDREN = 6;
const DUE_SOON_WINDOW_DAYS = 14;

export type ChildQuickSwitchFollowUpStatus = "overdue" | "due_soon" | "none";
export type ChildQuickSwitchTargetKind = "child" | "record" | "follow_up" | "survey";

export interface ChildQuickSwitchTarget {
  kind: ChildQuickSwitchTargetKind;
  href: string;
}

export interface ChildQuickSwitchResult {
  child: ChildProfile;
  score: number;
  matchedFields: string[];
  subtitle: string;
  followUpStatus: ChildQuickSwitchFollowUpStatus;
  recent: boolean;
  targets: ChildQuickSwitchTarget[];
  primaryTarget: ChildQuickSwitchTarget;
}

interface RankChildQuickSwitchResultsOptions {
  canWriteAssessments?: boolean;
  recentChildIds?: string[];
  now?: Date;
}

function normalizeSearchValue(value: string | undefined) {
  return (value || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

function tokenizeQuery(query: string) {
  return normalizeSearchValue(query)
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

export function parseQuickSwitchRecentChildIds(raw: string | null | undefined) {
  if (!raw) return [] as string[];

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [] as string[];
    return parsed.filter((value): value is string => typeof value === "string" && value.trim().length > 0).slice(0, MAX_RECENT_CHILDREN);
  } catch {
    return [] as string[];
  }
}

export function rememberQuickSwitchRecentChild(existing: string[], childId: string) {
  if (!childId) return existing.slice(0, MAX_RECENT_CHILDREN);
  return [childId, ...existing.filter((value) => value !== childId)].slice(0, MAX_RECENT_CHILDREN);
}

export function getChildQuickSwitchFollowUpStatus(child: ChildProfile, now = new Date()): ChildQuickSwitchFollowUpStatus {
  if (!child.nextAssessmentDueDate) return "none";
  const dueAt = Date.parse(child.nextAssessmentDueDate);
  if (Number.isNaN(dueAt)) return "none";

  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const deltaMs = dueAt - startOfToday.getTime();

  if (deltaMs < 0) return "overdue";
  if (deltaMs <= DUE_SOON_WINDOW_DAYS * 24 * 60 * 60 * 1000) return "due_soon";
  return "none";
}

export function buildChildQuickSwitchTargets(child: ChildProfile, canWriteAssessments = false): ChildQuickSwitchTarget[] {
  const childId = child._id || "";
  if (!childId) return [];

  const targets: ChildQuickSwitchTarget[] = [{ kind: "child", href: `/dashboard/children/${childId}` }];

  if (child.latestRecordId) {
    targets.push({ kind: "record", href: `/dashboard/records/${child.latestRecordId}` });
  }

  if (getChildQuickSwitchFollowUpStatus(child) !== "none") {
    targets.push({ kind: "follow_up", href: `/dashboard/children/${childId}` });
  }

  if (canWriteAssessments) {
    targets.push({ kind: "survey", href: `/dashboard/assessment?childId=${childId}` });
  }

  return targets;
}

function buildSubtitle(child: ChildProfile) {
  return [child.birthDate, child.ageGroup, child.latestLocation].filter(Boolean).join(" · ");
}

function compareIsoDateDesc(left?: string, right?: string) {
  const leftTime = left ? Date.parse(left) : 0;
  const rightTime = right ? Date.parse(right) : 0;
  return rightTime - leftTime;
}

export function rankChildQuickSwitchResults(
  children: ChildProfile[],
  query: string,
  options: RankChildQuickSwitchResultsOptions = {},
) {
  const tokens = tokenizeQuery(query);
  const recentSet = new Set(options.recentChildIds || []);
  const now = options.now || new Date();

  const ranked = children
    .map((child) => {
      const name = normalizeSearchValue(child.name);
      const kidexId = normalizeSearchValue(child.kidexId);
      const birthDate = normalizeSearchValue(child.birthDate);
      const ageGroup = normalizeSearchValue(child.ageGroup);
      const location = normalizeSearchValue(child.latestLocation);
      const haystack = [name, kidexId, birthDate, ageGroup, location].filter(Boolean).join(" ");
      const recent = child._id ? recentSet.has(child._id) : false;
      const followUpStatus = getChildQuickSwitchFollowUpStatus(child, now);
      const matchedFields = new Set<string>();
      let score = 0;

      if (tokens.length === 0) {
        if (recent) score += 70;
        if (followUpStatus === "overdue") score += 110;
        if (followUpStatus === "due_soon") score += 60;
        if (child.latestRecordId) score += 20;
      }

      for (const token of tokens) {
        let matched = false;

        if (name.startsWith(token)) {
          score += 120;
          matched = true;
          matchedFields.add("name");
        } else if (name.includes(token)) {
          score += 90;
          matched = true;
          matchedFields.add("name");
        }

        if (kidexId && kidexId.includes(token)) {
          score += 80;
          matched = true;
          matchedFields.add("kidexId");
        }

        if (birthDate && birthDate.includes(token)) {
          score += 55;
          matched = true;
          matchedFields.add("birthDate");
        }

        if (ageGroup && ageGroup.includes(token)) {
          score += 35;
          matched = true;
          matchedFields.add("ageGroup");
        }

        if (location && location.includes(token)) {
          score += 30;
          matched = true;
          matchedFields.add("location");
        }

        if (!matched && !haystack.includes(token)) {
          score = -1;
          break;
        }
      }

      if (score < 0) return null;
      if (recent) score += 20;
      if (followUpStatus === "overdue") score += 25;
      if (followUpStatus === "due_soon") score += 10;
      if (child.latestRecordId) score += 5;

      const targets = buildChildQuickSwitchTargets(child, options.canWriteAssessments);
      const primaryTarget =
        targets.find((target) => target.kind === "follow_up") ||
        targets.find((target) => target.kind === "record") ||
        targets[0];

      if (!primaryTarget) return null;

      return {
        child,
        score,
        matchedFields: Array.from(matchedFields),
        subtitle: buildSubtitle(child),
        followUpStatus,
        recent,
        targets,
        primaryTarget,
      } satisfies ChildQuickSwitchResult;
    })
    .filter((value): value is ChildQuickSwitchResult => Boolean(value));

  return ranked.sort((left, right) => {
    if (right.score !== left.score) return right.score - left.score;

    if (left.followUpStatus !== right.followUpStatus) {
      const priority = { overdue: 2, due_soon: 1, none: 0 } as const;
      return priority[right.followUpStatus] - priority[left.followUpStatus];
    }

    const assessmentDateCompare = compareIsoDateDesc(left.child.latestAssessmentAt, right.child.latestAssessmentAt);
    if (assessmentDateCompare !== 0) return assessmentDateCompare;

    return left.child.name.localeCompare(right.child.name);
  });
}
