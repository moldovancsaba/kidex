import { NextResponse } from "next/server";
import { env } from "@/config/env";
import { jsonError } from "@/lib/api";
import { canReadAssessment, canReadChild, requirePermission } from "@/lib/authorization";
import { recordAuditEvent } from "@/lib/audit";
import { hasActiveConsent } from "@/lib/consent-policy";
import { getAssessment } from "@/services/assessment.service";
import { getChildById } from "@/repositories/child.repository";
import { ObjectId } from "mongodb";

const maxSize = 32 * 1024 * 1024;

export async function POST(request: Request) {
  const { actor, error } = await requirePermission(request, "uploads.write");
  if (error) return error;

  const apiKey = env.imgbbApiKey;
  if (!apiKey) {
    return jsonError("IMGBB_API_KEY is not configured");
  }

  const incoming = await request.formData().catch(() => null);
  const file = incoming?.get("image");
  const childId = typeof incoming?.get("childId") === "string" ? String(incoming?.get("childId")) : undefined;
  const recordId = typeof incoming?.get("recordId") === "string" ? String(incoming?.get("recordId")) : undefined;
  const assertedConsentPhoto = String(incoming?.get("consentPhoto") || "") === "true";
  if (!(file instanceof File)) {
    return jsonError("Upload requires an image file field named image", 400, "VALIDATION_ERROR");
  }

  if (!file.type.startsWith("image/")) {
    return jsonError("Only image uploads are allowed", 400, "VALIDATION_ERROR");
  }

  if (file.size > maxSize) {
    return jsonError("Image exceeds ImgBB 32 MB limit", 400, "VALIDATION_ERROR");
  }

  const assessment = recordId && ObjectId.isValid(recordId) ? await getAssessment(new ObjectId(recordId)) : null;
  const childFromAssessment = assessment?.childId && ObjectId.isValid(assessment.childId) ? await getChildById(new ObjectId(assessment.childId)) : null;
  const child = childFromAssessment || (!assessment && childId && ObjectId.isValid(childId) ? await getChildById(new ObjectId(childId)) : null);
  if (assessment && !canReadAssessment(actor, assessment)) {
    return jsonError("Insufficient permissions", 403, "FORBIDDEN");
  }
  if (child && !canReadChild(actor, child)) {
    return jsonError("Insufficient permissions", 403, "FORBIDDEN");
  }

  const effectiveConsentPhoto = assessment
    ? child
      ? hasActiveConsent(child.consentPolicy, "mediaCapture")
      : Boolean(assessment.session?.consentSnapshot?.mediaCapture ?? assessment.session?.consentPhoto)
    : child
      ? hasActiveConsent(child.consentPolicy, "mediaCapture")
      : assertedConsentPhoto;
  if (!effectiveConsentPhoto) {
    await recordAuditEvent({
      action: "media.upload",
      status: "failed",
      actor,
      request,
      institutionId: assessment?.institutionId || child?.institutionId,
      targetType: "media",
      targetId: recordId || childId,
      targetLabel: assessment?.child?.name || child?.name || file.name,
      summary: "Media upload blocked because photo consent is missing",
      metadata: {
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        childId,
        recordId,
        consentSource: assessment ? "assessment" : child ? "child" : "asserted",
      },
    });
    return jsonError("Photo or video consent is required before upload", 400, "VALIDATION_ERROR");
  }

  const upload = new FormData();
  upload.set("image", file);
  upload.set("name", file.name.replace(/\.[^.]+$/, "").slice(0, 80));

  const response = await fetch(`https://api.imgbb.com/1/upload?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    body: upload
  });
  const body = await response.json().catch(() => null) as {
    success?: boolean;
    error?: { message?: string };
    data?: {
      id?: string;
      title?: string;
      url?: string;
      display_url?: string;
      delete_url?: string;
      thumb?: { url?: string };
      image?: { url?: string };
    };
  } | null;

  if (!response.ok || !body?.success || !body.data?.url) {
    await recordAuditEvent({
      action: "media.upload",
      status: "failed",
      actor,
      request,
      institutionId: assessment?.institutionId || child?.institutionId,
      targetType: "media",
      targetId: recordId || childId,
      targetLabel: assessment?.child?.name || child?.name || file.name,
      summary: "Media upload failed",
      metadata: {
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        childId,
        recordId,
        providerError: body?.error?.message,
      },
    });
    return jsonError(body?.error?.message || "ImgBB upload failed", response.ok ? 502 : response.status, "UPLOAD_FAILED");
  }

  const uploadedAt = new Date().toISOString();
  await recordAuditEvent({
    action: "media.upload",
    status: "success",
    actor,
    request,
    institutionId: assessment?.institutionId || child?.institutionId,
    targetType: "media",
    targetId: body.data.id || recordId || childId,
    targetLabel: assessment?.child?.name || child?.name || body.data.title || file.name,
    summary: "Media uploaded to evidence store",
    metadata: {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      childId,
      recordId,
      consentSource: assessment ? "assessment" : child ? "child" : "asserted",
      url: body.data.url,
      deleteUrl: body.data.delete_url,
    },
  });

  return NextResponse.json({
    attachment: {
      id: body.data.id || crypto.randomUUID(),
      name: body.data.title || file.name,
      url: body.data.url,
      thumbUrl: body.data.thumb?.url || body.data.image?.url || body.data.display_url,
      deleteUrl: body.data.delete_url,
      mimeType: file.type,
      size: file.size,
      uploadedAt
    }
  });
}
