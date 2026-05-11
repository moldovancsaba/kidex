import { NextResponse } from "next/server";
import { env } from "@/config/env";
import { parseRoleHeader, type SupportedRuntimeRole } from "@/lib/roles";

const roleHeader = "x-kidex-role";

export function jsonError(message: string, status = 500, code?: string) {
  return NextResponse.json(
    { error: message, code: code || "UNKNOWN_ERROR" },
    { status }
  );
}

export async function readJson(request: Request): Promise<unknown | null> {
  return request.json().catch(() => null);
}

export function requireRole(request: Request, allowedRoles: readonly SupportedRuntimeRole[]) {
  if (!env.kidexEnforceAuth) {
    return null;
  }

  const roleHeaderValue = request.headers.get(roleHeader);
  const userRoles = parseRoleHeader(roleHeaderValue);

  if (userRoles.length === 0) {
    return jsonError("Missing role header", 401, "AUTH_REQUIRED");
  }

  const hasPermission = allowedRoles.some((role) => userRoles.includes(role));
  if (!hasPermission) {
    return jsonError("Insufficient permissions", 403, "FORBIDDEN");
  }

  return null;
}
