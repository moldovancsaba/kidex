"use client";

import {
  Box,
  Button,
  Group,
  NavLink,
  Stack,
  Text,
} from "@mantine/core";
import { AppShell } from "@doneisbetter/gds-admin/client";
import { IconChecklist, IconClockHour4, IconLayoutDashboard, IconSettings, IconUsersGroup } from "@tabler/icons-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { LoadingState, PageContainer } from "@/components/gds-local/core";
import { AppFooter } from "@/components/layout/AppFooter";
import { GlobalChildQuickSwitch } from "@/components/layout/GlobalChildQuickSwitch";
import { LocaleSwitcher } from "@/components/preferences/LocaleSwitcher";
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
      { href: "/dashboard", label: t("overview"), icon: IconLayoutDashboard, mobilePrimary: true },
      ...(canPerformAction(roles, "children.read")
        ? [{ href: "/dashboard/children", label: t("children"), icon: IconUsersGroup, mobilePrimary: true }]
        : []),
      ...(canPerformAction(roles, "children.read")
        ? [{ href: "/dashboard/follow-up", label: t("followUpCenter"), icon: IconClockHour4, mobilePrimary: false }]
        : []),
      ...(canPerformAction(roles, "assessments.write")
        ? [{ href: "/dashboard/assessment", label: t("survey"), icon: IconChecklist, mobilePrimary: true }]
        : []),
      ...(canPerformAction(roles, "assessments.read")
        ? [{ href: "/dashboard/records", label: t("records"), icon: IconChecklist, mobilePrimary: true }]
        : []),
      ...(canPerformAction(roles, "settings.read")
        ? [{ href: "/dashboard/settings", label: t("settings"), icon: IconSettings, mobilePrimary: false }]
        : []),
    ],
    [roles, t],
  );

  const mobilePrimaryNav = nav.filter((item) => item.mobilePrimary).slice(0, 4);
  const secondaryNav = nav.filter((item) => !mobilePrimaryNav.some((primary) => primary.href === item.href));
  const activeNavLabel = nav.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))?.label ?? t("overview");

  const renderNavLinks = (items: typeof nav) =>
    items.map((item) => {
      const active =
        item.href === "/dashboard" ? pathname === "/dashboard" : pathname === item.href || pathname.startsWith(`${item.href}/`);
      const Icon = item.icon;
      return (
        <NavLink
          key={item.href}
          component={Link}
          href={item.href}
          label={item.label}
          active={active}
          leftSection={<Icon size={16} />}
        />
      );
    });

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
      <Button
        variant="default"
        onClick={() => {
          window.location.href = "/api/auth/logout";
        }}
      >
        {t("logout")}
      </Button>
    </Stack>
  ) : null;

  return (
    <AppShell
      logoText="KIDEX"
      headerContext={activeNavLabel}
      headerActions={
        <Group gap="xs" wrap="nowrap">
          {canPerformAction(roles, "children.read") ? <GlobalChildQuickSwitch roles={roles} /> : null}
          <LocaleSwitcher />
        </Group>
      }
      primaryNavigation={<Stack gap="xs">{renderNavLinks(mobilePrimaryNav.length > 0 ? mobilePrimaryNav : nav)}</Stack>}
      secondaryNavigation={secondaryNav.length > 0 ? <Stack gap="xs">{renderNavLinks(secondaryNav)}</Stack> : undefined}
      accountPanel={userBlock}
      mobileNavigation={
        mobilePrimaryNav.length > 0 ? (
          <>
            {mobilePrimaryNav.map((item) => {
              const active =
                item.href === "/dashboard" ? pathname === "/dashboard" : pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;

              return (
                <Button
                  key={item.href}
                  component={Link}
                  href={item.href}
                  variant="subtle"
                  color={active ? "kidex" : "gray"}
                  radius={0}
                  h="100%"
                  fullWidth
                  style={{ flexDirection: "column", gap: 2 }}
                >
                  <Icon size={18} />
                  <Text size="sm" fw={active ? 700 : 500} lh={1.1}>
                    {item.label}
                  </Text>
                </Button>
              );
            })}
          </>
        ) : undefined
      }
    >
      <Box
        className="dashboard-main"
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          paddingBottom: mobilePrimaryNav.length > 0 ? 88 : 16,
        }}
      >
        <Box style={{ flex: 1 }}>
          <PageContainer>
            {!userLoaded || !routeAllowed ? <LoadingState label={tc("loading")} /> : children}
          </PageContainer>
        </Box>
        <AppFooter />
      </Box>
    </AppShell>
  );
}
