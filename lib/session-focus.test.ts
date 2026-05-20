import { describe, expect, it } from "vitest";

import { defaultMentalWellbeingProfile } from "./mental-wellbeing";
import { buildProgressComparisonSummary } from "./progress-comparison";
import { buildSessionFocusPriorities } from "./session-focus";
import type { DevelopmentPlan } from "./development-plans";
import type { RecommendationSummary } from "./recommendations";
import type { ChildSupportWorkspace } from "./support-workspace";
import type { AssessmentRecord } from "@/types/assessment";

const current: AssessmentRecord = {
  _id: "record-2",
  childId: "child-1",
  mode: "rapid",
  child: {
    name: "Child",
    birthDate: "2018-01-01",
    ageGroup: "7-9",
    dominantHand: "",
    dominantEye: "",
    dominantFoot: "",
    knownTraits: "",
    parentSignals: "",
  },
  session: {
    date: "2026-05-15",
    location: "",
    conductor: "",
    observers: "",
    groupSize: "",
    context: "structured",
    consentPhoto: true,
    consentReport: true,
  },
  scores: {},
  notes: { general: "", movement: "", social: "", mental: "", adaptations: "", referral: "" },
  mentalWellbeing: {
    ...defaultMentalWellbeingProfile(),
    phase: "follow_up",
  },
  attachments: [],
  createdAt: "2026-05-15T10:00:00.000Z",
  updatedAt: "2026-05-15T10:00:00.000Z",
  computed: {
    movementAverage: 3.2,
    socialAverage: 3.1,
    mentalAverage: 2.5,
    ski: 3,
    mentalWellbeing: {
      phase: "follow_up",
      mentalSkillsAverage: 2.5,
      checkInAverage: 2.4,
      recoveryAverage: 2.3,
      disagreementIndex: 0.7,
      riskLevel: "high",
      flaggedSignals: ["overload"],
    },
    completion: { done: 12, total: 12 },
  },
};

const baseline: AssessmentRecord = {
  ...current,
  _id: "record-1",
  createdAt: "2026-05-01T10:00:00.000Z",
  computed: {
    movementAverage: 3.8,
    socialAverage: 3.4,
    mentalAverage: 3.4,
    ski: 3.7,
    mentalWellbeing: {
      phase: "baseline",
      mentalSkillsAverage: 3.3,
      checkInAverage: 3.1,
      recoveryAverage: 3.2,
      disagreementIndex: 0.5,
      riskLevel: "low",
      flaggedSignals: [],
    },
    completion: { done: 12, total: 12 },
  },
};

const recommendationSummary: RecommendationSummary = {
  readinessStatus: "below_min",
  standardsVersionUsed: "v1",
  standardsVariantUsed: "general",
  confidenceContext: {
    lowConfidenceCount: 0,
    mediumConfidenceCount: 3,
    highConfidenceCount: 9,
    missingConfidenceCount: 0,
    lowConfidenceItems: [],
  },
  mentalWellbeing: {
    phase: "follow_up",
    mentalSkillsAverage: 2.5,
    baselineMentalSkillsAverage: 3.3,
    checkInAverage: 2.4,
    recoveryAverage: 2.3,
    disagreementIndex: 0.7,
    riskLevel: "high",
    goalModules: ["Positive self-talk reset"],
    flaggedSignals: ["Urgent follow-up concern"],
  },
  ski: {
    current: 3,
    baseline: 3.7,
    min: 3,
    target: 4.5,
    gapToMin: 0,
    gapToTarget: 1.5,
  },
  domainBenchmarks: [
    { domain: "movement", label: "Movement", average: 3.2, min: 3, target: 4.5, status: "developing", gapToMin: -0.2, gapToTarget: 1.3 },
    { domain: "social", label: "Social", average: 3.1, min: 3, target: 4.5, status: "developing", gapToMin: -0.1, gapToTarget: 1.4 },
    { domain: "mental", label: "Mental", average: 2.5, min: 3, target: 4.5, status: "below_min", gapToMin: 0.5, gapToTarget: 2 },
  ],
  strengths: [{ key: "balance", label: "Balance", score: 4, domain: "movement" }],
  focusAreas: [
    { key: "confidence", label: "Confidence", score: 2, domain: "mental" },
    { key: "self_regulation", label: "Self-regulation", score: 2, domain: "mental" },
  ],
  recommendations: [
    {
      id: "mental-below-min",
      title: "Mental stabilization",
      rationale: "Mental state is below minimum.",
      domain: "mental",
      severity: "high",
      evidenceStrength: "high",
      focusItems: [{ key: "confidence", label: "Confidence", score: 2, domain: "mental" }],
      sourceEvidence: [],
    },
    {
      id: "recovery-support",
      title: "Recovery and load adjustment support",
      rationale: "Recovery is strained.",
      severity: "high",
      evidenceStrength: "high",
      focusItems: [],
      sourceEvidence: [],
    },
  ],
};

const plan: DevelopmentPlan = {
  childId: "child-1",
  status: "active",
  summary: "",
  assignments: [
    { id: "a1", title: "Mental stabilization: Confidence", notes: "", audience: "practitioner", status: "in_progress", focusAreaIds: ["confidence"] },
  ],
  checkpoints: [],
  progressNotes: "",
  createdAt: "2026-05-15T10:00:00.000Z",
  updatedAt: "2026-05-15T10:00:00.000Z",
};

const supportWorkspace: ChildSupportWorkspace = {
  childId: "child-1",
  caregiverTools: [],
  coachTools: [
    {
      id: "coach-1",
      templateId: "confidence",
      title: "Confidence-preserving feedback routine",
      description: "",
      audience: "coach",
      focusTags: ["mental", "confidence"],
      status: "recommended",
      assignedAt: "2026-05-15T10:00:00.000Z",
      notes: "",
    },
  ],
  microLearning: [],
  referrals: [],
  evidenceJournal: [],
  createdAt: "2026-05-15T10:00:00.000Z",
  updatedAt: "2026-05-15T10:00:00.000Z",
};

describe("buildSessionFocusPriorities", () => {
  it("prioritizes wellbeing protection and high-risk mental focus", () => {
    const progressSummary = buildProgressComparisonSummary({
      record: current,
      history: [current, baseline],
      recommendationSummary,
      plan,
    });

    const priorities = buildSessionFocusPriorities({
      recommendationSummary,
      progressSummary,
      plan,
      supportWorkspace,
    });

    expect(priorities[0]?.title).toContain("Protect recovery");
    expect(priorities.some((entry) => entry.title === "Mental stabilization")).toBe(true);
    expect(priorities.find((entry) => entry.title === "Mental stabilization")?.linkedSupport).toContain("Confidence-preserving feedback routine");
  });
});
