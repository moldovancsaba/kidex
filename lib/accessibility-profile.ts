export const FAMILY_VIEW_MODES = ["standard", "simplified"] as const;
export const COMMUNICATION_SUPPORTS = ["standard", "plain_language", "visual_supports", "supported_conversation"] as const;
export const ACCOMMODATION_OPTIONS = [
  "visual_schedule",
  "quiet_space",
  "movement_breaks",
  "step_by_step_instructions",
  "extra_processing_time",
  "caregiver_present",
] as const;

export type FamilyViewMode = (typeof FAMILY_VIEW_MODES)[number];
export type CommunicationSupport = (typeof COMMUNICATION_SUPPORTS)[number];
export type AccommodationOption = (typeof ACCOMMODATION_OPTIONS)[number];

export interface ChildAccessibilityProfile {
  familyViewMode: FamilyViewMode;
  communicationSupport: CommunicationSupport;
  accommodations: AccommodationOption[];
  participationBarriers: string;
  supportNotes: string;
  strengthsNotes: string;
}

function stringValue(value: unknown, max = 4000): string {
  return typeof value === "string" ? value.slice(0, max).trim() : "";
}

function isOneOf<T extends readonly string[]>(values: T, value: string): value is T[number] {
  return (values as readonly string[]).includes(value);
}

export function defaultAccessibilityProfile(): ChildAccessibilityProfile {
  return {
    familyViewMode: "standard",
    communicationSupport: "standard",
    accommodations: [],
    participationBarriers: "",
    supportNotes: "",
    strengthsNotes: "",
  };
}

export function normalizeAccessibilityProfile(input: unknown): ChildAccessibilityProfile {
  const data = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const familyViewMode = stringValue(data.familyViewMode, 40);
  const communicationSupport = stringValue(data.communicationSupport, 80);
  const accommodations = Array.isArray(data.accommodations)
    ? data.accommodations
        .map((entry) => stringValue(entry, 80))
        .filter((entry): entry is AccommodationOption => isOneOf(ACCOMMODATION_OPTIONS, entry))
    : [];

  return {
    familyViewMode: isOneOf(FAMILY_VIEW_MODES, familyViewMode) ? familyViewMode : "standard",
    communicationSupport: isOneOf(COMMUNICATION_SUPPORTS, communicationSupport) ? communicationSupport : "standard",
    accommodations: Array.from(new Set(accommodations)),
    participationBarriers: stringValue(data.participationBarriers),
    supportNotes: stringValue(data.supportNotes),
    strengthsNotes: stringValue(data.strengthsNotes),
  };
}
