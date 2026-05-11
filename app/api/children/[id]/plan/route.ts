import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { canReadChild, canWriteChild, requirePermission } from "@/lib/authorization";
import { jsonError, readJson } from "@/lib/api";
import { recordAuditEvent } from "@/lib/audit";
import type { DevelopmentPlan } from "@/lib/development-plans";
import { getChildById } from "@/repositories/child.repository";
import { getLatestDevelopmentPlanByChildId, upsertDevelopmentPlanByChildId } from "@/repositories/development-plan.repository";

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

  const plan = await getLatestDevelopmentPlanByChildId(id);
  return NextResponse.json({ plan });
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

  const body = await readJson(request) as Partial<DevelopmentPlan> | null;
  if (!body?.summary || !Array.isArray(body.assignments) || !Array.isArray(body.checkpoints)) {
    return jsonError("Plan summary, assignments, and checkpoints are required", 400, "VALIDATION_ERROR");
  }

  const plan = await upsertDevelopmentPlanByChildId(id, {
    childId: id,
    assessmentId: body.assessmentId,
    institutionId: child.institutionId,
    standardsVersionUsed: body.standardsVersionUsed,
    status: body.status === "completed" ? "completed" : body.status === "active" ? "active" : "draft",
    summary: String(body.summary).trim(),
    assignments: body.assignments.map((assignment, index) => ({
      id: assignment.id || `assignment-${index + 1}`,
      title: String(assignment.title || "").trim(),
      notes: String(assignment.notes || "").trim(),
      audience: assignment.audience === "family" || assignment.audience === "child" ? assignment.audience : "practitioner",
      status: assignment.status === "done" || assignment.status === "in_progress" ? assignment.status : "pending",
      dueDate: assignment.dueDate,
      focusAreaIds: Array.isArray(assignment.focusAreaIds) ? assignment.focusAreaIds.map((value) => String(value)) : [],
    })),
    checkpoints: body.checkpoints.map((checkpoint, index) => ({
      id: checkpoint.id || `checkpoint-${index + 1}`,
      title: String(checkpoint.title || "").trim(),
      notes: String(checkpoint.notes || "").trim(),
      dueDate: checkpoint.dueDate,
      completed: Boolean(checkpoint.completed),
    })),
    progressNotes: String(body.progressNotes || "").trim(),
    createdByUserEmail: body.createdByUserEmail || actor?.email,
  });

  await recordAuditEvent({
    action: "plan.upsert",
    status: "success",
    actor,
    request,
    institutionId: child.institutionId,
    targetType: "child",
    targetId: id,
    targetLabel: child.name,
    summary: "Development plan saved",
    metadata: {
      assignmentCount: plan.assignments.length,
      checkpointCount: plan.checkpoints.length,
      status: plan.status,
      assessmentId: plan.assessmentId,
    },
  });

  return NextResponse.json({ plan });
}
