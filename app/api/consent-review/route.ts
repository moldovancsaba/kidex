import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { recordAuditEvent } from "@/lib/audit";
import { buildConsentHistoryEvents, deriveLegacyConsents, mergeConsentHistory, normalizeConsentPolicy } from "@/lib/consent-policy";
import { jsonError, readJson } from "@/lib/api";
import { verifyConsentReviewToken } from "@/lib/consent-review-tokens";
import { getChildById, updateChildById } from "@/repositories/child.repository";

function pickConsentKeys(input: ReturnType<typeof normalizeConsentPolicy>) {
  return {
    mediaCapture: input.mediaCapture,
    familyReport: input.familyReport,
    dataSharing: input.dataSharing,
    publicity: input.publicity,
  };
}

function toChildUpdatePayload(child: NonNullable<Awaited<ReturnType<typeof getChildById>>>) {
  return {
    kidexId: child.kidexId,
    institutionId: child.institutionId,
    createdByUserEmail: child.createdByUserEmail,
    practitionerEmails: child.practitionerEmails,
    visibility: child.visibility,
    name: child.name,
    birthDate: child.birthDate,
    ageGroup: child.ageGroup,
    consentPhoto: child.consentPhoto,
    consentReport: child.consentReport,
    consentPolicy: child.consentPolicy,
    consentHistory: child.consentHistory,
    dominantHand: child.dominantHand,
    dominantEye: child.dominantEye,
    dominantFoot: child.dominantFoot,
    knownTraits: child.knownTraits,
    parentSignals: child.parentSignals,
    caregivers: child.caregivers,
    familyAccessHistory: child.familyAccessHistory,
    locale: child.locale,
  };
}

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") || "";
  const payload = await verifyConsentReviewToken(token);
  if (!payload || !ObjectId.isValid(payload.childId)) {
    return jsonError("Invalid or expired consent review link", 400, "VALIDATION_ERROR");
  }

  const child = await getChildById(new ObjectId(payload.childId));
  if (!child) {
    return jsonError("Child not found", 404, "NOT_FOUND");
  }

  const caregiver = child.caregivers?.find((entry) => entry.id === payload.caregiverId);
  if (!caregiver) {
    return jsonError("Caregiver not found", 404, "NOT_FOUND");
  }

  return NextResponse.json({
    child: {
      id: child._id,
      name: child.name,
    },
    caregiver: {
      id: caregiver.id,
      name: caregiver.name,
      relationship: caregiver.relationship,
      email: caregiver.email,
    },
    consentPolicy: pickConsentKeys(normalizeConsentPolicy(child.consentPolicy, {
      consentPhoto: child.consentPhoto,
      consentReport: child.consentReport,
    })),
  });
}

export async function POST(request: Request) {
  const body = await readJson(request) as {
    token?: string;
    consentPolicy?: unknown;
  } | null;
  const token = typeof body?.token === "string" ? body.token : "";
  const payload = await verifyConsentReviewToken(token);
  if (!payload || !ObjectId.isValid(payload.childId)) {
    return jsonError("Invalid or expired consent review link", 400, "VALIDATION_ERROR");
  }

  const child = await getChildById(new ObjectId(payload.childId));
  if (!child) {
    return jsonError("Child not found", 404, "NOT_FOUND");
  }

  const caregiver = child.caregivers?.find((entry) => entry.id === payload.caregiverId);
  if (!caregiver) {
    return jsonError("Caregiver not found", 404, "NOT_FOUND");
  }

  const normalized = normalizeConsentPolicy(body?.consentPolicy, {
    consentPhoto: child.consentPhoto,
    consentReport: child.consentReport,
  });
  const now = new Date().toISOString();
  const nextConsentPolicy = {
    mediaCapture: {
      ...normalized.mediaCapture,
      updatedAt: now,
      updatedBy: caregiver.email || caregiver.name,
      approvedByCaregiverId: caregiver.id,
      approvedByLabel: caregiver.name,
    },
    familyReport: {
      ...normalized.familyReport,
      updatedAt: now,
      updatedBy: caregiver.email || caregiver.name,
      approvedByCaregiverId: caregiver.id,
      approvedByLabel: caregiver.name,
    },
    dataSharing: {
      ...normalized.dataSharing,
      updatedAt: now,
      updatedBy: caregiver.email || caregiver.name,
      approvedByCaregiverId: caregiver.id,
      approvedByLabel: caregiver.name,
    },
    publicity: {
      ...normalized.publicity,
      updatedAt: now,
      updatedBy: caregiver.email || caregiver.name,
      approvedByCaregiverId: caregiver.id,
      approvedByLabel: caregiver.name,
    },
  };

  const consentEvents = buildConsentHistoryEvents({
    previous: child.consentPolicy,
    next: nextConsentPolicy,
    actorEmail: caregiver.email || caregiver.name,
    createdAt: now,
  });
  const legacyConsent = deriveLegacyConsents(nextConsentPolicy, now);

  const updated = await updateChildById(new ObjectId(payload.childId), {
    ...toChildUpdatePayload(child),
    consentPolicy: nextConsentPolicy,
    consentHistory: mergeConsentHistory(child.consentHistory, consentEvents),
    consentPhoto: legacyConsent.consentPhoto,
    consentReport: legacyConsent.consentReport,
  });

  await recordAuditEvent({
    action: "consent.update",
    status: "success",
    request,
    institutionId: updated?.institutionId || child.institutionId,
    targetType: "child",
    targetId: child._id,
    targetLabel: child.name,
    summary: "Consent policy updated through caregiver self-service review",
    metadata: {
      source: "family_self_service",
      caregiverId: caregiver.id,
      caregiverEmail: caregiver.email,
      consentEvents,
    },
  });

  return NextResponse.json({
    success: true,
    child: {
      id: child._id,
      name: child.name,
    },
    caregiver: {
      id: caregiver.id,
      name: caregiver.name,
    },
  });
}
