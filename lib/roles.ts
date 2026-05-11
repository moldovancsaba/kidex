export const SUPPORTED_RUNTIME_ROLES = ["admin", "conductor", "observer"] as const;

export type SupportedRuntimeRole = (typeof SUPPORTED_RUNTIME_ROLES)[number];

export const RESERVED_FUTURE_ROLES = [
  "institution_admin",
  "reviewer",
  "guardian_viewer",
  "auditor",
] as const;

export type ReservedFutureRole = (typeof RESERVED_FUTURE_ROLES)[number];

export type KidexRole = SupportedRuntimeRole | ReservedFutureRole;

export type KidexRoleScope = "platform" | "institution" | "assessment" | "family" | "oversight";

export interface KidexRoleDefinition {
  role: KidexRole;
  label: string;
  scope: KidexRoleScope;
  status: "active" | "reserved";
  description: string;
}

export const KIDEX_ROLE_DEFINITIONS: readonly KidexRoleDefinition[] = [
  {
    role: "admin",
    label: "Platform Admin",
    scope: "platform",
    status: "active",
    description: "Global administrator with cross-system configuration and access oversight powers.",
  },
  {
    role: "conductor",
    label: "Conductor",
    scope: "assessment",
    status: "active",
    description: "Primary practitioner role for creating, updating, and reviewing child development records.",
  },
  {
    role: "observer",
    label: "Observer",
    scope: "assessment",
    status: "active",
    description: "Read-oriented practitioner role used for review, history lookup, and limited collaboration.",
  },
  {
    role: "institution_admin",
    label: "Institution Admin",
    scope: "institution",
    status: "reserved",
    description: "Future institution-scoped administrator for organization membership and local governance.",
  },
  {
    role: "reviewer",
    label: "Reviewer",
    scope: "assessment",
    status: "reserved",
    description: "Future specialist reviewer role for quality review without broad administrative access.",
  },
  {
    role: "guardian_viewer",
    label: "Guardian Viewer",
    scope: "family",
    status: "reserved",
    description: "Future family-facing read-limited role for guardian access to approved child information.",
  },
  {
    role: "auditor",
    label: "Auditor",
    scope: "oversight",
    status: "reserved",
    description: "Future oversight role for compliance review and audit log inspection.",
  },
] as const;

export const DEFAULT_BOOTSTRAP_ROLES: readonly SupportedRuntimeRole[] = ["admin", "conductor"];

export const ROLE_GROUPS = {
  allActive: SUPPORTED_RUNTIME_ROLES,
  read: ["admin", "conductor", "observer"] as const,
  write: ["admin", "conductor"] as const,
  adminOnly: ["admin"] as const,
} as const;

const activeRoleSet = new Set<string>(SUPPORTED_RUNTIME_ROLES);
const canonicalRoleSet = new Set<string>([
  ...SUPPORTED_RUNTIME_ROLES,
  ...RESERVED_FUTURE_ROLES,
]);

export function normalizeRole(value: unknown): KidexRole | null {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  return canonicalRoleSet.has(normalized) ? (normalized as KidexRole) : null;
}

export function isSupportedRuntimeRole(value: unknown): value is SupportedRuntimeRole {
  return typeof value === "string" && activeRoleSet.has(value.trim().toLowerCase());
}

export function sanitizeStoredRoles(values: unknown): SupportedRuntimeRole[] {
  if (!Array.isArray(values)) return [];
  const roles = values
    .map((value) => normalizeRole(value))
    .filter((role): role is SupportedRuntimeRole => role !== null && isSupportedRuntimeRole(role));
  return Array.from(new Set(roles));
}

export function parseRoleHeader(value: string | null | undefined): SupportedRuntimeRole[] {
  if (!value) return [];
  return sanitizeStoredRoles(value.split(","));
}
