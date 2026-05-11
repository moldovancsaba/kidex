import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { applyActorOwnershipToChild, canReadChild, canWriteChild, requirePermission } from "@/lib/authorization";
import { recordAuditEvent } from "@/lib/audit";
import { jsonError, readJson } from "@/lib/api";
import { buildFamilyAccessEvents, mergeFamilyAccessHistory } from "@/lib/family-access";
import { parseChildPayload } from "@/lib/validations";
import { deleteAssessmentsForChild, updateAssessmentsForChildProfile } from "@/repositories/assessment.repository";
import { deleteChildById, getChildById, updateChildById } from "@/repositories/child.repository";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { actor, error } = await requirePermission(_request, "children.read");
  if (error) return error;

  try {
    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return jsonError("Invalid ID", 400, "VALIDATION_ERROR");
    }

    const child = await getChildById(new ObjectId(id));
    if (!child) {
      return jsonError("Child not found", 404, "NOT_FOUND");
    }
    if (!canReadChild(actor, child)) {
      return jsonError("Insufficient permissions", 403, "FORBIDDEN");
    }

    return NextResponse.json(child);
  } catch (error) {
    return jsonError((error as Error).message);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { actor, error } = await requirePermission(request, "children.write");
  if (error) return error;

  try {
    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return jsonError("Invalid ID", 400, "VALIDATION_ERROR");
    }

    const existingChild = await getChildById(new ObjectId(id));
    if (!existingChild) {
      return jsonError("Child not found", 404, "NOT_FOUND");
    }
    if (!canWriteChild(actor, existingChild)) {
      return jsonError("Insufficient permissions", 403, "FORBIDDEN");
    }

    const parsedPayload = parseChildPayload(await readJson(request));
    const familyAccessEvents = buildFamilyAccessEvents({
      previous: existingChild.caregivers || [],
      next: parsedPayload.caregivers,
      actorEmail: actor?.email,
    });
    const payload = applyActorOwnershipToChild(actor, {
      ...existingChild,
      ...parsedPayload,
      familyAccessHistory: mergeFamilyAccessHistory(existingChild.familyAccessHistory, familyAccessEvents),
    });
    if (!payload.name || !payload.birthDate) {
      return jsonError("Child name and birthDate are required", 400, "VALIDATION_ERROR");
    }

    const child = await updateChildById(new ObjectId(id), payload);

    await updateAssessmentsForChildProfile(id, {
      name: payload.name,
      birthDate: payload.birthDate,
      ageGroup: payload.ageGroup,
      knownTraits: payload.knownTraits,
      parentSignals: payload.parentSignals,
      dominantHand: payload.dominantHand,
      dominantEye: payload.dominantEye,
      dominantFoot: payload.dominantFoot,
      consentPhoto: payload.consentPhoto,
      consentReport: payload.consentReport
    });

    await recordAuditEvent({
      action: "child.update",
      status: "success",
      actor,
      request,
      institutionId: child?.institutionId || existingChild.institutionId,
      targetType: "child",
      targetId: id,
      targetLabel: payload.name,
      summary: "Child profile updated",
      metadata: {
        ageGroup: payload.ageGroup,
        consentPhoto: payload.consentPhoto,
        consentReport: payload.consentReport,
        caregiverCount: payload.caregivers?.length || 0,
        familyAccessEvents,
      },
    });
    if (familyAccessEvents.length > 0) {
      await recordAuditEvent({
        action: "family.upsert",
        status: "success",
        actor,
        request,
        institutionId: child?.institutionId || existingChild.institutionId,
        targetType: "child",
        targetId: id,
        targetLabel: payload.name,
        summary: "Family-linked caregiver access updated",
        metadata: {
          caregiverCount: payload.caregivers?.length || 0,
          events: familyAccessEvents,
        },
      });
    }

    return NextResponse.json(child);
  } catch (error) {
    return jsonError((error as Error).message);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { actor, error } = await requirePermission(request, "children.delete");
  if (error) return error;

  try {
    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return jsonError("Invalid ID", 400, "VALIDATION_ERROR");
    }

    const existingChild = await getChildById(new ObjectId(id));
    if (!existingChild) {
      return jsonError("Child not found", 404, "NOT_FOUND");
    }
    if (!canWriteChild(actor, existingChild)) {
      return jsonError("Insufficient permissions", 403, "FORBIDDEN");
    }

    const child = await deleteChildById(new ObjectId(id));
    if (!child) {
      return jsonError("Child not found", 404, "NOT_FOUND");
    }

    await deleteAssessmentsForChild(id, {
      name: child.name,
      birthDate: child.birthDate
    });

    await recordAuditEvent({
      action: "child.delete",
      status: "success",
      actor,
      request,
      institutionId: child.institutionId,
      targetType: "child",
      targetId: id,
      targetLabel: child.name,
      summary: "Child profile deleted with linked assessment cleanup",
      metadata: {
        birthDate: child.birthDate,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return jsonError((error as Error).message);
  }
}
