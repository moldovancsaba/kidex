import { describe, expect, it } from "vitest";

import { buildParentImprovementGuidance } from "./parent-guidance";
import type { DevelopmentPlan } from "./development-plans";
import type { RecommendationSummary } from "./recommendations";
import type { ChildSupportWorkspace } from "./support-workspace";

const recommendationSummary: RecommendationSummary = {
  readinessStatus: "developing",
  standardsVersionUsed: "v1",
  standardsVariantUsed: "general",
  confidenceContext: {
    lowConfidenceCount: 1,
    mediumConfidenceCount: 6,
    highConfidenceCount: 2,
    missingConfidenceCount: 0,
    lowConfidenceItems: ["Self-regulation"],
  },
  mentalWellbeing: {
    phase: "follow_up",
    mentalSkillsAverage: 2.7,
    baselineMentalSkillsAverage: 2.9,
    checkInAverage: 2.6,
    recoveryAverage: 2.4,
    disagreementIndex: 0.9,
    riskLevel: "high",
    goalModules: ["Positive self-talk reset"],
    flaggedSignals: ["Urgent follow-up concern"],
  },
  ski: {
    current: 3.1,
    baseline: 2.9,
    min: 3,
    target: 4.5,
    gapToMin: -0.1,
    gapToTarget: 1.4,
  },
  domainBenchmarks: [
    { domain: "movement", label: "Movement", average: 3.4, min: 3, target: 4.5, gapToMin: 0.4, gapToTarget: 1.1, status: "developing" },
    { domain: "social", label: "Social", average: 3.2, min: 3, target: 4.5, gapToMin: 0.2, gapToTarget: 1.3, status: "developing" },
    { domain: "mental", label: "Mental", average: 2.6, min: 3, target: 4.5, gapToMin: -0.4, gapToTarget: 1.9, status: "below_min" },
  ],
  strengths: [{ key: "balance", label: "Balance", score: 4, domain: "movement" }],
  focusAreas: [
    { key: "self_regulation", label: "Self-regulation", score: 2, domain: "mental" },
    { key: "confidence", label: "Confidence", score: 2, domain: "mental" },
  ],
  recommendations: [
    {
      id: "mental-below-min",
      title: "Mental stabilization",
      rationale: "Mental is below minimum.",
      domain: "mental",
      severity: "high",
      evidenceStrength: "high",
      focusItems: [{ key: "self_regulation", label: "Self-regulation", score: 2, domain: "mental" }],
      sourceEvidence: [],
    },
    {
      id: "recovery-support",
      title: "Recovery and load adjustment support",
      rationale: "Recovery strain is elevated.",
      severity: "high",
      evidenceStrength: "high",
      focusItems: [],
      sourceEvidence: [],
    },
    {
      id: "wellbeing-escalation",
      title: "Immediate wellbeing follow-up",
      rationale: "High concern signals need adult follow-up.",
      severity: "high",
      evidenceStrength: "high",
      focusItems: [],
      sourceEvidence: [],
    },
  ],
};

const plan: DevelopmentPlan = {
  childId: "child-1",
  assessmentId: "assessment-1",
  status: "draft",
  summary: "Test plan",
  assignments: [
    {
      id: "assignment-1",
      title: "Mental stabilization: Self-regulation",
      notes: "Use one short self-regulation home routine and notice which prompt helps most.",
      audience: "family",
      status: "pending",
      focusAreaIds: ["self_regulation"],
    },
  ],
  checkpoints: [],
  progressNotes: "",
  createdAt: "2026-05-13T10:00:00.000Z",
  updatedAt: "2026-05-13T10:00:00.000Z",
};

const supportWorkspace: ChildSupportWorkspace = {
  childId: "child-1",
  caregiverTools: [
    {
      id: "tool-1",
      templateId: "confidence",
      title: "Calm confidence support",
      description: "desc",
      audience: "caregiver",
      focusTags: ["mental"],
      status: "recommended",
      assignedAt: "2026-05-13T10:00:00.000Z",
      notes: "",
    },
  ],
  coachTools: [],
  microLearning: [],
  referrals: [],
  evidenceJournal: [],
  createdAt: "2026-05-13T10:00:00.000Z",
  updatedAt: "2026-05-13T10:00:00.000Z",
};

describe("buildParentImprovementGuidance", () => {
  it("builds practical weekly actions linked to plan and caregiver tools", () => {
    const guidance = buildParentImprovementGuidance({
      recommendationSummary,
      plan,
      supportWorkspace,
    });

    expect(guidance).toHaveLength(3);
    expect(guidance[0]?.title).toContain("attention and self-management");
    expect(guidance[0]?.thisWeek[0]).toContain("home routine");
    expect(guidance[0]?.linkedSupport).toContain("Mental stabilization: Self-regulation");
    expect(guidance[0]?.linkedSupport).toContain("Calm confidence support");
  });

  it("adds clear boundary notes for recovery and escalation items", () => {
    const guidance = buildParentImprovementGuidance({ recommendationSummary });

    expect(guidance.find((entry) => entry.id === "recovery-support")?.boundaryNote).toContain("adult review");
    expect(guidance.find((entry) => entry.id === "wellbeing-escalation")?.boundaryNote).toContain("timely adult follow-up");
  });
});
