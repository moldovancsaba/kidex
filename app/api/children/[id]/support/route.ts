import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { canReadChild, canWriteChild, requirePermission } from "@/lib/authorization";
import { recordAuditEvent } from "@/lib/audit";
import { jsonError, readJson } from "@/lib/api";
import { normalizeSupportWorkspace } from "@/lib/support-workspace";
import { getChildById } from "@/repositories/child.repository";
import { getSupportWorkspaceByChildId, upsertSupportWorkspaceByChildId } from "@/repositories/support-workspace.repository";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { actor, error } = await requirePermission(request, "children.read");
  if (error) return error;

  const { id } = await params;
  if (!ObjectId.isValid(id)) {
    return jsonError("Invalid ID", 400, "VALIDATION_ERROR");
  }

  const child = await getChildById(new ObjectId(id));
  if (!child) return jsonError("Child not found", 404, "NOT_FOUND");
  if (!canReadChild(actor, child)) {
    return jsonError("Insufficient permissions", 403, "FORBIDDEN");
  }

  const workspace = await getSupportWorkspaceByChildId(id);
  return NextResponse.json({ workspace });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { actor, error } = await requirePermission(request, "children.write");
  if (error) return error;

  const { id } = await params;
  if (!ObjectId.isValid(id)) {
    return jsonError("Invalid ID", 400, "VALIDATION_ERROR");
  }

  const child = await getChildById(new ObjectId(id));
  if (!child) return jsonError("Child not found", 404, "NOT_FOUND");
  if (!canWriteChild(actor, child)) {
    return jsonError("Insufficient permissions", 403, "FORBIDDEN");
  }

  const body = normalizeSupportWorkspace(await readJson(request));
  const workspace = await upsertSupportWorkspaceByChildId(id, {
    childId: id,
    caregiverTools: body.caregiverTools,
    coachTools: body.coachTools,
    microLearning: body.microLearning,
    referrals: body.referrals,
    evidenceJournal: body.evidenceJournal,
  });

  await recordAuditEvent({
    action: "support.upsert",
    status: "success",
    actor,
    request,
    institutionId: child.institutionId,
    targetType: "child",
    targetId: id,
    targetLabel: child.name,
    summary: "Child support workspace updated",
    metadata: {
      caregiverTools: workspace.caregiverTools.length,
      coachTools: workspace.coachTools.length,
      microLearning: workspace.microLearning.length,
      referrals: workspace.referrals.length,
      evidenceJournal: workspace.evidenceJournal.length,
    },
  });

  return NextResponse.json({ workspace });
}
