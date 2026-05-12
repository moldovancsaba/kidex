import type { DevelopmentPlan } from "@/lib/development-plans";
import type { RecommendationSummary } from "@/lib/recommendations";
import type { ChildProfile } from "@/repositories/child.repository";
import type { AssessmentRecord } from "@/types/assessment";

export type SupportProgressStatus = "recommended" | "acknowledged" | "completed";
export type SupportAudience = "caregiver" | "coach";
export type ReferralUrgency = "routine" | "priority" | "urgent";
export type ReferralStatus = "recommended" | "contacted" | "scheduled" | "closed";
export type EvidenceMediaType = "image" | "video" | "file" | "link";
export type MicroLearningStatus = "assigned" | "in_progress" | "completed";

export interface SupportResourceProgress {
  id: string;
  templateId: string;
  title: string;
  description: string;
  audience: SupportAudience;
  focusTags: string[];
  status: SupportProgressStatus;
  assignedAt: string;
  completedAt?: string;
  notes: string;
  commitmentLabel?: string;
  commitmentAcceptedAt?: string;
}

export interface MicroLearningLesson {
  id: string;
  title: string;
  prompt: string;
  durationMinutes: number;
  completed: boolean;
  completedAt?: string;
  reflection: string;
}

export interface MicroLearningSequence {
  id: string;
  title: string;
  focusArea: string;
  ageGroup: string;
  coCompletionMode: "optional" | "caregiver_supported";
  status: MicroLearningStatus;
  assignedAt: string;
  currentStreak: number;
  lastCompletedAt?: string;
  lessons: MicroLearningLesson[];
}

export interface ReferralEntry {
  id: string;
  concernType: string;
  urgency: ReferralUrgency;
  status: ReferralStatus;
  explanation: string;
  resourceType: string;
  resourceName: string;
  locality: string;
  contact: string;
  followUpDate?: string;
  resolutionNotes: string;
  createdAt: string;
  updatedAt: string;
}

export interface EvidenceJournalAttachment {
  id: string;
  name: string;
  url: string;
  mediaType: EvidenceMediaType;
}

export interface EvidenceJournalEntry {
  id: string;
  title: string;
  note: string;
  context: string;
  domainTags: string[];
  skillTags: string[];
  linkedAssessmentId?: string;
  linkedPlanId?: string;
  createdAt: string;
  attachments: EvidenceJournalAttachment[];
}

export interface ChildSupportWorkspace {
  _id?: string;
  childId: string;
  caregiverTools: SupportResourceProgress[];
  coachTools: SupportResourceProgress[];
  microLearning: MicroLearningSequence[];
  referrals: ReferralEntry[];
  evidenceJournal: EvidenceJournalEntry[];
  createdAt: string;
  updatedAt: string;
}

function stringValue(value: unknown, max = 1000): string {
  return typeof value === "string" ? value.slice(0, max).trim() : "";
}

function stringArray(value: unknown, maxItems = 20): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.map((entry) => stringValue(entry, 120)).filter(Boolean))).slice(0, maxItems);
}

function nowIso() {
  return new Date().toISOString();
}

function newId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function safeMediaType(value: unknown): EvidenceMediaType {
  return value === "video" || value === "file" || value === "link" ? value : "image";
}

function safeSupportStatus(value: unknown): SupportProgressStatus {
  return value === "acknowledged" || value === "completed" ? value : "recommended";
}

function safeReferralUrgency(value: unknown): ReferralUrgency {
  return value === "priority" || value === "urgent" ? value : "routine";
}

function safeReferralStatus(value: unknown): ReferralStatus {
  return value === "contacted" || value === "scheduled" || value === "closed" ? value : "recommended";
}

function safeMicroLearningStatus(value: unknown): MicroLearningStatus {
  return value === "in_progress" || value === "completed" ? value : "assigned";
}

const caregiverTemplates = {
  confidence: {
    title: "Calm confidence support",
    description: "Use one short, non-judgmental check-in after sport to reinforce effort, recovery, and one small win.",
    commitmentLabel: "I will avoid pressure-heavy post-session questions this week.",
  },
  self_talk: {
    title: "Supportive language reset",
    description: "Model short, practical phrases that help the child recover after mistakes without shame or performance pressure.",
    commitmentLabel: "I will use one supportive reset phrase instead of criticism.",
  },
  help_seeking: {
    title: "Help-seeking partnership",
    description: "Make it clear that asking for help is a strength and that adults will respond calmly when the child signals strain.",
    commitmentLabel: "I will thank the child for asking for help when they do.",
  },
  default: {
    title: "Healthy sport partnership",
    description: "Keep home support practical, calm, and focused on routine, recovery, and belonging rather than outcomes alone.",
    commitmentLabel: "I will keep one family conversation focused on support rather than results.",
  },
} as const;

