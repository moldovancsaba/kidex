import { describe, expect, it } from "vitest";

import { buildDefaultSupportWorkspace, buildSupportWorkspaceSummary, normalizeSupportWorkspace, refreshMicroLearning } from "./support-workspace";
import type { ChildProfile } from "@/repositories/child.repository";
import type { RecommendationSummary } from "./recommendations";
import type { AssessmentRecord } from "@/types/assessment";

const child: ChildProfile = {
  _id: "child-1",
  name: "Test Child",
  birthDate: "2018-01-01",
  ageGroup: "7-9",
  consentPhoto: true,
  consentReport: true,
  caregivers: [{ id: "cg-1", name: "Parent One", relationship: "mother", email: "parent@example.com", phone: "", accessLevel: "full", status: "active", preferredLocale: "en", canReceiveReports: true, canReceiveScheduling: true, inviteStatus: "not_invited", notes: "", contactPreferences: { email: true, phone: false, sms: false } }],
  createdAt: "2026-05-12T00:00:00.000Z",
  updatedAt: "2026-05-12T00:00:00.000Z",
};

const recommendationSummary: RecommendationSummary = {
  readinessStatus: "developing",
  standardsVersionUsed: "v1",
  standardsVariantUsed: "general",
  mentalWellbeing: {
    phase: "follow_up",
    mentalSkillsAverage: 2.9,
    baselineMentalSkillsAverage: 2.5,
    checkInAverage: 2.8,
    recoveryAverage: 2.6,
    disagreementIndex: 0.9,
    riskLevel: "high",
    goalModules: ["Positive self-talk reset"],
    flaggedSignals: ["Urgent follow-up concern"],
  },
  ski: {
    current: 3.1,
    baseline: 2.8,
    min: 3,
    target: 4.5,
    gapToMin: -0.1,
    gapToTarget: 1.4,
  },
  domainBenchmarks: [],
  strengths: [],
  focusAreas: [{ key: "focus", label: "Focus", score: 2, domain: "mental" }],
  recommendations: [],
};

const assessment: AssessmentRecord = {
  _id: "assessment-1",
  childId: "child-1",
  mode: "rapid",
  child: {
    name: "Test Child",
    birthDate: "2018-01-01",
    ageGroup: "7-9",
    dominantHand: "",
    dominantEye: "",
    dominantFoot: "",
    knownTraits: "",
    parentSignals: "",
  },
  session: {
    date: "2026-05-12",
    location: "Hall A",
    conductor: "coach@example.com",
    observers: "",
    groupSize: "6",
    context: "structured",
    consentPhoto: true,
    consentReport: true,
  },
  scores: {},
  notes: {
    general: "",
    movement: "",
    social: "",
    mental: "",
    adaptations: "",
    referral: "Consider local child wellbeing follow-up support.",
  },
  mentalWellbeing: {
    phase: "follow_up",
    perspectives: {
      child: { focus: 2, resilience: 2, selfTalk: 2, confidence: 3, selfRegulation: 3, helpSeeking: 4 },
      observer: { focus: 2, resilience: 2, selfTalk: 2, confidence: 2, selfRegulation: 3, helpSeeking: 3 },
      caregiver: { focus: 3, resilience: 3, selfTalk: 3, confidence: 3, selfRegulation: 3, helpSeeking: 4 },
    },
    checkIn: { mood: 2, stress: 4, readiness: 2, sleepQuality: 2, fatigue: 4, soreness: 3 },
    goalModules: ["self_talk"],
    reflection: "",
    supportNeeds: "",
    riskSignals: { withdrawal: false, overload: true, conflict: false, fearResponse: false, sleepConcern: true, painConcern: false, askedForHelp: false, urgentConcern: true },
  },
  attachments: [{
    id: "att-1",
    name: "Session note image",
    url: "https://example.com/image.jpg",
    mimeType: "image/jpeg",
    size: 123,
    uploadedAt: "2026-05-12T00:00:00.000Z",
  }],
  createdAt: "2026-05-12T00:00:00.000Z",
  updatedAt: "2026-05-12T00:00:00.000Z",
  computed: {
    movementAverage: 3,
    socialAverage: 3,
    mentalAverage: 2.8,
    ski: 3.1,
    mentalWellbeing: {
      phase: "follow_up",
      mentalSkillsAverage: 2.9,
      checkInAverage: 2.8,
      recoveryAverage: 2.6,
      disagreementIndex: 0.9,
      riskLevel: "high",
      flaggedSignals: ["overload", "sleepConcern", "urgentConcern"],
    },
    completion: { done: 0, total: 0 },
  },
};

describe("support workspace", () => {
  it("builds a default workspace from recommendations and latest assessment", () => {
    const workspace = buildDefaultSupportWorkspace({
      child,
      recommendationSummary,
      latestAssessment: assessment,
    });

    expect(workspace.caregiverTools.length).toBeGreaterThan(0);
    expect(workspace.coachTools.length).toBeGreaterThan(0);
    expect(workspace.microLearning[0]?.lessons).toHaveLength(3);
    expect(workspace.referrals[0]?.urgency).toBe("urgent");
    expect(workspace.evidenceJournal[0]?.attachments[0]?.mediaType).toBe("image");
  });

  it("normalizes and summarizes persisted workspace data", () => {
    const workspace = normalizeSupportWorkspace({
      childId: "child-1",
      caregiverTools: [{ title: "Caregiver guide", description: "desc", status: "completed", focusTags: ["confidence"] }],
      coachTools: [{ title: "Coach cue", description: "desc", status: "acknowledged", focusTags: ["resilience"] }],
      microLearning: [{
        title: "Mini sequence",
        focusArea: "Focus",
        ageGroup: "7-9",
        lessons: [
          { title: "One", prompt: "A", completed: true, completedAt: "2026-05-12T00:00:00.000Z" },
          { title: "Two", prompt: "B", completed: false },
        ],
      }],
      referrals: [{ concernType: "Follow-up", explanation: "Explain", status: "recommended" }],
      evidenceJournal: [{ title: "Moment", note: "Observed", attachments: [{ url: "https://example.com/item" }] }],
    });

    const refreshed = refreshMicroLearning(workspace.microLearning[0]);
    const summary = buildSupportWorkspaceSummary(workspace);

    expect(refreshed.currentStreak).toBe(1);
    expect(summary.caregiverCompleted).toBe(1);
    expect(summary.openReferrals).toBe(1);
    expect(summary.evidenceCount).toBe(1);
  });
});
