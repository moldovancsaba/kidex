import { getSession, type SessionPayload } from "@/lib/session";
import { jsonError } from "@/lib/api";
import { canPerformAction, type PermissionAction } from "@/lib/permissions";
import { parseRoleHeader } from "@/lib/roles";
import { DEFAULT_INSTITUTION_ID, ensureInstitutionIds } from "@/lib/institutions";
import { env } from "@/config/env";
import type { SupportedRuntimeRole } from "@/lib/roles";
import type { ChildProfile } from "@/repositories/child.repository";
import type { AssessmentRecord } from "@/types/assessment";

export interface AuthenticatedActor {
  userId?: string;
  email?: string;
  name?: string;
  roles: SupportedRuntimeRole[];
  institutionIds: string[];
  primaryInstitutionId: string;
}

function parseParticipantEmails(value: unknown): string[] {
  if (typeof value !== "string") return [];
  return Array.from(
    new Set(
      value
        .split(",")
        .map((entry) => entry.trim().toLowerCase())
        .filter(Boolean),
    ),
  );
}

function toActorFromSessionPayload(
  session: SessionPayload | null,
  persistedUser?: {
    id?: string;
    email: string;
    name?: string;
    roles?: SupportedRuntimeRole[];
    institutionIds?: string[];
    primaryInstitutionId?: string;
  } | null,
): AuthenticatedActor | null {
  if (!session && !persistedUser) return null;

  const roles = persistedUser?.roles?.length ? persistedUser.roles : parseRoleHeader(session?.role);
  const institutionMembership = ensureInstitutionIds(
    persistedUser?.institutionIds,
    persistedUser?.primaryInstitutionId,
  );

  return {
    userId: persistedUser?.id || session?.userId,
    email: (persistedUser?.email || session?.email || "").toLowerCase() || undefined,
    name: persistedUser?.name || session?.name,
    roles,
    institutionIds: institutionMembership.institutionIds,
    primaryInstitutionId: institutionMembership.primaryInstitutionId,
  };
}

export async function getAuthenticatedActor(request?: Request): Promise<AuthenticatedActor | null> {
  const session = await getSession();
  const sessionEmail = session?.email?.toLowerCase();

  if (sessionEmail) {
    const { findUserByEmail } = await import("@/repositories/user.repository");
    const user = await findUserByEmail(sessionEmail);
    return toActorFromSessionPayload(session, user ? {
      id: user.id,
      email: user.email,
      name: user.name,
      roles: user.roles,
      institutionIds: user.institutionIds,
      primaryInstitutionId: user.primaryInstitutionId,
    } : {
      email: sessionEmail,
    });
  }

  if (!request) return null;
  const headerRoles = parseRoleHeader(request.headers.get("x-kidex-role"));
  if (headerRoles.length === 0) return null;
  return {
    roles: headerRoles,
    institutionIds: [DEFAULT_INSTITUTION_ID],
    primaryInstitutionId: DEFAULT_INSTITUTION_ID,
  };
}

export async function requirePermission(request: Request, action: PermissionAction) {
  if (!env.kidexEnforceAuth) {
    return { actor: null, error: null as ReturnType<typeof jsonError> | null };
  }

  const actor = await getAuthenticatedActor(request);
  if (!actor || actor.roles.length === 0) {
    return { actor: null, error: jsonError("Authentication required", 401, "AUTH_REQUIRED") };
  }

  if (!canPerformAction(actor.roles, action)) {
    return { actor, error: jsonError("Insufficient permissions", 403, "FORBIDDEN") };
  }

  return { actor, error: null as ReturnType<typeof jsonError> | null };
}

function actorCanAccessInstitution(actor: AuthenticatedActor | null, institutionId?: string): boolean {
  if (!actor) return true;
  if (actor.roles.includes("admin")) return true;
  const scopedInstitutionId = institutionId || DEFAULT_INSTITUTION_ID;
  return actor.institutionIds.includes(scopedInstitutionId);
}

function actorCanAccessRestrictedEmails(actor: AuthenticatedActor | null, emails: readonly string[]): boolean {
  if (!actor) return true;
  if (actor.roles.includes("admin")) return true;
  if (!actor.email) return false;
  return emails.includes(actor.email.toLowerCase());
}

export function canReadChild(actor: AuthenticatedActor | null, child: ChildProfile): boolean {
  if (!actorCanAccessInstitution(actor, child.institutionId)) return false;
  if (child.visibility !== "restricted") return true;
  return actorCanAccessRestrictedEmails(actor, child.practitionerEmails || []);
}

export function canWriteChild(actor: AuthenticatedActor | null, child: ChildProfile): boolean {
  return canReadChild(actor, child);
}

function assessmentPractitionerEmails(assessment: {
  practitionerEmails?: string[];
  session: { conductor: string; observers: string };
}): string[] {
  const direct = Array.isArray(assessment.practitionerEmails) ? assessment.practitionerEmails : [];
  const conductor = parseParticipantEmails(assessment.session?.conductor);
  const observers = parseParticipantEmails(assessment.session?.observers);
  return Array.from(new Set([...direct, ...conductor, ...observers].map((email) => email.toLowerCase())));
}

export function canReadAssessment(actor: AuthenticatedActor | null, assessment: AssessmentRecord): boolean {
  if (!actorCanAccessInstitution(actor, assessment.institutionId)) return false;
  if (assessment.visibility !== "restricted") return true;
  return actorCanAccessRestrictedEmails(actor, assessmentPractitionerEmails(assessment));
}

export function canWriteAssessment(actor: AuthenticatedActor | null, assessment: AssessmentRecord): boolean {
  return canReadAssessment(actor, assessment);
}

export function applyActorOwnershipToChild<T extends {
  name: string;
  birthDate: string;
  institutionId?: string;
  createdByUserEmail?: string;
  practitionerEmails?: string[];
  visibility?: "institution" | "restricted";
}>(
  actor: AuthenticatedActor | null,
  child: T,
): T {
  const email = actor?.email?.toLowerCase();
  const practitioners = Array.from(new Set([...(child.practitionerEmails || []), ...(email ? [email] : [])]));
  return {
    ...child,
    institutionId: child.institutionId || actor?.primaryInstitutionId || DEFAULT_INSTITUTION_ID,
    createdByUserEmail: child.createdByUserEmail || email,
    practitionerEmails: practitioners,
    visibility: child.visibility || "institution",
  };
}

export function applyActorOwnershipToAssessment<T extends {
  institutionId?: string;
  createdByUserEmail?: string;
  practitionerEmails?: string[];
  visibility?: "institution" | "restricted";
  session: { conductor: string; observers: string };
}>(
  actor: AuthenticatedActor | null,
  assessment: T,
): T {
  const practitioners = assessmentPractitionerEmails(assessment).concat(
    actor?.email ? [actor.email.toLowerCase()] : [],
  );
  return {
    ...assessment,
    institutionId: assessment.institutionId || actor?.primaryInstitutionId || DEFAULT_INSTITUTION_ID,
    createdByUserEmail: assessment.createdByUserEmail || actor?.email?.toLowerCase(),
    practitionerEmails: Array.from(new Set(practitioners)),
    visibility: assessment.visibility || "institution",
  };
}
