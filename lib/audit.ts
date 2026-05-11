import type { AuthenticatedActor } from "@/lib/authorization";
import { createAuditLog, type AuditAction, type AuditLogEntry } from "@/repositories/audit.repository";

interface AuditRequestContext {
  method?: string;
  path?: string;
  userAgent?: string;
}

export interface AuditEventInput {
  action: AuditAction;
  status: "success" | "failed";
  actor?: AuthenticatedActor | null;
  request?: Request | AuditRequestContext | null;
  institutionId?: string;
  targetType?: AuditLogEntry["targetType"];
  targetId?: string;
  targetLabel?: string;
  summary: string;
  metadata?: Record<string, unknown>;
}

function requestContextFrom(input?: Request | AuditRequestContext | null): AuditRequestContext | undefined {
  if (!input) return undefined;
  if (input instanceof Request) {
    const url = new URL(input.url);
    return {
      method: input.method,
      path: url.pathname,
      userAgent: input.headers.get("user-agent") || undefined,
    };
  }
  return input;
}

export async function recordAuditEvent(input: AuditEventInput) {
  const actor = input.actor;
  const createdAt = new Date().toISOString();
  try {
    await createAuditLog({
      action: input.action,
      status: input.status,
      createdAt,
      actorEmail: actor?.email,
      actorName: actor?.name,
      actorRoles: actor?.roles,
      institutionId: input.institutionId || actor?.primaryInstitutionId,
      targetType: input.targetType,
      targetId: input.targetId,
      targetLabel: input.targetLabel,
      summary: input.summary,
      request: requestContextFrom(input.request),
      metadata: input.metadata,
    });
  } catch (error) {
    console.error("Audit log write failed:", error);
  }
}
