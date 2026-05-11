export const DEFAULT_INSTITUTION_ID = "default";

export interface InstitutionDefinition {
  id: string;
  name: string;
  status: "active" | "archived";
  notes?: string;
}

export function normalizeInstitutionId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/-+/g, "-");
  return normalized ? normalized : null;
}

export function sanitizeInstitutionIds(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  const normalized = values
    .map((value) => normalizeInstitutionId(value))
    .filter((value): value is string => Boolean(value));
  return Array.from(new Set(normalized));
}

export function normalizePrimaryInstitutionId(value: unknown, institutionIds: readonly string[]): string {
  const normalized = normalizeInstitutionId(value);
  if (normalized && institutionIds.includes(normalized)) return normalized;
  return institutionIds[0] || DEFAULT_INSTITUTION_ID;
}

export function ensureInstitutionIds(values: unknown, primaryInstitutionId?: unknown): {
  institutionIds: string[];
  primaryInstitutionId: string;
} {
  const institutionIds = sanitizeInstitutionIds(values);
  const nextInstitutionIds = institutionIds.length > 0 ? institutionIds : [DEFAULT_INSTITUTION_ID];
  return {
    institutionIds: nextInstitutionIds,
    primaryInstitutionId: normalizePrimaryInstitutionId(primaryInstitutionId, nextInstitutionIds),
  };
}

export function normalizeInstitutionDirectory(values: unknown): InstitutionDefinition[] {
  const rawValues = Array.isArray(values) ? values : [];
  const seen = new Set<string>();
  const institutions: InstitutionDefinition[] = [];

  for (const value of rawValues) {
    const data = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
    const id = normalizeInstitutionId(data.id ?? data.name);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    institutions.push({
      id,
      name: typeof data.name === "string" && data.name.trim() ? data.name.trim() : id,
      status: data.status === "archived" ? "archived" : "active",
      notes: typeof data.notes === "string" && data.notes.trim() ? data.notes.trim() : undefined,
    });
  }

  if (!institutions.some((institution) => institution.id === DEFAULT_INSTITUTION_ID)) {
    institutions.unshift({
      id: DEFAULT_INSTITUTION_ID,
      name: "Default Institution",
      status: "active",
      notes: "Bootstrap fallback institution.",
    });
  }

  return institutions;
}

export function ensureInstitutionMembershipFromDirectory(
  values: unknown,
  primaryInstitutionId: unknown,
  directory: readonly InstitutionDefinition[],
): {
  institutionIds: string[];
  primaryInstitutionId: string;
} {
  const allowedIds = new Set(directory.map((institution) => institution.id));
  const institutionIds = sanitizeInstitutionIds(values).filter((id) => allowedIds.has(id));
  const nextInstitutionIds = institutionIds.length > 0 ? institutionIds : [DEFAULT_INSTITUTION_ID];
  return {
    institutionIds: nextInstitutionIds,
    primaryInstitutionId: normalizePrimaryInstitutionId(primaryInstitutionId, nextInstitutionIds),
  };
}
