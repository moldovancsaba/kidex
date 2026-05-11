import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { canWriteChild, requirePermission } from "@/lib/authorization";
import { recordAuditEvent } from "@/lib/audit";
import { jsonError, readJson } from "@/lib/api";
import { createConsentReviewToken } from "@/lib/consent-review-tokens";
import { getChildById, updateChildById } from "@/repositories/child.repository";

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

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { actor, error } = await requirePermission(request, "children.write");
  if (error) return error;

  const { id } = await params;
  if (!ObjectId.isValid(id)) {
    return jsonError("Invalid ID", 400, "VALIDATION_ERROR");
  }

  const body = await readJson(request) as { caregiverId?: string; locale?: string } | null;
  const caregiverId = typeof body?.caregiverId === "string" ? body.caregiverId : "";
  const requestedLocale = typeof body?.locale === "string" ? body.locale : "en";

  const child = await getChildById(new ObjectId(id));
  if (!child) {
    return jsonError("Child not found", 404, "NOT_FOUND");
  }
  if (!canWriteChild(actor, child)) {
    return jsonError("Insufficient permissions", 403, "FORBIDDEN");
  }

  const caregiver = child.caregivers?.find((entry) => entry.id === caregiverId);
  if (!caregiver) {
    return jsonError("Caregiver not found", 404, "NOT_FOUND");
  }

  const locale = caregiver.preferredLocale || requestedLocale || child.locale || "en";

  const token = await createConsentReviewToken({
    childId: id,
    caregiverId,
    locale,
  });
  const reviewLink = new URL(`/${locale}/consent/${token}`, request.url).toString();
  const now = new Date().toISOString();
  const nextCaregivers = (child.caregivers || []).map((entry) => (
    entry.id === caregiverId
      ? {
          ...entry,
          inviteStatus: "invited" as const,
          lastInviteAt: now,
        }
      : entry
  ));

  await updateChildById(new ObjectId(id), {
    ...toChildUpdatePayload(child),
    caregivers: nextCaregivers,
  });

  await recordAuditEvent({
    action: "consent.request",
    status: "success",
    actor,
    request,
    institutionId: child.institutionId,
    targetType: "child",
    targetId: child._id,
    targetLabel: child.name,
    summary: "Consent self-service review link generated",
    metadata: {
      caregiverId,
      caregiverEmail: caregiver.email,
      locale,
    },
  });

  return NextResponse.json({
    reviewLink,
    caregiver: {
      id: caregiver.id,
      name: caregiver.name,
      email: caregiver.email,
    },
  });
}
