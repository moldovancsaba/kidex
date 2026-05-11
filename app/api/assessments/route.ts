import { NextResponse } from "next/server";
import { canReadAssessment, requirePermission } from "@/lib/authorization";
import { recordAuditEvent } from "@/lib/audit";
import { createAssessmentFromPayload, listAssessments, listDeletedAssessments } from "@/services/assessment.service";
import { jsonError, readJson } from "@/lib/api";
import type { AssessmentRecord } from "@/types/assessment";

export async function GET(request: Request) {
  const { actor, error } = await requirePermission(request, "assessments.read");
  if (error) return error;

  try {
    const { searchParams } = new URL(request.url);
    if (searchParams.get("deleted") === "true") {
      const deleted = await listDeletedAssessments();
      return NextResponse.json({ ...deleted, assessments: deleted.assessments.filter((assessment) => canReadAssessment(actor, assessment as AssessmentRecord)) });
    }
    const result = await listAssessments();
    return NextResponse.json({ ...result, assessments: result.assessments.filter((assessment) => canReadAssessment(actor, assessment as AssessmentRecord)) });
  } catch (error) {
    return jsonError((error as Error).message);
  }
}

export async function POST(request: Request) {
  const { actor, error } = await requirePermission(request, "assessments.write");
  if (error) return error;

  try {
    const assessment = await createAssessmentFromPayload(await readJson(request), actor);
    await recordAuditEvent({
      action: "assessment.create",
      status: "success",
      actor,
      request,
      institutionId: assessment.institutionId,
      targetType: "assessment",
      targetId: assessment._id,
      targetLabel: assessment.child.name,
      summary: "Assessment created",
      metadata: {
        childId: assessment.childId,
        mode: assessment.mode,
        sessionDate: assessment.session.date,
        standardsVersionUsed: assessment.standardsVersionUsed,
        consentPhoto: assessment.session.consentPhoto,
        consentReport: assessment.session.consentReport,
      },
    });
    return NextResponse.json({ assessment }, { status: 201 });
  } catch (error) {
    return jsonError((error as Error).message);
  }
}
