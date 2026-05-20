import { describe, expect, it } from "vitest";

import { buildCultureAnalytics, createCultureSurveyLaunch, summarizeCultureLaunch } from "./culture-surveys";

describe("culture surveys", () => {
  it("hides launch-level aggregates below the anonymity threshold", () => {
    const launch = createCultureSurveyLaunch({
      institutionId: "default",
      title: "Athlete pulse",
      scopeLabel: "U10 Blue",
      targetRole: "athlete",
      minResponses: 5,
    });
    launch.responses = [
      {
        submittedAt: "2026-05-20T10:00:00.000Z",
        targetRole: "athlete",
        answers: {
          trust: 4,
          belonging: 4,
          enjoyment: 5,
          voice: 4,
          safety: 4,
          adultBehavior: 4,
          communication: 4,
          pressure: 2,
        },
      },
      {
        submittedAt: "2026-05-20T10:05:00.000Z",
        targetRole: "athlete",
        answers: {
          trust: 4,
          belonging: 4,
          enjoyment: 4,
          voice: 3,
          safety: 4,
          adultBehavior: 4,
          communication: 4,
          pressure: 2,
        },
      },
    ];

    const summary = summarizeCultureLaunch(launch);
    expect(summary.publishable).toBe(false);
    expect(summary.cultureIndex).toBeNull();
  });

  it("builds publishable trend and role comparison once thresholds are met", () => {
    const launch = createCultureSurveyLaunch({
      institutionId: "default",
      title: "Athlete pulse",
      scopeLabel: "U10 Blue",
      targetRole: "athlete",
      minResponses: 3,
    });
    launch.responses = [1, 2, 3].map((index) => ({
      submittedAt: `2026-05-2${index}T10:00:00.000Z`,
      targetRole: "athlete" as const,
      answers: {
        trust: 4,
        belonging: 4,
        enjoyment: 5,
        voice: 4,
        safety: 4,
        adultBehavior: 4,
        communication: 4,
        pressure: 2,
      },
    }));

    const analytics = buildCultureAnalytics([launch]);
    expect(analytics.headline.publishableLaunches).toBe(1);
    expect(analytics.roleComparison.find((entry) => entry.role === "athlete")?.index).toBeGreaterThan(4);
    expect(analytics.scorecards[0]?.scopeLabel).toBe("U10 Blue");
  });
});
