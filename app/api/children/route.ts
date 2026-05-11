import { NextResponse } from "next/server";
import { buildConsentHistoryEvents, deriveLegacyConsents, mergeConsentHistory } from "@/lib/consent-policy";
import { listChildren, listChildrenWithMetrics, listDeletedChildren, upsertChild } from "@/repositories/child.repository";
import { buildFamilyAccessEvents, mergeFamilyAccessHistory } from "@/lib/family-access";
import { applyActorOwnershipToChild, canReadChild, requirePermission } from "@/lib/authorization";
import { recordAuditEvent } from "@/lib/audit";
import { syncChildrenFromAssessments } from "@/lib/sync-children";
import { jsonError, readJson } from "@/lib/api";
import { parseChildPayload } from "@/lib/validations";

export async function GET(request: Request) {
  const { actor, error } = await requirePermission(request, "children.read");
  if (error) return error;

  try {
    const { searchParams } = new URL(request.url);
    const includeMetrics = searchParams.get("metrics") === "true";
    const includeDeleted = searchParams.get("deleted") === "true";

    if (includeDeleted) {
      const deletedChildren = await listDeletedChildren();
      return NextResponse.json(deletedChildren.filter((child) => canReadChild(actor, child)));
    }

    let children = includeMetrics ? await listChildrenWithMetrics() : await listChildren();
    
    if (children.length === 0) {
      await syncChildrenFromAssessments();
      children = includeMetrics ? await listChildrenWithMetrics() : await listChildren();
    }
    return NextResponse.json(children.filter((child) => canReadChild(actor, child)));
  } catch (error) {
    return jsonError((error as Error).message);
  }
}

export async function POST(request: Request) {
  const { actor, error } = await requirePermission(request, "children.write");
  if (error) return error;

  try {
    const body = parseChildPayload(await readJson(request));
    if (!body.name || !body.birthDate) {
      return jsonError("Child name and birthDate are required", 400, "VALIDATION_ERROR");
    }
    const familyAccessEvents = buildFamilyAccessEvents({
      previous: [],
      next: body.caregivers,
      actorEmail: actor?.email,
    });
    const consentEvents = buildConsentHistoryEvents({
      previous: undefined,
      next: body.consentPolicy,
      actorEmail: actor?.email,
    });
    const legacyConsent = deriveLegacyConsents(body.consentPolicy);
    const child = await upsertChild(applyActorOwnershipToChild(actor, {
      ...body,
      consentPhoto: legacyConsent.consentPhoto,
      consentReport: legacyConsent.consentReport,
      consentHistory: mergeConsentHistory([], consentEvents),
      familyAccessHistory: mergeFamilyAccessHistory([], familyAccessEvents),
    }));
    await recordAuditEvent({
      action: "child.create",
      status: "success",
      actor,
      request,
      institutionId: child.institutionId,
      targetType: "child",
      targetId: child._id,
      targetLabel: child.name,
      summary: "Child profile created",
      metadata: {
        birthDate: child.birthDate,
        ageGroup: child.ageGroup,
        consentPhoto: child.consentPhoto,
        consentReport: child.consentReport,
        caregiverCount: child.caregivers?.length || 0,
        consentEvents,
      },
    });
    if (consentEvents.length > 0) {
      await recordAuditEvent({
        action: "consent.update",
        status: "success",
        actor,
        request,
        institutionId: child.institutionId,
        targetType: "child",
        targetId: child._id,
        targetLabel: child.name,
        summary: "Consent policy created",
        metadata: {
          consentEvents,
          consentPolicy: child.consentPolicy,
        },
      });
    }
    if (familyAccessEvents.length > 0) {
      await recordAuditEvent({
        action: "family.upsert",
        status: "success",
        actor,
        request,
        institutionId: child.institutionId,
        targetType: "child",
        targetId: child._id,
        targetLabel: child.name,
        summary: "Family-linked caregiver profiles created",
        metadata: {
          caregiverCount: child.caregivers?.length || 0,
          events: familyAccessEvents,
        },
      });
    }
    return NextResponse.json(child);
  } catch (error) {
    return jsonError((error as Error).message);
  }
}
