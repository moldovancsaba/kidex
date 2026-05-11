import { describe, expect, it } from "vitest";

import { normalizeStandardsConfiguration } from "./standards-config";
import { DEFAULT_KIDEX_SETTINGS } from "@/services/settings-service";

describe("normalizeStandardsConfiguration", () => {
  it("keeps active version valid and clamps thresholds", () => {
    const normalized = normalizeStandardsConfiguration(
      {
        activeVersion: "v2",
        versions: {
          v2: {
            meta: { status: "published", notes: "Pilot" },
            formula: {
              domainWeights: { movement: 2, social: 1, mental: 1 },
              readinessMetric: "ski",
              readinessThreshold: "min",
              aspirationThreshold: "target",
            },
            "4-6": { movement: { target: 4, min: 5 }, social: { target: 3, min: 2 }, mental: { target: 2, min: 1 }, ski: { target: 3, min: 2 } },
            "7-9": { movement: { target: 4, min: 3 }, social: { target: 4, min: 2 }, mental: { target: 3, min: 2 }, ski: { target: 4, min: 5 } },
            "10-12": { movement: { target: 5, min: 4 }, social: { target: 5, min: 4 }, mental: { target: 4, min: 3 }, ski: { target: 5, min: 4 } },
          },
        },
      },
      DEFAULT_KIDEX_SETTINGS.standards,
      "owner@kidex.test",
    );

    expect(normalized.activeVersion).toBe("v2");
    expect(normalized.versions.v2["4-6"].movement.min).toBe(4);
    expect(normalized.versions.v2["7-9"].ski.min).toBe(4);
    expect(normalized.versions.v2.meta?.publishedBy).toBe("owner@kidex.test");
    expect(normalized.versions.v2.formula?.domainWeights).toEqual({
      movement: 0.5,
      social: 0.25,
      mental: 0.25,
    });
  });

  it("falls back to the default active version when an unknown version is requested", () => {
    const normalized = normalizeStandardsConfiguration(
      {
        activeVersion: "missing",
        versions: {},
      },
      DEFAULT_KIDEX_SETTINGS.standards,
    );

    expect(normalized.activeVersion).toBe(DEFAULT_KIDEX_SETTINGS.standards.activeVersion);
  });
});
