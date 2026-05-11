import type { AssessmentConsentSnapshot } from "@/lib/consent-policy";

export type AssessmentMode = "rapid" | "full";
export type AssessmentDomain = "movement" | "social" | "mental";

export interface ScoreItemDefinition {
  key: string;
  title: string;
  prompt: string;
  domain: AssessmentDomain;
}

export interface ScoreEntry {
  score: number | "";
  note: string;
  observer?: string;
  confidence?: "low" | "medium" | "high";
}

export interface EvidenceAttachment {
  id: string;
  name: string;
  url: string;
  thumbUrl?: string;
  deleteUrl?: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
}

export interface AssessmentPayload {
  childId?: string;
  mode: AssessmentMode;
  child: {
    name: string;
    birthDate: string;
    ageGroup: "4-6" | "7-9" | "10-12" | "";
    dominantHand: string;
    dominantEye: string;
    dominantFoot: string;
    knownTraits: string;
    parentSignals: string;
  };
  session: {
    date: string;
    location: string;
    conductor: string;
    observers: string;
    groupSize: string;
    context: "structured" | "spontaneous" | "mixed" | "event";
    consentPhoto: boolean;
    consentReport: boolean;
    consentSnapshot?: AssessmentConsentSnapshot;
  };
  scores: Record<string, ScoreEntry>;
  notes: {
    general: string;
    movement: string;
    social: string;
    mental: string;
    adaptations: string;
    referral: string;
  };
  attachments: EvidenceAttachment[];
}

export interface AssessmentRecord extends AssessmentPayload {
  _id?: string;
  childId?: string;
  institutionId?: string;
  createdByUserEmail?: string;
  practitionerEmails?: string[];
  visibility?: "institution" | "restricted";
  standardsVersionUsed?: string;
  createdAt: string;
  updatedAt: string;
  updateHistory?: string[];
  computed: {
    movementAverage: number | null;
    socialAverage: number | null;
    mentalAverage: number | null;
    ski: number | null;
    completion: {
      done: number;
      total: number;
    };
  };
}