const coachTemplates = {
  confidence: {
    title: "Confidence-preserving feedback routine",
    description: "Use one clear coaching point, one success marker, and one reset cue instead of stacked correction.",
  },
  self_talk: {
    title: "Mistake-recovery coaching cue",
    description: "Prompt a short reset phrase and a concrete next action immediately after an error or frustration moment.",
  },
  resilience: {
    title: "Resilience under challenge prompt",
    description: "Narrow the next session expectation and reward calm re-engagement more than visible intensity.",
  },
  default: {
    title: "Positive youth coaching checkpoint",
    description: "Reinforce belonging, safety, and one concrete next step in the next coached interaction.",
  },
} as const;

const microLearningTemplateMap = {
  confidence: [
    { title: "Name one recent win", prompt: "What is one thing that felt a little stronger or easier this week?" },
    { title: "Confidence reminder", prompt: "Pick one phrase you can say to yourself before the next activity." },
    { title: "Share the support cue", prompt: "Tell a caregiver or coach which reminder helped most." },
  ],
  self_talk: [
    { title: "Catch the harsh thought", prompt: "Notice one unhelpful thought and replace it with a calmer version." },
    { title: "Reset phrase practice", prompt: "Repeat your reset phrase once before a challenge and once after a mistake." },
    { title: "Reflection check", prompt: "Did the reset phrase help you get back into the activity?" },
  ],
  imagery: [
    { title: "Short mental rehearsal", prompt: "Close your eyes for 30 seconds and picture one movement or routine going smoothly." },
    { title: "One detail focus", prompt: "Add one body cue or breathing cue to the picture." },
    { title: "Replay and reflect", prompt: "What part of the picture felt clearest?" },
  ],
  breathing: [
    { title: "Two calm breaths", prompt: "Try two slow breaths before a task or transition." },
    { title: "Breath plus body cue", prompt: "Pair the breath with dropping your shoulders or relaxing your hands." },
    { title: "Use it in real context", prompt: "Notice one moment when the breathing reset helped even a little." },
  ],
  help_seeking: [
    { title: "Choose a support person", prompt: "Who can you ask for help from when something feels too hard or too stressful?" },
    { title: "Practice the words", prompt: "Say or write one sentence you can use to ask for support." },
    { title: "Try it once", prompt: "Use the help-seeking sentence in one real situation this week." },
  ],
  default: [
    { title: "Short reflection", prompt: "What felt easier, harder, or more fun today?" },
    { title: "One next step", prompt: "Choose one tiny practice goal for the next session." },
    { title: "Check back in", prompt: "What changed after you tried that next step?" },
  ],
} as const;

function caregiverModuleFromSummary(summary: RecommendationSummary): Array<{ templateId: keyof typeof caregiverTemplates; focusTags: string[] }> {
  const labels = summary.mentalWellbeing.goalModules.map((entry) => entry.toLowerCase());
  if (labels.some((label) => label.includes("self-talk"))) return [{ templateId: "self_talk", focusTags: ["mental", "self-talk"] }];
  if (labels.some((label) => label.includes("help-seeking"))) return [{ templateId: "help_seeking", focusTags: ["mental", "help-seeking"] }];
  if (labels.some((label) => label.includes("confidence"))) return [{ templateId: "confidence", focusTags: ["mental", "confidence"] }];
  return [{ templateId: "default", focusTags: summary.focusAreas.map((item) => item.label).slice(0, 2) }];
}

function coachModuleFromSummary(summary: RecommendationSummary): Array<{ templateId: keyof typeof coachTemplates; focusTags: string[] }> {
  const labels = summary.mentalWellbeing.goalModules.map((entry) => entry.toLowerCase());
  if (labels.some((label) => label.includes("self-talk"))) return [{ templateId: "self_talk", focusTags: ["mental", "self-talk"] }];
  if (labels.some((label) => label.includes("confidence"))) return [{ templateId: "confidence", focusTags: ["mental", "confidence"] }];
  if (summary.mentalWellbeing.riskLevel !== "low") return [{ templateId: "resilience", focusTags: ["wellbeing", "follow-up"] }];
  return [{ templateId: "default", focusTags: summary.focusAreas.map((item) => item.label).slice(0, 2) }];
}

