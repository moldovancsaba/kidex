import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/authorization";
import { recordAuditEvent } from "@/lib/audit";
import { jsonError } from "@/lib/api";
import { restoreChildById } from "@/repositories/child.repository";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { actor, error } = await requirePermission(request, "children.restore");
  if (error) return error;

  try {
    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return jsonError("Invalid ID", 400, "VALIDATION_ERROR");
    }
    const child = await restoreChildById(new ObjectId(id));
    if (!child) return jsonError("Child not found", 404, "NOT_FOUND");
    await recordAuditEvent({
      action: "child.restore",
      status: "success",
      actor,
      request,
      institutionId: child.institutionId,
      targetType: "child",
      targetId: id,
      targetLabel: child.name,
      summary: "Deleted child profile restored",
      metadata: {
        birthDate: child.birthDate,
      },
    });
    return NextResponse.json(child);
  } catch (error) {
    return jsonError((error as Error).message);
  }
}
