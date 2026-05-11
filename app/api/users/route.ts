import { NextResponse } from "next/server";
import { findUserByEmail, listAllUsers, upsertUser } from "@/repositories/user.repository";
import { recordAuditEvent } from "@/lib/audit";
import { jsonError, readJson } from "@/lib/api";
import { requirePermission } from "@/lib/authorization";
import { DEFAULT_INSTITUTION_ID, ensureInstitutionMembershipFromDirectory } from "@/lib/institutions";
import { parseUserPayload } from "@/lib/validations";

export async function GET(request: Request) {
  const { actor, error } = await requirePermission(request, "users.read");
  if (error) return error;

  try {
    const users = await listAllUsers();
    const visibleUsers = !actor || actor.roles.includes("admin")
      ? users
      : users.filter((user) => (user.institutionIds || []).some((institutionId) => actor.institutionIds.includes(institutionId)));
    return NextResponse.json({ users: visibleUsers });
  } catch (error) {
    return jsonError((error as Error).message);
  }
}

export async function POST(request: Request) {
  const { actor, error } = await requirePermission(request, "users.write");
  if (error) return error;

  try {
    const user = parseUserPayload(await readJson(request));
    const existing = await findUserByEmail(user.email || "");
    const { getGlobalSettings } = await import("@/repositories/settings.repository");
    const settings = await getGlobalSettings();
    const directory = settings?.institutions?.length ? settings.institutions : [{ id: DEFAULT_INSTITUTION_ID, name: "Default Institution", status: "active" as const }];
    const membership = ensureInstitutionMembershipFromDirectory(user.institutionIds, user.primaryInstitutionId, directory);
    user.institutionIds = membership.institutionIds;
    user.primaryInstitutionId = membership.primaryInstitutionId;
    if (!user.email) {
      return jsonError("User email is required", 400, "VALIDATION_ERROR");
    }
    if (actor && !actor.roles.includes("admin")) {
      const inActorInstitution = user.institutionIds.some((institutionId) => actor.institutionIds.includes(institutionId));
      if (!inActorInstitution) {
        return jsonError("User must belong to one of your institutions", 403, "FORBIDDEN");
      }
      if (user.roles.includes("admin")) {
        return jsonError("Only admins can assign admin role", 403, "FORBIDDEN");
      }
      user.institutionIds = actor.institutionIds.length > 0 ? actor.institutionIds : [DEFAULT_INSTITUTION_ID];
      user.primaryInstitutionId = actor.primaryInstitutionId || user.institutionIds[0] || DEFAULT_INSTITUTION_ID;
    }
    await upsertUser(user);
    await recordAuditEvent({
      action: "user.upsert",
      status: "success",
      actor,
      request,
      institutionId: user.primaryInstitutionId,
      targetType: "user",
      targetId: user.email,
      targetLabel: user.email,
      summary: existing ? "User access updated" : "User access created",
      metadata: {
        roles: user.roles,
        institutionIds: user.institutionIds,
        primaryInstitutionId: user.primaryInstitutionId,
      },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return jsonError((error as Error).message);
  }
}

export async function DELETE(request: Request) {
  const { actor, error } = await requirePermission(request, "users.delete");
  if (error) return error;

  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");
    if (!email) {
      return jsonError("User email is required", 400, "VALIDATION_ERROR");
    }
    const { deleteUserByEmail } = await import("@/repositories/user.repository");
    const existing = await findUserByEmail(email);
    await deleteUserByEmail(email);
    await recordAuditEvent({
      action: "user.delete",
      status: "success",
      actor,
      request,
      institutionId: existing?.primaryInstitutionId,
      targetType: "user",
      targetId: email,
      targetLabel: email,
      summary: "User access removed",
      metadata: {
        roles: existing?.roles || [],
        institutionIds: existing?.institutionIds || [],
      },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return jsonError((error as Error).message);
  }
}
