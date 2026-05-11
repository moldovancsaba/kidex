export const FAMILY_RELATIONSHIPS = [
  "mother",
  "father",
  "guardian",
  "grandparent",
  "sibling",
  "pedagogue",
  "therapist",
  "foster_carer",
  "other",
] as const;

export const FAMILY_ACCESS_LEVELS = ["routine", "full", "restricted"] as const;
export const FAMILY_CAREGIVER_STATUSES = ["active", "paused"] as const;
export const FAMILY_INVITE_STATUSES = ["not_invited", "invited", "revoked"] as const;

export type FamilyRelationship = typeof FAMILY_RELATIONSHIPS[number];
export type FamilyAccessLevel = typeof FAMILY_ACCESS_LEVELS[number];
export type FamilyCaregiverStatus = typeof FAMILY_CAREGIVER_STATUSES[number];
export type FamilyInviteStatus = typeof FAMILY_INVITE_STATUSES[number];

export interface FamilyContactPreferences {
  email: boolean;
  phone: boolean;
  sms: boolean;
}

export interface FamilyCaregiver {
  id: string;
  name: string;
  email: string;
  phone: string;
  preferredLocale: "en" | "hu" | "ar";
  relationship: FamilyRelationship;
  accessLevel: FamilyAccessLevel;
  status: FamilyCaregiverStatus;
  canReceiveReports: boolean;
  canReceiveScheduling: boolean;
  inviteStatus: FamilyInviteStatus;
  lastInviteAt?: string;
  notes: string;
  contactPreferences: FamilyContactPreferences;
}

export type FamilyAccessEventType =
  | "caregiver_added"
  | "caregiver_updated"
  | "caregiver_removed"
  | "access_changed";

export interface FamilyAccessEvent {
  id: string;
  caregiverId: string;
  caregiverName: string;
  createdAt: string;
  actorEmail?: string;
  eventType: FamilyAccessEventType;
  summary: string;
}

function stringValue(value: unknown, max = 5000): string {
  return typeof value === "string" ? value.slice(0, max) : "";
}

function booleanValue(value: unknown): boolean {
  return typeof value === "boolean" ? value : false;
}

function isOneOf<T extends readonly string[]>(values: T, value: string): value is T[number] {
  return (values as readonly string[]).includes(value);
}

function normalizeContactPreferences(value: unknown): FamilyContactPreferences {
  const entry = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  return {
    email: booleanValue(entry.email),
    phone: booleanValue(entry.phone),
    sms: booleanValue(entry.sms),
  };
}

export function normalizeFamilyCaregivers(value: unknown): FamilyCaregiver[] {
  if (!Array.isArray(value)) return [];

  const seenKeys = new Set<string>();

  return value
    .flatMap((entry) => {
      const caregiver = entry && typeof entry === "object" ? (entry as Record<string, unknown>) : {};
      const name = stringValue(caregiver.name, 240).trim();
      const email = stringValue(caregiver.email, 240).trim().toLowerCase();
      const phone = stringValue(caregiver.phone, 80).trim();
      if (!name) return [];

      const id = stringValue(caregiver.id, 120).trim() || crypto.randomUUID();
      const dedupeKey = email || `${name.toLowerCase()}::${phone}`;
      if (dedupeKey && seenKeys.has(dedupeKey)) return [];
      if (dedupeKey) seenKeys.add(dedupeKey);

      const relationshipValue = stringValue(caregiver.relationship, 80).trim();
      const accessLevelValue = stringValue(caregiver.accessLevel, 80).trim();
      const statusValue = stringValue(caregiver.status, 80).trim();
      const inviteStatusValue = stringValue(caregiver.inviteStatus, 80).trim();

      return [{
        id,
        name,
        email,
        phone,
        preferredLocale: caregiver.preferredLocale === "hu" || caregiver.preferredLocale === "ar" ? caregiver.preferredLocale : "en",
        relationship: isOneOf(FAMILY_RELATIONSHIPS, relationshipValue) ? relationshipValue : "guardian",
        accessLevel: isOneOf(FAMILY_ACCESS_LEVELS, accessLevelValue) ? accessLevelValue : "routine",
        status: isOneOf(FAMILY_CAREGIVER_STATUSES, statusValue) ? statusValue : "active",
        canReceiveReports: booleanValue(caregiver.canReceiveReports),
        canReceiveScheduling: booleanValue(caregiver.canReceiveScheduling),
        inviteStatus: isOneOf(FAMILY_INVITE_STATUSES, inviteStatusValue) ? inviteStatusValue : "not_invited",
        lastInviteAt: stringValue(caregiver.lastInviteAt, 80).trim() || undefined,
        notes: stringValue(caregiver.notes),
        contactPreferences: normalizeContactPreferences(caregiver.contactPreferences),
      } satisfies FamilyCaregiver];
    })
    .slice(0, 12);
}

