import { NextResponse } from "next/server";
import { canReadAssessment, canWriteAssessment, requirePermission } from "@/lib/authorization";
import { recordAuditEvent } from "@/lib/audit";
import {
  getAssessment,
  parseObjectId,
  removeAssessment,
  restoreAssessment,
  updateAssessmentFromPayload
} from "@/services/assessment.service";
import { jsonError, readJson } from "@/lib/api";
import type { AssessmentRecord } from "@/types/assessment";

interface RouteContext {
  params: Promise<{ id: string }>;
}

async function objectIdFromContext(context: RouteContext) {
  const { id } = await context.params;
  return parseObjectId(id);
}

export async function GET(_request: Request, context: RouteContext) {
  const { actor, error } = await requirePermission(_request, "assessments.read");
  if (error) return error;

  const _id = await objectIdFromContext(context);
  if (!_id) {
    return jsonError("Invalid assessment id", 400, "VALIDATION_ERROR");
  }

  try {
    const assessment = await getAssessment(_id);
    if (!assessment) {
      return jsonError("Assessment not found", 404, "NOT_FOUND");
    }
    if (!canReadAssessment(actor, assessment as AssessmentRecord)) {
      return jsonError("Insufficient permissions", 403, "FORBIDDEN");
    }

    return NextResponse.json({ assessment });
  } catch (error) {
    return jsonError((error as Error).message);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const { actor, error } = await requirePermission(request, "assessments.write");
  if (error) return error;

  const _id = await objectIdFromContext(context);
  if (!_id) {
    return jsonError("Invalid assessment id", 400, "VALIDATION_ERROR");
  }

  try {
    const existing = await getAssessment(_id);
    if (!existing) {
      return jsonError("Assessment not found", 404, "NOT_FOUND");
    }
    if (!canWriteAssessment(actor, existing as AssessmentRecord)) {
      return jsonError("Insufficient permissions", 403, "FORBIDDEN");
    }
    const assessment = await updateAssessmentFromPayload(_id, await readJson(request), actor);
    if (!assessment) {
      return jsonError("Assessment not found", 404, "NOT_FOUND");
    }

    await recordAuditEvent({
      action: "assessment.update",
      status: "success",
      actor,
      request,
      institutionId: assessment.institutionId,
      targetType: "assessment",
      targetId: assessment._id,
      targetLabel: assessment.child.name,
      summary: "Assessment updated",
      metadata: {
        childId: assessment.childId,
        mode: assessment.mode,
        sessionDate: assessment.session.date,
        standardsVersionUsed: assessment.standardsVersionUsed,
        consentSnapshot: assessment.session.consentSnapshot,
      },
    });

    return NextResponse.json({ assessment });
  } catch (error) {
    return jsonError((error as Error).message);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { actor, error } = await requirePermission(_request, "assessments.delete");
  if (error) return error;

  const _id = await objectIdFromContext(context);
  if (!_id) {
    return jsonError("Invalid assessment id", 400, "VALIDATION_ERROR");
  }

  try {
    const existing = await getAssessment(_id);
    if (!existing) {
      return jsonError("Assessment not found", 404, "NOT_FOUND");
    }
    if (!canWriteAssessment(actor, existing as AssessmentRecord)) {
      return jsonError("Insufficient permissions", 403, "FORBIDDEN");
    }
    await removeAssessment(_id);
    await recordAuditEvent({
      action: "assessment.delete",
      status: "success",
      actor,
      request: _request,
      institutionId: existing.institutionId,
      targetType: "assessment",
      targetId: existing._id,
      targetLabel: existing.child.name,
      summary: "Assessment deleted",
      metadata: {
        childId: existing.childId,
        sessionDate: existing.session.date,
      },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError((error as Error).message);
  }
}

export async function POST(_request: Request, context: RouteContext) {
  const { actor, error } = await requirePermission(_request, "assessments.restore");
  if (error) return error;
  const _id = await objectIdFromContext(context);
  if (!_id) {
    return jsonError("Invalid assessment id", 400, "VALIDATION_ERROR");
  }
  try {
    const existing = await getAssessment(_id);
    await restoreAssessment(_id);
    if (existing) {
      await recordAuditEvent({
        action: "assessment.restore",
        status: "success",
        actor,
        request: _request,
        institutionId: existing.institutionId,
        targetType: "assessment",
        targetId: existing._id,
        targetLabel: existing.child.name,
        summary: "Deleted assessment restored",
        metadata: {
          childId: existing.childId,
          sessionDate: existing.session.date,
        },
      });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError((error as Error).message);
  }
}
