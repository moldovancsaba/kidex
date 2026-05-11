export const CONSENT_POLICY_KEYS = [
  "mediaCapture",
  "familyReport",
  "dataSharing",
  "publicity",
] as const;

export type ConsentPolicyKey = typeof CONSENT_POLICY_KEYS[number];

export interface ConsentPolicyEntry {
  granted: boolean;
  effectiveFrom?: string;
  expiresAt?: string;
  notes: string;
  updatedAt?: string;
  updatedBy?: string;
  approvedByCaregiverId?: string;
  approvedByLabel?: string;
}

export interface ChildConsentPolicy {
  mediaCapture: ConsentPolicyEntry;
  familyReport: ConsentPolicyEntry;
  dataSharing: ConsentPolicyEntry;
  publicity: ConsentPolicyEntry;
}

export interface ConsentHistoryEvent {
  id: string;
  key: ConsentPolicyKey;
  createdAt: string;
  actorEmail?: string;
  previousGranted: boolean;
  nextGranted: boolean;
  previousExpiresAt?: string;
  nextExpiresAt?: string;
  summary: string;
}

export interface AssessmentConsentSnapshot {
  capturedAt: string;
  mediaCapture: boolean;
  familyReport: boolean;
  dataSharing: boolean;
  publicity: boolean;
}

export interface ConsentAlert {
  key: ConsentPolicyKey;
  severity: "warning" | "error";
  reason: "missing" | "future" | "expired" | "expiring_soon";
}

function stringValue(value: unknown, max = 5000): string {
  return typeof value === "string" ? value.slice(0, max).trim() : "";
}

function booleanValue(value: unknown): boolean {
  return typeof value === "boolean" ? value : false;
}

function normalizeConsentEntry(value: unknown, granted: boolean): ConsentPolicyEntry {
  const input = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  return {
    granted,
    effectiveFrom: stringValue(input.effectiveFrom, 80) || undefined,
    expiresAt: stringValue(input.expiresAt, 80) || undefined,
    notes: stringValue(input.notes),
    updatedAt: stringValue(input.updatedAt, 80) || undefined,
    updatedBy: stringValue(input.updatedBy, 240) || undefined,
    approvedByCaregiverId: stringValue(input.approvedByCaregiverId, 120) || undefined,
    approvedByLabel: stringValue(input.approvedByLabel, 240) || undefined,
  };
}

export function defaultConsentPolicy(input?: {
  consentPhoto?: boolean;
  consentReport?: boolean;
}): ChildConsentPolicy {
  const mediaGranted = Boolean(input?.consentPhoto);
  const reportGranted = Boolean(input?.consentReport);
  return {
    mediaCapture: normalizeConsentEntry({}, mediaGranted),
    familyReport: normalizeConsentEntry({}, reportGranted),
    dataSharing: normalizeConsentEntry({}, false),
    publicity: normalizeConsentEntry({}, false),
  };
}

export function normalizeConsentPolicy(
  value: unknown,
  legacy?: { consentPhoto?: boolean; consentReport?: boolean },
): ChildConsentPolicy {
  const input = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const defaults = defaultConsentPolicy(legacy);
  return {
    mediaCapture: normalizeConsentEntry(
      input.mediaCapture,
      typeof (input.mediaCapture as Record<string, unknown> | undefined)?.granted === "boolean"
        ? booleanValue((input.mediaCapture as Record<string, unknown>).granted)
        : defaults.mediaCapture.granted,
    ),
    familyReport: normalizeConsentEntry(
      input.familyReport,
      typeof (input.familyReport as Record<string, unknown> | undefined)?.granted === "boolean"
        ? booleanValue((input.familyReport as Record<string, unknown>).granted)
        : defaults.familyReport.granted,
    ),
    dataSharing: normalizeConsentEntry(
      input.dataSharing,
      booleanValue((input.dataSharing as Record<string, unknown> | undefined)?.granted),
    ),
    publicity: normalizeConsentEntry(
      input.publicity,
      booleanValue((input.publicity as Record<string, unknown> | undefined)?.granted),
    ),
  };
}

