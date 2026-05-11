import type { PermissionAction } from "@/lib/permissions";

export interface DashboardRouteRule {
  prefix: string;
  requiredAction?: PermissionAction;
}

export const DASHBOARD_ROUTE_RULES: readonly DashboardRouteRule[] = [
  { prefix: "/dashboard/assessment", requiredAction: "assessments.write" },
  { prefix: "/dashboard/records", requiredAction: "assessments.read" },
  { prefix: "/dashboard/children", requiredAction: "children.read" },
  { prefix: "/dashboard/settings", requiredAction: "settings.read" },
  { prefix: "/dashboard" },
] as const;

export function requiredActionForDashboardPath(pathname: string): PermissionAction | null {
  const match = DASHBOARD_ROUTE_RULES.find((rule) => pathname === rule.prefix || pathname.startsWith(`${rule.prefix}/`));
  return match?.requiredAction || null;
}
