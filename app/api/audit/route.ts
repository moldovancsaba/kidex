import { NextResponse } from "next/server";
import { jsonError, readJson } from "@/lib/api";
import { getAssessment } from "@/services/assessment.service";
import { requirePermission } from "@/lib/authorization";
import { recordAuditEvent } from "@/lib/audit";
import { listRecentAuditLogs } from "@/repositories/audit.repository";
import { getChildById } from "@/repositories/child.repository";
import { ObjectId } from "mongodb";

export async function GET(request: Request) {
  const { actor, error } = await requirePermission(request, "settings.write");
  if (error) return error;

  try {
    const limit = Number(new URL(request.url).searchParams.get("limit") || "25");
    const logs = await listRecentAuditLogs(limit);
    const visibleLogs = actor?.roles.includes("admin")
      ? logs
      : logs.filter((log) => !log.institutionId || actor?.institutionIds.includes(log.institutionId));
    return NextResponse.json({ logs: visibleLogs });
  } catch (err) {
    return jsonError((err as Error).message);
  }
}

export async function POST(request: Request) {
  const { actor, error } = await requirePermission(request, "assessments.read");
  if (error) return error;

  try {
    const body = await readJson(request) as {
      format?: "map" | "original";
      status?: "success" | "failed";
      childId?: string;
      recordId?: string;
      durationMs?: number;
      warnings?: string[];
      error?: string;
    } | null;

    const assessment = body?.recordId && ObjectId.isValid(body.recordId)
      ? await getAssessment(new ObjectId(body.recordId))
      : null;
    const child = !assessment && body?.childId && ObjectId.isValid(body.childId)
      ? await getChildById(new ObjectId(body.childId))
      : null;

    await recordAuditEvent({
      action: "export.pdf",
      status: body?.status === "failed" ? "failed" : "success",
      actor,
      request,
      institutionId: assessment?.institutionId || child?.institutionId || actor?.primaryInstitutionId,
      targetType: "report",
      targetId: body?.recordId || body?.childId,
      targetLabel: assessment?.child?.name || child?.name,
      summary: `PDF ${body?.status === "failed" ? "export failed" : "export generated"} (${body?.format || "original"})`,
      metadata: {
        format: body?.format || "original",
        childId: body?.childId,
        recordId: body?.recordId,
        durationMs: body?.durationMs,
        warnings: body?.warnings || [],
        error: body?.error,
        standardsVersionUsed: assessment?.standardsVersionUsed,
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return jsonError((err as Error).message);
  }
}