export function hasActiveConsent(
  policy: ChildConsentPolicy | undefined,
  key: ConsentPolicyKey,
  at = new Date().toISOString(),
): boolean {
  const entry = policy?.[key];
  if (!entry?.granted) return false;
  if (entry.effectiveFrom && entry.effectiveFrom > at) return false;
  if (entry.expiresAt && entry.expiresAt < at) return false;
  return true;
}

export function deriveLegacyConsents(policy: ChildConsentPolicy | undefined, at = new Date().toISOString()) {
  return {
    consentPhoto: hasActiveConsent(policy, "mediaCapture", at),
    consentReport: hasActiveConsent(policy, "familyReport", at),
  };
}

export function buildAssessmentConsentSnapshot(
  policy: ChildConsentPolicy | undefined,
  capturedAt = new Date().toISOString(),
): AssessmentConsentSnapshot {
  return {
    capturedAt,
    mediaCapture: hasActiveConsent(policy, "mediaCapture", capturedAt),
    familyReport: hasActiveConsent(policy, "familyReport", capturedAt),
    dataSharing: hasActiveConsent(policy, "dataSharing", capturedAt),
    publicity: hasActiveConsent(policy, "publicity", capturedAt),
  };
}

function addDays(input: string, days: number) {
  const date = new Date(input);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}

export function getConsentAlerts(
  policy: ChildConsentPolicy | undefined,
  at = new Date().toISOString(),
): ConsentAlert[] {
  const effectivePolicy = policy || defaultConsentPolicy();
  const alerts: ConsentAlert[] = [];

  for (const key of CONSENT_POLICY_KEYS) {
    const entry = effectivePolicy[key];
    if (!entry.granted) {
      alerts.push({ key, severity: "warning", reason: "missing" });
      continue;
    }
    if (entry.effectiveFrom && entry.effectiveFrom > at) {
      alerts.push({ key, severity: "warning", reason: "future" });
    }
    if (entry.expiresAt && entry.expiresAt < at) {
      alerts.push({ key, severity: "error", reason: "expired" });
      continue;
    }
    if (entry.expiresAt && entry.expiresAt <= addDays(at, 30)) {
      alerts.push({ key, severity: "warning", reason: "expiring_soon" });
    }
  }

  return alerts;
}

function stableEntry(entry: ConsentPolicyEntry) {
  return JSON.stringify({
    granted: entry.granted,
    effectiveFrom: entry.effectiveFrom || "",
    expiresAt: entry.expiresAt || "",
    notes: entry.notes,
    approvedByCaregiverId: entry.approvedByCaregiverId || "",
    approvedByLabel: entry.approvedByLabel || "",
  });
}

export function buildConsentHistoryEvents(input: {
  previous: ChildConsentPolicy | undefined;
  next: ChildConsentPolicy | undefined;
  actorEmail?: string;
  createdAt?: string;
}): ConsentHistoryEvent[] {
  const previous = input.previous || defaultConsentPolicy();
  const next = input.next || defaultConsentPolicy();
  const createdAt = input.createdAt || new Date().toISOString();
  const events: ConsentHistoryEvent[] = [];

  for (const key of CONSENT_POLICY_KEYS) {
    const before = previous[key];
    const after = next[key];
    if (stableEntry(before) === stableEntry(after)) continue;
    events.push({
      id: crypto.randomUUID(),
      key,
      createdAt,
      actorEmail: input.actorEmail,
      previousGranted: before.granted,
      nextGranted: after.granted,
      previousExpiresAt: before.expiresAt,
      nextExpiresAt: after.expiresAt,
      summary: `Updated ${key} consent to ${after.granted ? "granted" : "not granted"}.`,
    });
  }

  return events;
}

export function mergeConsentHistory(
  existing: ConsentHistoryEvent[] | undefined,
  nextEvents: ConsentHistoryEvent[],
  maxEntries = 100,
): ConsentHistoryEvent[] {
  const current = Array.isArray(existing) ? existing : [];
  if (nextEvents.length === 0) return current;
  return [...current, ...nextEvents].slice(-maxEntries);
}
