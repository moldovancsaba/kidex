import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { determineCommunicationDeliveryStatus, type CommunicationCategory } from "@/lib/communication-policy";
import { canReadChild, requirePermission } from "@/lib/authorization";
import { recordAuditEvent } from "@/lib/audit";
import { jsonError, readJson } from "@/lib/api";
import { getChildById } from "@/repositories/child.repository";
import { createCommunicationLog, listCommunicationsByChildId } from "@/repositories/communication.repository";
import { getGlobalSettings } from "@/repositories/settings.repository";
import { DEFAULT_KIDEX_SETTINGS } from "@/services/settings-service";

function stringValue(value: unknown, max = 4000): string {
  return typeof value === "string" ? value.slice(0, max).trim() : "";
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { actor, error } = await requirePermission(request, "communications.read");
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

    const communications = await listCommunicationsByChildId(id);
    return NextResponse.json({ communications });
  } catch (error) {
    return jsonError((error as Error).message);
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { actor, error } = await requirePermission(request, "communications.write");
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

    const body = await readJson(request) as {
      category?: CommunicationCategory;
      subject?: string;
      body?: string;
      caregiverIds?: string[];
    };
    const category = body?.category === "caregiver_update" || body?.category === "family_announcement" ? body.category : "internal_note";
    const subject = stringValue(body?.subject, 240);
    const messageBody = stringValue(body?.body, 8000);
    const caregiverIds = Array.isArray(body?.caregiverIds)
      ? Array.from(new Set(body.caregiverIds.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)))
      : [];

    if (!subject || !messageBody) {
      return jsonError("Subject and message body are required", 400, "VALIDATION_ERROR");
    }

    const settings = (await getGlobalSettings()) || DEFAULT_KIDEX_SETTINGS;
    const policy = settings.communicationPolicy || DEFAULT_KIDEX_SETTINGS.communicationPolicy;
    const familyVisible = category !== "internal_note";
    if (familyVisible && policy.requireCaregiverVisibilityForFamilyMessages && caregiverIds.length === 0) {
      return jsonError("Caregiver visibility is required for family-facing communication", 400, "VALIDATION_ERROR");
    }
    if (category === "family_announcement" && !policy.allowFamilyAnnouncements) {
      return jsonError("Family announcements are disabled by institution policy", 400, "POLICY_BLOCK");
    }

    const caregiverMap = new Map((child.caregivers || [])
      .filter((caregiver) => caregiver.status === "active")
      .map((caregiver) => [caregiver.id, caregiver]));
    const recipients = caregiverIds
      .map((caregiverId) => caregiverMap.get(caregiverId))
      .filter((caregiver) => Boolean(caregiver && (caregiver.canReceiveReports || caregiver.canReceiveScheduling)));

    if (familyVisible && recipients.length === 0) {
      return jsonError("No eligible caregiver recipients were selected", 400, "VALIDATION_ERROR");
    }

    const communication = await createCommunicationLog({
      childId: id,
      institutionId: child.institutionId,
      category,
      subject,
      body: messageBody,
      caregiverIds: recipients.map((caregiver) => caregiver!.id),
      caregiverNames: recipients.map((caregiver) => caregiver!.name),
      visibleToCaregivers: familyVisible,
      createdByUserEmail: actor?.email,
      createdAt: new Date().toISOString(),
      deliveryStatus: familyVisible ? determineCommunicationDeliveryStatus(policy) : "logged",
      policySnapshot: policy,
    });

    await recordAuditEvent({
      action: "communication.create",
      status: "success",
      actor,
      request,
      institutionId: child.institutionId,
      targetType: "communication",
      targetId: communication._id,
      targetLabel: subject,
      summary: "Governed child communication logged",
      metadata: {
        childId: id,
        category,
        visibleToCaregivers: familyVisible,
        caregiverCount: recipients.length,
        deliveryStatus: communication.deliveryStatus,
      },
    });

    return NextResponse.json({ communication });
  } catch (error) {
    return jsonError((error as Error).message);
  }
}
