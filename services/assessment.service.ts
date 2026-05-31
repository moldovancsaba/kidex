import { computeAssessment } from "@/lib/scoring";
import { evaluateAssessmentQuality } from "@/lib/assessment-quality";
import { buildAssessmentConsentSnapshot, deriveLegacyConsents, normalizeConsentPolicy } from "@/lib/consent-policy";
import { applyActorOwnershipToAssessment, applyActorOwnershipToChild, type AuthenticatedActor } from "@/lib/authorization";
import { parseAssessmentPayload } from "@/lib/validations";
import { createAssessment, deleteAssessmentById, getAssessmentById, listAssessmentSummaries, restoreAssessmentById, updateAssessmentById, listDeletedAssessmentSummaries } from "@/repositories/assessment.repository";
import { getChildById, updateChildById, upsertChild } from "@/repositories/child.repository";
import { getGlobalSettings } from "@/repositories/settings.repository";
import { getActiveVariantName } from "@/lib/standards-config";
import { ObjectId } from "mongodb";
import type { AssessmentRecord } from "@/types/assessment";

export function parseObjectId(id: string) {
  return ObjectId.isValid(id) ? new ObjectId(id) : null;
}

export async function listAssessments() {
  if (!process.env.MONGODB_URI) {
    return { assessments: [], configured: false };
  }

  return { assessments: (await listAssessmentSummaries()).map(withAssessmentQuality), configured: true };
}

export async function listDeletedAssessments() {
  if (!process.env.MONGODB_URI) {
    return { assessments: [], configured: false };
  }
  return { assessments: (await listDeletedAssessmentSummaries()).map(withAssessmentQuality), configured: true };
}

export function withAssessmentQuality<T extends AssessmentRecord>(assessment: T): T {
  return {
    ...assessment,
    quality: assessment.quality ?? evaluateAssessmentQuality(assessment, assessment.updatedAt || assessment.createdAt),
  };
}

export async function createAssessmentFromPayload(input: unknown, actor?: AuthenticatedActor | null) {
  const payload = parseAssessmentPayload(input);
  const now = new Date().toISOString();
  const integrityIssues: string[] = [];
  if (!payload.child.name || !payload.child.birthDate) integrityIssues.push("missing_child_identity");
  if (!payload.childId) integrityIssues.push("missing_child_link");
  const scoredCount = Object.values(payload.scores).filter((entry) => typeof entry.score === "number").length;
  if (scoredCount === 0) integrityIssues.push("no_scores_recorded");

  const childProfile = applyActorOwnershipToChild(actor || null, {
    name: payload.child.name,
    birthDate: payload.child.birthDate,
    knownTraits: payload.child.knownTraits,
    parentSignals: payload.child.parentSignals,
    dominantHand: payload.child.dominantHand,
    dominantEye: payload.child.dominantEye,
    dominantFoot: payload.child.dominantFoot
  });
  const childObjectId = payload.childId ? parseObjectId(payload.childId) : null;
  const existingChild = childObjectId ? await getChildById(childObjectId) : null;
  const nextChildProfile = existingChild
    ? {
        ...childProfile,
        consentPhoto: existingChild.consentPhoto,
        consentReport: existingChild.consentReport,
        consentPolicy: existingChild.consentPolicy,
        consentHistory: existingChild.consentHistory,
      }
    : {
        ...childProfile,
        consentPolicy: normalizeConsentPolicy(undefined, {
          consentPhoto: payload.session.consentPhoto,
          consentReport: payload.session.consentReport,
        }),
        consentPhoto: payload.session.consentPhoto,
        consentReport: payload.session.consentReport,
      };
  const updatedChild = existingChild && childObjectId ? await updateChildById(childObjectId, nextChildProfile) : null;
  const child = updatedChild ?? (await upsertChild(nextChildProfile));
  const consentSnapshot = buildAssessmentConsentSnapshot(child.consentPolicy, now);
  const legacyConsent = deriveLegacyConsents(child.consentPolicy, now);
  if (!consentSnapshot.familyReport) integrityIssues.push("missing_report_consent");

  const settings = await getGlobalSettings();
  const standardsVersionUsed = settings?.standards?.activeVersion || "v1";
  const activeVersion = settings?.standards?.versions?.[standardsVersionUsed];
  const standardsVariantUsed = getActiveVariantName(activeVersion);
  const activeFormula = activeVersion?.formula;
  const computed = computeAssessment(payload, activeFormula);
  const quality = evaluateAssessmentQuality(payload, now);

  return createAssessment(applyActorOwnershipToAssessment(actor || null, {
    ...payload,
    session: {
      ...payload.session,
      consentPhoto: legacyConsent.consentPhoto,
      consentReport: legacyConsent.consentReport,
      consentSnapshot,
    },
    childId: child._id,
    standardsVersionUsed,
    standardsVariantUsed,
    computed,
    quality,
    createdAt: now,
    updatedAt: now,
    updateHistory: integrityIssues.length > 0 ? [`integrity:${integrityIssues.join(",")}:${now}`] : []
  }));
}

