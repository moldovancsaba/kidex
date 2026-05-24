export type AssessmentDomain = "movement" | "social" | "mental";

const DOMAIN_COLORS: Record<AssessmentDomain, string> = {
  movement: "var(--mantine-color-blue-6)",
  social: "var(--mantine-color-kidex-5)",
  mental: "var(--mantine-color-orange-5)",
};

export function getDomainMainColor(domain: AssessmentDomain) {
  return DOMAIN_COLORS[domain];
}

export function getDomainChipStyles(domain: AssessmentDomain) {
  const baseColor = getDomainMainColor(domain);
  return {
    color: baseColor,
    borderColor: baseColor,
    backgroundColor: `color-mix(in srgb, ${baseColor} 12%, transparent)`,
    label: {
      fontWeight: 600,
    },
  };
}
