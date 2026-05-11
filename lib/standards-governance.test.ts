import { describe, expect, it } from "vitest";

import { computeReadinessImpactPreview, formulaWeightPercentages, summarizeVersionThresholds, validateStandardsVersion } from "./standards-governance";
import { DEFAULT_KIDEX_SETTINGS } from "@/services/settings-service";

describe("standards governance helpers", () => {
  it("summarizes thresholds and percentages from the default version", () => {
    const version = DEFAULT_KIDEX_SETTINGS.standards.versions.v1;
    expect(summarizeVersionThresholds(version)).toEqual({
      averageTarget: 4.5,
      averageMinimum: 3,
    });
    expect(formulaWeightPercentages(version.formula)).toEqual({
      movement: 50,
      social: 30,
      mental: 20,
    });
  });

  it("flags invalid thresholds and unbalanced formula weights", () => {
    const version = structuredClone(DEFAULT_KIDEX_SETTINGS.standards.versions.v1);
    version["4-6"].movement.min = 5.2;
    version.variants!.general["4-6"].movement.min = 5.2;
    version.formula = {
      ...version.formula!,
      domainWeights: {
        movement: 0.8,
        social: 0.4,
        mental: 0.2,
      },
    };
    version.meta = { ...version.meta, notes: "" };

    const issues = validateStandardsVersion(version);
    expect(issues.some((issue) => issue.message.includes("minimum is greater than target"))).toBe(true);
    expect(issues.some((issue) => issue.message.includes("weights should sum to 1"))).toBe(true);
    expect(issues.some((issue) => issue.message.includes("Version notes are empty"))).toBe(true);
  });

  it("validates variant metadata and can target a specific variant", () => {
    const version = structuredClone(DEFAULT_KIDEX_SETTINGS.standards.versions.v1);
    version.variants!.pilot = structuredClone(version.variants!.general);
    version.variants!.pilot.meta = {
      label: "",
      evidenceStatus: "experimental",
      applicability: "",
      pathway: "team-sport",
      notes: "",
    };

    const issues = validateStandardsVersion(version, "pilot");
    expect(issues.some((issue) => issue.message.includes("Variant label is empty"))).toBe(true);
    expect(issues.some((issue) => issue.message.includes("Variant applicability is empty"))).toBe(true);
  });

  it("computes readiness impact across age-group-specific ski thresholds", () => {
    const baseline = structuredClone(DEFAULT_KIDEX_SETTINGS.standards.versions.v1);
    const candidate = structuredClone(DEFAULT_KIDEX_SETTINGS.standards.versions.v1);
    candidate["4-6"].ski.min = 3.2;
    candidate["10-12"].ski.min = 3.2;
    candidate.variants!.general["4-6"].ski.min = 3.2;
    candidate.variants!.general["10-12"].ski.min = 3.2;

    expect(computeReadinessImpactPreview(baseline, candidate, [
      { child: { ageGroup: "4-6" }, computed: { ski: 3.1 } },
      { child: { ageGroup: "10-12" }, computed: { ski: 3.3 } },
      { child: { ageGroup: "7-9" }, computed: { ski: 2.9 } },
    ])).toEqual({
      readyToDeveloping: 1,
      developingToReady: 1,
      total: 3,
    });
  });
});
