import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/authorization";
import { jsonError } from "@/lib/api";
import { recordAuditEvent } from "@/lib/audit";
import { listAssessmentSummaries, listDeletedAssessmentSummaries } from "@/repositories/assessment.repository";
import { listRecentAuditLogs } from "@/repositories/audit.repository";
import { listChildren, listDeletedChildren } from "@/repositories/child.repository";
import { getGlobalSettings } from "@/repositories/settings.repository";
import { listAllUsers } from "@/repositories/user.repository";

type ExportScope = "governance" | "children" | "assessments" | "audit";

function exportFileName(scope: ExportScope) {
  const stamp = new Date().toISOString().slice(0, 10);
  return `kidex_${scope}_export_${stamp}.json`;
}

export async function GET(request: Request) {
  const { actor, error } = await requirePermission(request, "settings.write");
  if (error) return error;

  try {
    const url = new URL(request.url);
    const scope = (url.searchParams.get("scope") || "governance") as ExportScope;
    const validScopes: ExportScope[] = ["governance", "children", "assessments", "audit"];
    if (!validScopes.includes(scope)) {
      return jsonError("Invalid export scope", 400, "VALIDATION_ERROR");
    }

    const [settings, users, children, deletedChildren, assessments, deletedAssessments, auditLogs] = await Promise.all([
      getGlobalSettings(),
      listAllUsers(),
      listChildren(),
      listDeletedChildren(),
      listAssessmentSummaries(),
      listDeletedAssessmentSummaries(),
      listRecentAuditLogs(1000),
    ]);

    const payloadBase = {
      exportedAt: new Date().toISOString(),
      exportedBy: actor?.email,
      scope,
    };

    const payload = scope === "children"
      ? {
          ...payloadBase,
          activeChildren: children,
          deletedChildren,
        }
      : scope === "assessments"
        ? {
            ...payloadBase,
            activeAssessments: assessments,
            deletedAssessments,
          }
        : scope === "audit"
          ? {
              ...payloadBase,
              auditLogs,
            }
          : {
              ...payloadBase,
              settings,
              users,
              activeChildren: children,
              deletedChildren,
              activeAssessments: assessments,
              deletedAssessments,
              auditLogs,
            };

    await recordAuditEvent({
      action: "export.data",
      status: "success",
      actor,
      request,
      targetType: "settings",
      targetId: scope,
      targetLabel: `${scope} export`,
      summary: `Governance data export generated (${scope})`,
      metadata: {
        scope,
        userCount: users.length,
        activeChildren: children.length,
        deletedChildren: deletedChildren.length,
        activeAssessments: assessments.length,
        deletedAssessments: deletedAssessments.length,
        auditLogCount: auditLogs.length,
      },
    });

    return new NextResponse(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename=\"${exportFileName(scope)}\"`,
      },
    });
  } catch (error) {
    return jsonError((error as Error).message);
  }
}