function computeStreak(lessons: MicroLearningLesson[]) {
  let streak = 0;
  for (const lesson of lessons) {
    if (!lesson.completed) break;
    streak += 1;
  }
  return streak;
}

function normalizeLesson(input: unknown, fallbackTitle = "Lesson", fallbackPrompt = ""): MicroLearningLesson {
  const data = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  return {
    id: stringValue(data.id, 120) || newId("lesson"),
    title: stringValue(data.title, 240) || fallbackTitle,
    prompt: stringValue(data.prompt, 1000) || fallbackPrompt,
    durationMinutes: typeof data.durationMinutes === "number" && data.durationMinutes > 0 ? Math.min(10, data.durationMinutes) : 3,
    completed: Boolean(data.completed),
    completedAt: stringValue(data.completedAt, 80) || undefined,
    reflection: stringValue(data.reflection, 2000),
  };
}

export function normalizeSupportWorkspace(input: unknown): ChildSupportWorkspace {
  const data = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const createdAt = stringValue(data.createdAt, 80) || nowIso();
  const updatedAt = stringValue(data.updatedAt, 80) || createdAt;

  const caregiverTools = Array.isArray(data.caregiverTools) ? data.caregiverTools : [];
  const coachTools = Array.isArray(data.coachTools) ? data.coachTools : [];
  const microLearning = Array.isArray(data.microLearning) ? data.microLearning : [];
  const referrals = Array.isArray(data.referrals) ? data.referrals : [];
  const evidenceJournal = Array.isArray(data.evidenceJournal) ? data.evidenceJournal : [];

  return {
    _id: stringValue(data._id, 120) || undefined,
    childId: stringValue(data.childId, 120),
    caregiverTools: caregiverTools.map((entry) => {
      const item = entry && typeof entry === "object" ? (entry as Record<string, unknown>) : {};
      return {
        id: stringValue(item.id, 120) || newId("caregiver"),
        templateId: stringValue(item.templateId, 120) || "default",
        title: stringValue(item.title, 240),
        description: stringValue(item.description, 2000),
        audience: "caregiver" as const,
        focusTags: stringArray(item.focusTags),
        status: safeSupportStatus(item.status),
        assignedAt: stringValue(item.assignedAt, 80) || createdAt,
        completedAt: stringValue(item.completedAt, 80) || undefined,
        notes: stringValue(item.notes, 2000),
        commitmentLabel: stringValue(item.commitmentLabel, 240) || undefined,
        commitmentAcceptedAt: stringValue(item.commitmentAcceptedAt, 80) || undefined,
      };
    }),
    coachTools: coachTools.map((entry) => {
      const item = entry && typeof entry === "object" ? (entry as Record<string, unknown>) : {};
      return {
        id: stringValue(item.id, 120) || newId("coach"),
        templateId: stringValue(item.templateId, 120) || "default",
        title: stringValue(item.title, 240),
        description: stringValue(item.description, 2000),
        audience: "coach" as const,
        focusTags: stringArray(item.focusTags),
        status: safeSupportStatus(item.status),
        assignedAt: stringValue(item.assignedAt, 80) || createdAt,
        completedAt: stringValue(item.completedAt, 80) || undefined,
        notes: stringValue(item.notes, 2000),
      };
    }),
    microLearning: microLearning.map((entry) => {
      const item = entry && typeof entry === "object" ? (entry as Record<string, unknown>) : {};
      const lessons = Array.isArray(item.lessons) ? item.lessons.map((lesson) => normalizeLesson(lesson)) : [];
      return {
        id: stringValue(item.id, 120) || newId("sequence"),
        title: stringValue(item.title, 240),
        focusArea: stringValue(item.focusArea, 240),
        ageGroup: stringValue(item.ageGroup, 20),
        coCompletionMode: item.coCompletionMode === "caregiver_supported" ? "caregiver_supported" : "optional",
        status: safeMicroLearningStatus(item.status),
        assignedAt: stringValue(item.assignedAt, 80) || createdAt,
        currentStreak: typeof item.currentStreak === "number" ? item.currentStreak : computeStreak(lessons),
        lastCompletedAt: stringValue(item.lastCompletedAt, 80) || undefined,
        lessons,
      };
    }),
    referrals: referrals.map((entry) => {
      const item = entry && typeof entry === "object" ? (entry as Record<string, unknown>) : {};
      return {
        id: stringValue(item.id, 120) || newId("referral"),
        concernType: stringValue(item.concernType, 240),
        urgency: safeReferralUrgency(item.urgency),
        status: safeReferralStatus(item.status),
        explanation: stringValue(item.explanation, 4000),
        resourceType: stringValue(item.resourceType, 240),
        resourceName: stringValue(item.resourceName, 240),
        locality: stringValue(item.locality, 240),
        contact: stringValue(item.contact, 240),
        followUpDate: stringValue(item.followUpDate, 80) || undefined,
        resolutionNotes: stringValue(item.resolutionNotes, 4000),
        createdAt: stringValue(item.createdAt, 80) || createdAt,
        updatedAt: stringValue(item.updatedAt, 80) || updatedAt,
      };
    }),
    evidenceJournal: evidenceJournal.map((entry) => {
      const item = entry && typeof entry === "object" ? (entry as Record<string, unknown>) : {};
      const attachments = Array.isArray(item.attachments) ? item.attachments : [];
      return {
        id: stringValue(item.id, 120) || newId("evidence"),
        title: stringValue(item.title, 240),
        note: stringValue(item.note, 4000),
        context: stringValue(item.context, 240),
        domainTags: stringArray(item.domainTags),
        skillTags: stringArray(item.skillTags),
        linkedAssessmentId: stringValue(item.linkedAssessmentId, 120) || undefined,
        linkedPlanId: stringValue(item.linkedPlanId, 120) || undefined,
        createdAt: stringValue(item.createdAt, 80) || createdAt,
        attachments: attachments
          .map((attachment) => {
            const value = attachment && typeof attachment === "object" ? (attachment as Record<string, unknown>) : null;
            const url = stringValue(value?.url, 2000);
            if (!url) return null;
            return {
              id: stringValue(value?.id, 120) || newId("attachment"),
              name: stringValue(value?.name, 240) || "Attachment",
              url,
              mediaType: safeMediaType(value?.mediaType),
            };
          })
          .filter((attachment): attachment is EvidenceJournalAttachment => Boolean(attachment)),
      };
    }),
    createdAt,
    updatedAt,
  };
}

