import type { SupportedRuntimeRole } from "@/lib/roles";

export type PermissionAction =
  | "users.read"
  | "users.write"
  | "users.delete"
  | "settings.read"
  | "settings.write"
  | "invites.send"
  | "children.read"
  | "children.write"
  | "children.restore"
  | "children.delete"
  | "assessments.read"
  | "assessments.write"
  | "assessments.restore"
  | "assessments.delete"
  | "uploads.write";

export const PERMISSION_MATRIX: Record<PermissionAction, readonly SupportedRuntimeRole[]> = {
  "users.read": ["admin", "conductor", "observer"],
  "users.write": ["admin", "conductor"],
  "users.delete": ["admin"],
  "settings.read": ["admin", "conductor", "observer"],
  "settings.write": ["admin"],
  "invites.send": ["admin"],
  "children.read": ["admin", "conductor", "observer"],
  "children.write": ["admin", "conductor"],
  "children.restore": ["admin", "conductor"],
  "children.delete": ["admin", "conductor"],
  "assessments.read": ["admin", "conductor", "observer"],
  "assessments.write": ["admin", "conductor"],
  "assessments.restore": ["admin", "conductor"],
  "assessments.delete": ["admin", "conductor"],
  "uploads.write": ["admin", "conductor"],
};

export function canPerformAction(
  roles: readonly SupportedRuntimeRole[],
  action: PermissionAction,
): boolean {
  const allowedRoles = PERMISSION_MATRIX[action];
  return allowedRoles.some((role) => roles.includes(role));
}
