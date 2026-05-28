import { getActiveVariantName, getVariantForVersion, type StandardsConfiguration, type StandardsVersion } from "@/lib/standards-config";

export interface DomainStandard {
  target: number;
  min: number;
}

export interface AgeGroupStandard {
  movement: DomainStandard;
  social: DomainStandard;
  mental: DomainStandard;
  ski: DomainStandard;
}

export const standards: Record<string, AgeGroupStandard> = {
  "4-6": {
    movement: { target: 4.5, min: 3.0 },
    social: { target: 4.0, min: 2.5 },
    mental: { target: 3.5, min: 2.0 },
    ski: { target: 4.0, min: 2.5 }
  },
  "7-9": {
    movement: { target: 5.0, min: 3.5 },
    social: { target: 4.5, min: 3.0 },
    mental: { target: 4.0, min: 2.5 },
    ski: { target: 4.5, min: 3.0 }
  },
  "10-12": {
    movement: { target: 5.5, min: 4.0 },
    social: { target: 5.0, min: 3.5 },
    mental: { target: 4.5, min: 3.0 },
    ski: { target: 5.0, min: 3.5 }
  }
};

export function getStandardForAgeGroup(ageGroup: string): AgeGroupStandard | null {
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem("kidex-settings-local");
      if (raw) {
        const parsed = JSON.parse(raw) as { standards?: { activeVersion?: string; versions?: Record<string, StandardsVersion> } };
        const active = parsed.standards?.activeVersion;
        const version = active ? parsed.standards?.versions?.[active] : undefined;
        const variant = getVariantForVersion(version);
        if (variant && (ageGroup === "4-6" || ageGroup === "7-9" || ageGroup === "10-12")) return variant[ageGroup];
      }
    } catch {
      // Ignore malformed local settings and fall back to the bundled defaults.
    }
  }
  return standards[ageGroup] || null;
}

export function getStandardForAssessment(
  configuration: StandardsConfiguration | undefined,
  versionName: string | undefined,
  ageGroup: string,
  variantName?: string,
): AgeGroupStandard | null {
  if (configuration && (ageGroup === "4-6" || ageGroup === "7-9" || ageGroup === "10-12")) {
    const requestedVersion = versionName && configuration.versions[versionName]
      ? configuration.versions[versionName]
      : configuration.versions[configuration.activeVersion];
    const resolvedVariant = getVariantForVersion(
      requestedVersion,
      variantName || getActiveVariantName(requestedVersion),
    );
    if (resolvedVariant?.[ageGroup]) {
      return resolvedVariant[ageGroup];
    }
  }
  return getStandardForAgeGroup(ageGroup);
}