function buildResourceProgress(
  templateId: string,
  audience: SupportAudience,
  title: string,
  description: string,
  focusTags: string[],
  commitmentLabel?: string,
): SupportResourceProgress {
  return {
    id: newId(audience),
    templateId,
    title,
    description,
    audience,
    focusTags,
    status: "recommended",
    assignedAt: nowIso(),
    completedAt: undefined,
    notes: "",
    commitmentLabel,
    commitmentAcceptedAt: undefined,
  };
}

export function buildDefaultSupportWorkspace(input: {
  child: ChildProfile;
  recommendationSummary: RecommendationSummary;
  plan?: DevelopmentPlan | null;
  latestAssessment?: AssessmentRecord | null;
}): ChildSupportWorkspace {
  const caregiverTools = caregiverModuleFromSummary(input.recommendationSummary).map((entry) => {
    const template = caregiverTemplates[entry.templateId];
    return buildResourceProgress(entry.templateId, "caregiver", template.title, template.description, entry.focusTags, template.commitmentLabel);
  });

  const coachTools = coachModuleFromSummary(input.recommendationSummary).map((entry) => {
    const template = coachTemplates[entry.templateId];
    return buildResourceProgress(entry.templateId, "coach", template.title, template.description, entry.focusTags);
  });

  const moduleKey = input.latestAssessment?.mentalWellbeing.goalModules[0] || "default";
  const microTemplate = microLearningTemplateMap[moduleKey as keyof typeof microLearningTemplateMap] || microLearningTemplateMap.default;
  const lessons = microTemplate.map((lesson) => normalizeLesson({
    id: newId("lesson"),
    title: lesson.title,
    prompt: lesson.prompt,
    durationMinutes: 3,
    completed: false,
    reflection: "",
  }, lesson.title, lesson.prompt));

  const microLearning: MicroLearningSequence[] = [{
    id: newId("sequence"),
    title: `${input.recommendationSummary.mentalWellbeing.goalModules[0] || "Mental growth"} mini-sequence`,
    focusArea: input.recommendationSummary.mentalWellbeing.goalModules[0] || input.recommendationSummary.focusAreas[0]?.label || "Mental growth",
    ageGroup: input.child.ageGroup || input.latestAssessment?.child.ageGroup || "",
    coCompletionMode: input.child.caregivers?.length ? "caregiver_supported" : "optional",
    status: "assigned",
    assignedAt: nowIso(),
    currentStreak: 0,
    lastCompletedAt: undefined,
    lessons,
  }];

  const referrals: ReferralEntry[] = input.recommendationSummary.mentalWellbeing.riskLevel === "high" || input.latestAssessment?.notes.referral
    ? [{
        id: newId("referral"),
        concernType: input.recommendationSummary.mentalWellbeing.riskLevel === "high" ? "Wellbeing follow-up" : "Development support follow-up",
        urgency: input.recommendationSummary.mentalWellbeing.riskLevel === "high" ? "urgent" : "priority",
        status: "recommended",
        explanation: input.latestAssessment?.notes.referral || "Document the next responsible human follow-up and any suitable local support options.",
        resourceType: "Support service",
        resourceName: "",
        locality: "",
        contact: "",
        followUpDate: undefined,
        resolutionNotes: "",
        createdAt: nowIso(),
        updatedAt: nowIso(),
      }]
    : [];

  const evidenceJournal: EvidenceJournalEntry[] = (input.latestAssessment?.attachments || []).slice(0, 3).map((attachment) => ({
    id: newId("evidence"),
    title: attachment.name || "Assessment evidence",
    note: "Imported from the latest assessment evidence set for later timeline review and reporting.",
    context: input.latestAssessment?.session.location || "Assessment session",
    domainTags: input.recommendationSummary.focusAreas.slice(0, 2).map((item) => item.domain),
    skillTags: input.recommendationSummary.focusAreas.slice(0, 2).map((item) => item.label),
    linkedAssessmentId: input.latestAssessment?._id,
    linkedPlanId: input.plan?._id,
    createdAt: attachment.uploadedAt || nowIso(),
    attachments: [{
      id: attachment.id,
      name: attachment.name || "Evidence",
      url: attachment.url,
      mediaType: attachment.mimeType.startsWith("video/") ? "video" : attachment.mimeType.startsWith("image/") ? "image" : "file",
    }],
  }));

  const createdAt = nowIso();
  return {
    childId: input.child._id || "",
    caregiverTools,
    coachTools,
    microLearning,
    referrals,
    evidenceJournal,
    createdAt,
    updatedAt: createdAt,
  };
}

