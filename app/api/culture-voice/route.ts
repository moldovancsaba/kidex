import { NextResponse } from "next/server";
import { recordAuditEvent } from "@/lib/audit";
import { jsonError, readJson } from "@/lib/api";
import { CULTURE_SURVEY_DIMENSIONS, normalizeCultureSurveyResponse } from "@/lib/culture-surveys";
import { verifyCultureSurveyToken } from "@/lib/culture-survey-tokens";
import { addCultureSurveyResponse, getCultureSurveyLaunchById } from "@/repositories/culture-survey.repository";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") || "";
  const payload = await verifyCultureSurveyToken(token);
  if (!payload) {
    return jsonError("Invalid or expired survey link", 400, "VALIDATION_ERROR");
  }

  const launch = await getCultureSurveyLaunchById(payload.surveyId);
  if (!launch) {
    return jsonError("Survey not found", 404, "NOT_FOUND");
  }

  return NextResponse.json({
    survey: {
      id: launch._id,
      title: launch.title,
      scopeLabel: launch.scopeLabel,
      targetRole: launch.targetRole,
      status: launch.status,
      closesAt: launch.closesAt,
      minResponses: launch.minResponses,
      questions: CULTURE_SURVEY_DIMENSIONS.map((dimension) => ({
        key: dimension.key,
        label: dimension.label,
        prompt: dimension.prompt[launch.targetRole],
      })),
    },
  });
}

export async function POST(request: Request) {
  const body = await readJson(request) as {
    token?: string;
    answers?: unknown;
  } | null;
  const token = typeof body?.token === "string" ? body.token : "";
  const payload = await verifyCultureSurveyToken(token);
  if (!payload) {
    return jsonError("Invalid or expired survey link", 400, "VALIDATION_ERROR");
  }

  const launch = await getCultureSurveyLaunchById(payload.surveyId);
  if (!launch) {
    return jsonError("Survey not found", 404, "NOT_FOUND");
  }
  if (launch.status !== "active") {
    return jsonError("Survey is no longer active", 400, "VALIDATION_ERROR");
  }
  if (launch.closesAt && new Date(launch.closesAt).getTime() < Date.now()) {
    return jsonError("Survey has closed", 400, "VALIDATION_ERROR");
  }

  const response = normalizeCultureSurveyResponse({ answers: body?.answers }, launch.targetRole);
  const updated = await addCultureSurveyResponse(payload.surveyId, response);
  await recordAuditEvent({
    action: "culture.respond",
    status: "success",
    request,
    institutionId: launch.institutionId,
    targetType: "survey",
    targetId: launch._id,
    targetLabel: launch.title,
    summary: "Anonymous culture survey response submitted",
    metadata: {
      scopeLabel: launch.scopeLabel,
      targetRole: launch.targetRole,
      responseCount: updated?.responses.length || launch.responses.length + 1,
    },
  });

  return NextResponse.json({ success: true });
}