function stableCaregiverSnapshot(caregiver: FamilyCaregiver) {
  return JSON.stringify({
    name: caregiver.name,
    email: caregiver.email,
    phone: caregiver.phone,
    preferredLocale: caregiver.preferredLocale,
    relationship: caregiver.relationship,
    accessLevel: caregiver.accessLevel,
    status: caregiver.status,
    canReceiveReports: caregiver.canReceiveReports,
    canReceiveScheduling: caregiver.canReceiveScheduling,
    inviteStatus: caregiver.inviteStatus,
    lastInviteAt: caregiver.lastInviteAt || "",
    notes: caregiver.notes,
    contactPreferences: caregiver.contactPreferences,
  });
}

function accessSnapshot(caregiver: FamilyCaregiver) {
  return JSON.stringify({
    accessLevel: caregiver.accessLevel,
    status: caregiver.status,
    canReceiveReports: caregiver.canReceiveReports,
    canReceiveScheduling: caregiver.canReceiveScheduling,
    inviteStatus: caregiver.inviteStatus,
    lastInviteAt: caregiver.lastInviteAt || "",
    contactPreferences: caregiver.contactPreferences,
  });
}

export function buildFamilyAccessEvents(input: {
  previous: FamilyCaregiver[];
  next: FamilyCaregiver[];
  actorEmail?: string;
  createdAt?: string;
}): FamilyAccessEvent[] {
  const previousById = new Map(input.previous.map((caregiver) => [caregiver.id, caregiver]));
  const nextById = new Map(input.next.map((caregiver) => [caregiver.id, caregiver]));
  const createdAt = input.createdAt || new Date().toISOString();
  const events: FamilyAccessEvent[] = [];

  for (const caregiver of input.next) {
    const previous = previousById.get(caregiver.id);
    if (!previous) {
      events.push({
        id: crypto.randomUUID(),
        caregiverId: caregiver.id,
        caregiverName: caregiver.name,
        createdAt,
        actorEmail: input.actorEmail,
        eventType: "caregiver_added",
        summary: `Added caregiver ${caregiver.name} (${caregiver.relationship}) with ${caregiver.accessLevel} family access.`,
      });
      continue;
    }

    if (stableCaregiverSnapshot(previous) === stableCaregiverSnapshot(caregiver)) {
      continue;
    }

    const eventType: FamilyAccessEventType =
      accessSnapshot(previous) === accessSnapshot(caregiver) ? "caregiver_updated" : "access_changed";
    const summary = eventType === "access_changed"
      ? `Changed caregiver access for ${caregiver.name} to ${caregiver.accessLevel} (${caregiver.status}).`
      : `Updated caregiver profile for ${caregiver.name}.`;

    events.push({
      id: crypto.randomUUID(),
      caregiverId: caregiver.id,
      caregiverName: caregiver.name,
      createdAt,
      actorEmail: input.actorEmail,
      eventType,
      summary,
    });
  }

  for (const caregiver of input.previous) {
    if (nextById.has(caregiver.id)) continue;
    events.push({
      id: crypto.randomUUID(),
      caregiverId: caregiver.id,
      caregiverName: caregiver.name,
      createdAt,
      actorEmail: input.actorEmail,
      eventType: "caregiver_removed",
      summary: `Removed caregiver ${caregiver.name} from the family access list.`,
    });
  }

  return events;
}

export function mergeFamilyAccessHistory(
  existing: FamilyAccessEvent[] | undefined,
  nextEvents: FamilyAccessEvent[],
  maxEntries = 100,
): FamilyAccessEvent[] {
  const current = Array.isArray(existing) ? existing : [];
  if (nextEvents.length === 0) return current;
  return [...current, ...nextEvents].slice(-maxEntries);
}

export function createEmptyFamilyCaregiver(): FamilyCaregiver {
  return {
    id: crypto.randomUUID(),
    name: "",
    email: "",
    phone: "",
    preferredLocale: "en",
    relationship: "guardian",
    accessLevel: "routine",
    status: "active",
    canReceiveReports: false,
    canReceiveScheduling: false,
    inviteStatus: "not_invited",
    notes: "",
    contactPreferences: {
      email: true,
      phone: false,
      sms: false,
    },
  };
}
