import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/authorization";
import { jsonError, readJson } from "@/lib/api";
import { buildCultureAnalytics, canReadCultureLaunch, createCultureSurveyLaunch, type CultureSurveyTargetRole } from "@/lib/culture-surveys";
import { createCultureSurveyToken } from "@/lib/culture-survey-tokens";
import { recordAuditEvent } from "@/lib/audit";
import { closeCultureSurveyLaunch, createCultureSurveyLaunchRecord, listCultureSurveyLaunches } from "@/repositories/culture-survey.repository";

export async function GET(request: Request) {
  const { actor, error } = await requirePermission(request, "settings.read");
  if (error) return error;

  try {
    const launches = await listCultureSurveyLaunches(actor?.roles.includes("admin") ? undefined : actor?.institutionIds);
    const visibleLaunches = launches.filter((launch) => canReadCultureLaunch(actor, launch.institutionId));
    return NextResponse.json({
      launches: visibleLaunches,
      analytics: buildCultureAnalytics(visibleLaunches),
    });
  } catch (err) {
    return jsonError((err as Error).message);
  }
}

export async function POST(request: Request) {
  const { actor, error } = await requirePermission(request, "settings.write");
  if (error) return error;

  try {
    const body = await readJson(request) as {
      title?: string;
      scopeLabel?: string;
      targetRole?: CultureSurveyTargetRole;
      minResponses?: number;
      closesAt?: string;
      institutionId?: string;
      action?: "create" | "close";
      surveyId?: string;
      locale?: string;
    } | null;

    if (body?.action === "close") {
      const surveyId = typeof body.surveyId === "string" ? body.surveyId : "";
      if (!surveyId) return jsonError("Survey id is required", 400, "VALIDATION_ERROR");
      const launch = await closeCultureSurveyLaunch(surveyId);
      if (!launch) return jsonError("Survey not found", 404, "NOT_FOUND");
      await recordAuditEvent({
        action: "culture.launch",
        status: "success",
        actor,
        request,
        institutionId: launch.institutionId,
        targetType: "survey",
        targetId: launch._id,
        targetLabel: launch.title,
        summary: "Culture survey launch closed",
        metadata: {
          scopeLabel: launch.scopeLabel,
          targetRole: launch.targetRole,
          responseCount: launch.responses.length,
        },
      });
      return NextResponse.json({ launch });
    }

    const launch = createCultureSurveyLaunch({
      institutionId: typeof body?.institutionId === "string" ? body.institutionId : actor?.primaryInstitutionId || "default",
      title: typeof body?.title === "string" ? body.title : "",
      scopeLabel: typeof body?.scopeLabel === "string" ? body.scopeLabel : "",
      targetRole: body?.targetRole === "caregiver" || body?.targetRole === "staff" ? body.targetRole : "athlete",
      minResponses: body?.minResponses,
      closesAt: typeof body?.closesAt === "string" ? body.closesAt : undefined,
      createdByUserEmail: actor?.email,
    });
    const created = await createCultureSurveyLaunchRecord(launch);
    const token = await createCultureSurveyToken({
      surveyId: created._id || "",
      locale: typeof body?.locale === "string" ? body.locale : undefined,
    });
    await recordAuditEvent({
      action: "culture.launch",
      status: "success",
      actor,
      request,
      institutionId: created.institutionId,
      targetType: "survey",
      targetId: created._id,
      targetLabel: created.title,
      summary: "Culture survey launch created",
      metadata: {
        scopeLabel: created.scopeLabel,
        targetRole: created.targetRole,
        minResponses: created.minResponses,
      },
    });
    return NextResponse.json({
      launch: created,
      shareLink: `/${body?.locale === "hu" || body?.locale === "ar" ? body.locale : "en"}/voice/${token}`,
    });
  } catch (err) {
    return jsonError((err as Error).message);
  }
}
