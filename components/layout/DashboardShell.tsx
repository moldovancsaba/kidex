"use client";

import {
  Box,
  Group,
  Stack,
  Text,
} from "@mantine/core";
import {
  DiscoveryShell,
  SemanticButton,
  SidebarNav,
  SidebarNavItem,
  SidebarNavSection,
  StateBlock,
  type SemanticActionId,
} from "@doneisbetter/gds/client";
import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { AppFooter } from "@/components/layout/AppFooter";
import { GlobalChildQuickSwitch } from "@/components/layout/GlobalChildQuickSwitch";
import { LocaleSwitcher } from "@/components/ui/LocaleSwitcher";
import { SyncQueueBanner } from "@/components/sync/SyncQueueBanner";
import { requiredActionForDashboardPath } from "@/lib/dashboard-access";
import { canPerformAction } from "@/lib/permissions";
import type { SupportedRuntimeRole } from "@/lib/roles";

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations("Dashboard");
  const tc = useTranslations("Common");
  const pathname = usePathname();
  const router = useRouter();

  const [user, setUser] = useState<{ name: string; email: string; roles?: SupportedRuntimeRole[]; primaryInstitutionId?: string } | null>(null);
  const [userLoaded, setUserLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setUser(data.user);
        }
      })
      .catch(() => {})
      .finally(() => setUserLoaded(true));
  }, []);

  const roles = useMemo(() => user?.roles ?? [], [user?.roles]);
  const requiredAction = requiredActionForDashboardPath(pathname);
  const routeAllowed = userLoaded ? !requiredAction || canPerformAction(roles, requiredAction) : false;

  useEffect(() => {
    if (!userLoaded || routeAllowed) return;
    router.replace("/dashboard");
  }, [routeAllowed, router, userLoaded]);

  const nav = useMemo(
    () => [
      { href: "/dashboard", label: t("overview"), action: "dashboard" as SemanticActionId, priority: "primary" as const },
      ...(canPerformAction(roles, "children.read")
        ? [{ href: "/dashboard/children", label: t("children"), action: "child" as SemanticActionId, priority: "primary" as const }]
        : []),
      ...(canPerformAction(roles, "children.read")
        ? [{ href: "/dashboard/follow-up", label: t("followUpCenter"), action: "history" as SemanticActionId, priority: "primary" as const }]
        : []),
      ...(canPerformAction(roles, "assessments.write")
        ? [{ href: "/dashboard/assessment", label: t("survey"), action: "record" as SemanticActionId, priority: "primary" as const }]
        : []),
      ...(canPerformAction(roles, "assessments.read")
        ? [{ href: "/dashboard/records", label: t("records"), action: "analytics" as SemanticActionId, priority: "primary" as const }]
        : []),
      ...(canPerformAction(roles, "settings.read")
        ? [{ href: "/dashboard/settings", label: t("settings"), action: "settings" as SemanticActionId, priority: "secondary" as const }]
        : []),
    ],
    [roles, t],
  );

  const primaryNav = nav.filter((item) => item.priority === "primary");
  const secondaryNav = nav.filter((item) => item.priority === "secondary");
  const activeNavLabel = nav.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))?.label ?? t("overview");

  const userBlock = user ? (
    <Stack gap="xs">
      <Box>
        <Text fw={700} size="sm" truncate>
          {user.name}
        </Text>
        <Text c="dimmed" size="sm" truncate>
          {user.email}
        </Text>
        {user.primaryInstitutionId ? (
          <Text c="dimmed" size="sm" truncate>
            {user.primaryInstitutionId}
          </Text>
        ) : null}
      </Box>
      <SemanticButton
        action="logout"
        variant="default"
        onClick={() => {
          window.location.href = "/api/auth/logout";
        }}
      >
        {t("logout")}
      </SemanticButton>
    </Stack>
  ) : null;

  const sidebar = (
    <Stack h="100%" gap="lg">
      <Box px="sm" py="xs">
        <Group gap="sm" wrap="nowrap" align="center">
          <Group gap="sm" wrap="nowrap" align="center">
            <Image
              src="/logo.png"
              alt="KIDEX logo"
              width={34}
              height={34}
              style={{ display: "block", borderRadius: "var(--mantine-radius-md)" }}
            />
            <Text fw={700} size="lg" lh={1.1}>
              KIDEX
            </Text>
          </Group>
          <Text c="dimmed" size="xs" fw={600}>
            {t("workspaceDescription")}
          </Text>
        </Group>
      </Box>

      <SidebarNav ariaLabel={t("primaryNavigation")}>
        <SidebarNavSection label={t("primaryNavigation")}>
          {primaryNav.map((item) => {
            const active =
              item.href === "/dashboard" ? pathname === "/dashboard" : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <SidebarNavItem
                key={item.href}
                component={Link}
                href={item.href}
                action={item.action}
                label={item.label}
                active={active}
                aria-current={active ? "page" : undefined}
              />
            );
          })}
        </SidebarNavSection>

        {secondaryNav.length > 0 ? (
          <SidebarNavSection label={t("secondaryNavigation")} pushToBottom>
            {secondaryNav.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <SidebarNavItem
                  key={item.href}
                  component={Link}
                  href={item.href}
                  action={item.action}
                  label={item.label}
                  active={active}
                  aria-current={active ? "page" : undefined}
                />
              );
            })}
          </SidebarNavSection>
        ) : null}
      </SidebarNav>
    </Stack>
  );

  const header = (
    <Group justify="space-between" wrap="nowrap" align="center">
      <Text fw={700} size="lg" truncate>
        {activeNavLabel}
      </Text>
      <Group gap="xs" wrap="nowrap">
        {canPerformAction(roles, "children.read") ? <GlobalChildQuickSwitch roles={roles} /> : null}
        <LocaleSwitcher />
      </Group>
    </Group>
  );

  return (
    <DiscoveryShell
      header={header}
      sidebar={sidebar}
      footer={userBlock}
      mobileNavigationLabel={t("primaryNavigation")}
      sidebarWidth={320}
      stickySidebar
    >
      <Box
        className="dashboard-main"
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Box style={{ flex: 1 }}>
          <Box
            style={{
              width: "100%",
              maxWidth: 1600,
              marginInline: "auto",
            }}
            px={{ base: "md", md: "lg" }}
          >
            <SyncQueueBanner />
            {!userLoaded || !routeAllowed ? <StateBlock variant="loading" title={tc("loading")} compact /> : children}
          </Box>
        </Box>
        <AppFooter />
      </Box>
    </DiscoveryShell>
  );
}
