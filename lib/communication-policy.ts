export interface CommunicationPolicy {
  quietHoursStart: string;
  quietHoursEnd: string;
  autoHoldDuringQuietHours: boolean;
  requireCaregiverVisibilityForFamilyMessages: boolean;
  allowFamilyAnnouncements: boolean;
}

export type CommunicationCategory = "internal_note" | "caregiver_update" | "family_announcement";
export type CommunicationDeliveryStatus = "logged" | "scheduled_quiet_hours";

export const DEFAULT_COMMUNICATION_POLICY: CommunicationPolicy = {
  quietHoursStart: "20:00",
  quietHoursEnd: "07:00",
  autoHoldDuringQuietHours: true,
  requireCaregiverVisibilityForFamilyMessages: true,
  allowFamilyAnnouncements: true,
};

function stringValue(value: unknown, fallback: string): string {
  return typeof value === "string" && /^\d{2}:\d{2}$/.test(value) ? value : fallback;
}

export function normalizeCommunicationPolicy(input: unknown): CommunicationPolicy {
  const data = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  return {
    quietHoursStart: stringValue(data.quietHoursStart, DEFAULT_COMMUNICATION_POLICY.quietHoursStart),
    quietHoursEnd: stringValue(data.quietHoursEnd, DEFAULT_COMMUNICATION_POLICY.quietHoursEnd),
    autoHoldDuringQuietHours: typeof data.autoHoldDuringQuietHours === "boolean"
      ? data.autoHoldDuringQuietHours
      : DEFAULT_COMMUNICATION_POLICY.autoHoldDuringQuietHours,
    requireCaregiverVisibilityForFamilyMessages: typeof data.requireCaregiverVisibilityForFamilyMessages === "boolean"
      ? data.requireCaregiverVisibilityForFamilyMessages
      : DEFAULT_COMMUNICATION_POLICY.requireCaregiverVisibilityForFamilyMessages,
    allowFamilyAnnouncements: typeof data.allowFamilyAnnouncements === "boolean"
      ? data.allowFamilyAnnouncements
      : DEFAULT_COMMUNICATION_POLICY.allowFamilyAnnouncements,
  };
}

function minutesFromTime(value: string): number {
  const [hours, minutes] = value.split(":").map((part) => Number(part));
  return (hours * 60) + minutes;
}

export function isWithinQuietHours(policy: CommunicationPolicy, at = new Date()): boolean {
  const now = at.getHours() * 60 + at.getMinutes();
  const start = minutesFromTime(policy.quietHoursStart);
  const end = minutesFromTime(policy.quietHoursEnd);
  if (start === end) return false;
  if (start < end) return now >= start && now < end;
  return now >= start || now < end;
}

export function determineCommunicationDeliveryStatus(
  policy: CommunicationPolicy,
  at = new Date(),
): CommunicationDeliveryStatus {
  return policy.autoHoldDuringQuietHours && isWithinQuietHours(policy, at)
    ? "scheduled_quiet_hours"
    : "logged";
}
