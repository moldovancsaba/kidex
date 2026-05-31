import { NextResponse } from "next/server";
import { getChildById } from "@/repositories/child.repository";
import { listAssessmentsByChildId } from "@/repositories/assessment.repository";
import { withAssessmentQuality } from "@/services/assessment.service";
import { ObjectId } from "mongodb";
import { canReadAssessment, canReadChild, requirePermission } from "@/lib/authorization";
import { jsonError } from "@/lib/api";
import type { AssessmentRecord } from "@/types/assessment";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { actor, error } = await requirePermission(request, "children.read");
    if (error) {
      return error;
    }

    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return jsonError("Invalid ID", 400, "VALIDATION_ERROR");
    }
    const childId = new ObjectId(id);
    const child = await getChildById(childId);
    if (!child) {
      return jsonError("Child not found", 404, "NOT_FOUND");
    }
    if (!canReadChild(actor, child)) {
      return jsonError("Insufficient permissions", 403, "FORBIDDEN");
    }
    
    const assessments = await listAssessmentsByChildId(id);
    return NextResponse.json({
      child,
      assessments: assessments
        .filter((assessment) => canReadAssessment(actor, assessment as AssessmentRecord))
        .map(withAssessmentQuality),
    });
  } catch (error) {
    return jsonError((error as Error).message);
  }
}