export async function getAssessment(id: ObjectId) {
  const assessment = await getAssessmentById(id);
  return assessment ? withAssessmentQuality(assessment) : null;
}

export async function updateAssessmentFromPayload(id: ObjectId, input: unknown, actor?: AuthenticatedActor | null) {
  const payload = parseAssessmentPayload(input);
  const integrityIssues: string[] = [];
  if (!payload.child.name || !payload.child.birthDate) integrityIssues.push("missing_child_identity");
  if (!payload.childId) integrityIssues.push("missing_child_link");
  const scoredCount = Object.values(payload.scores).filter((entry) => typeof entry.score === "number").length;
  if (scoredCount === 0) integrityIssues.push("no_scores_recorded");

  const childProfile = applyActorOwnershipToChild(actor || null, {
    name: payload.child.name,
    birthDate: payload.child.birthDate,
    knownTraits: payload.child.knownTraits,
    parentSignals: payload.child.parentSignals,
    dominantHand: payload.child.dominantHand,
    dominantEye: payload.child.dominantEye,
    dominantFoot: payload.child.dominantFoot
  });
  const childObjectId = payload.childId ? parseObjectId(payload.childId) : null;
  const existingChild = childObjectId ? await getChildById(childObjectId) : null;
  const nextChildProfile = existingChild
    ? {
        ...childProfile,
        consentPhoto: existingChild.consentPhoto,
        consentReport: existingChild.consentReport,
        consentPolicy: existingChild.consentPolicy,
        consentHistory: existingChild.consentHistory,
      }
    : {
        ...childProfile,
        consentPolicy: normalizeConsentPolicy(undefined, {
          consentPhoto: payload.session.consentPhoto,
          consentReport: payload.session.consentReport,
        }),
        consentPhoto: payload.session.consentPhoto,
        consentReport: payload.session.consentReport,
      };
  const updatedChild = existingChild && childObjectId ? await updateChildById(childObjectId, nextChildProfile) : null;
  const child = updatedChild ?? (await upsertChild(nextChildProfile));
  const consentSnapshot = buildAssessmentConsentSnapshot(child.consentPolicy, new Date().toISOString());
  const legacyConsent = deriveLegacyConsents(child.consentPolicy);
  if (!consentSnapshot.familyReport) integrityIssues.push("missing_report_consent");

  const existing = await getAssessmentById(id);
  const updateHistory = existing?.updateHistory || [];
  const now = new Date().toISOString();
  
  const settings = await getGlobalSettings();
  const standardsVersionUsed = settings?.standards?.activeVersion || existing?.standardsVersionUsed || "v1";
  const activeVersion = settings?.standards?.versions?.[standardsVersionUsed];
  const standardsVariantUsed = getActiveVariantName(activeVersion, existing?.standardsVariantUsed);
  const activeFormula = activeVersion?.formula;
  const computed = computeAssessment(payload, activeFormula);
  const quality = evaluateAssessmentQuality(payload, now);

  return updateAssessmentById(id, applyActorOwnershipToAssessment(actor || null, {
    ...payload,
    session: {
      ...payload.session,
      consentPhoto: legacyConsent.consentPhoto,
      consentReport: legacyConsent.consentReport,
      consentSnapshot,
    },
    childId: child._id,
    standardsVersionUsed,
    standardsVariantUsed,
    computed,
    quality,
    updatedAt: now,
    updateHistory: [...updateHistory, ...(integrityIssues.length > 0 ? [`integrity:${integrityIssues.join(",")}:${now}`] : []), now]
  }));
}

export async function removeAssessment(id: ObjectId) {
  await deleteAssessmentById(id);
}

export async function restoreAssessment(id: ObjectId) {
  await restoreAssessmentById(id);
}