export function refreshMicroLearning(sequence: MicroLearningSequence): MicroLearningSequence {
  const currentStreak = computeStreak(sequence.lessons);
  const lastCompletedAt = [...sequence.lessons]
    .filter((lesson) => lesson.completedAt)
    .sort((left, right) => (right.completedAt || "").localeCompare(left.completedAt || ""))[0]?.completedAt;
  const status = currentStreak === sequence.lessons.length && sequence.lessons.length > 0
    ? "completed"
    : currentStreak > 0
      ? "in_progress"
      : "assigned";
  return {
    ...sequence,
    currentStreak,
    lastCompletedAt,
    status,
  };
}

export function buildSupportWorkspaceSummary(workspace: ChildSupportWorkspace | null | undefined) {
  if (!workspace) {
    return {
      caregiverCompleted: 0,
      coachCompleted: 0,
      openReferrals: 0,
      evidenceCount: 0,
      activeMicroLearning: 0,
      recentEvidenceTitles: [] as string[],
    };
  }

  return {
    caregiverCompleted: workspace.caregiverTools.filter((item) => item.status === "completed").length,
    coachCompleted: workspace.coachTools.filter((item) => item.status === "completed").length,
    openReferrals: workspace.referrals.filter((item) => item.status !== "closed").length,
    evidenceCount: workspace.evidenceJournal.length,
    activeMicroLearning: workspace.microLearning.filter((item) => item.status !== "completed").length,
    recentEvidenceTitles: workspace.evidenceJournal.slice(0, 3).map((item) => item.title),
  };
}
