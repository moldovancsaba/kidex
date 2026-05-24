"use client";

import {
  ActionIcon,
  alpha,
  AppShell,
  Box,
  Button,
  Divider,
  Drawer,
  Group,
  NavLink,
  Stack,
  Text,
  useMantineTheme,
} from "@mantine/core";
import { IconChecklist, IconLayoutDashboard, IconMenu2, IconSettings, IconUsersGroup } from "@tabler/icons-react";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { PageContainer } from "@/components/ui/PageContainer";
import { LoadingState } from "@/components/ui/LoadingState";
import { AppFooter } from "@/components/layout/AppFooter";
import { LocaleSwitcher } from "@/components/ui/LocaleSwitcher";
import { ThemeSwitcher } from "@/components/ui/ThemeSwitcher";
import { requiredActionForDashboardPath } from "@/lib/dashboard-access";
import { canPerformAction } from "@/lib/permissions";
import type { SupportedRuntimeRole } from "@/lib/roles";
import { KIDEX_SHELL_LAYOUT } from "@/theme/layout";

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations("Dashboard");
  const tc = useTranslations("Common");
  const theme = useMantineTheme();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const sideInset = 12;

  const shellBg = theme.black;
  const shellMuted = alpha(theme.white, 0.88);
  const shellBorder = alpha(theme.white, 0.32);
  const shellSurface = alpha(theme.white, 0.05);
  const shellSurfaceBorder = alpha(theme.white, 0.1);
  const activeNavBg = theme.colors.kidex[5];

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

  const renderNavLinks = (items: typeof nav, onNavigate?: () => void) =>
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
          onClick={onNavigate}
          styles={{
            root: {
              borderRadius: "var(--mantine-radius-md)",
              paddingInlineStart: 16,
              paddingInlineEnd: 16,
              backgroundColor: active ? activeNavBg : "transparent",
            },
            body: { paddingInlineStart: 0 },
            label: { color: shellMuted, fontWeight: 500, textAlign: "start" },
            section: { color: shellMuted },
          }}
        />
      );
    });

  const userBlock = user ? (
    <Stack gap={0} px={sideInset} pb="md" align="center">
      <Box
        p="xs"
        w="100%"
        style={{
          backgroundColor: shellSurface,
          borderRadius: "var(--mantine-radius-md)",
          border: `1px solid ${shellSurfaceBorder}`,
        }}
      >
        <Stack gap={0}>
          <Text c={shellMuted} fw={700} size="sm" truncate>
            {user.name}
          </Text>
          <Text c={shellMuted} size="sm" truncate>
            {user.email}
          </Text>
          {user.primaryInstitutionId ? (
            <Text c={shellMuted} size="sm" truncate>
              {user.primaryInstitutionId}
            </Text>
          ) : null}
        </Stack>
      </Box>
    </Stack>
  ) : null;

  const desktopNavContent = (
    <Stack h="100%" gap={0} bg={shellBg}>
      <Box p="md" style={{ display: "flex", justifyContent: "center" }}>
        <Box bg="white" style={{ borderRadius: "var(--mantine-radius-md)", padding: 12 }}>
          <Image src="/logo.jpeg" alt="KIDEX" width={100} height={100} priority />
        </Box>
      </Box>
      {userBlock}
      <Group
        gap={8}
        p={8}
        justify="flex-start"
        style={{
          marginInline: sideInset,
          border: "1px solid var(--mantine-color-default-border)",
          borderRadius: "var(--mantine-radius-md)",
        }}
      >
        <LocaleSwitcher />
        <ThemeSwitcher />
      </Group>
      <Stack gap={6} px={sideInset} py="md" style={{ flex: 1 }}>
        {renderNavLinks(nav, () => setMobileMenuOpen(false))}
      </Stack>
      <Divider color={shellBorder} />
      <Box px={sideInset} py="md">
        <NavLink
          label={t("logout")}
          onClick={() => {
            window.location.href = "/api/auth/logout";
          }}
          styles={{
            root: {
              borderRadius: "var(--mantine-radius-md)",
              paddingInlineStart: 16,
              paddingInlineEnd: 16,
            },
            label: { color: shellMuted, fontWeight: 500, textAlign: "start" },
          }}
        />
      </Box>
      <Box h={16} />
    </Stack>
  );

  const mobileSecondaryDrawer = (
    <Stack h="100%" gap={0} bg={shellBg}>
      {userBlock}
      <Stack gap={6} px={sideInset} py="md" style={{ flex: 1 }}>
        {secondaryNav.length > 0 ? renderNavLinks(secondaryNav, () => setMobileMenuOpen(false)) : null}
      </Stack>
      <Divider color={shellBorder} />
      <Box px={sideInset} py="md">
        <NavLink
          label={t("logout")}
          onClick={() => {
            window.location.href = "/api/auth/logout";
          }}
          styles={{
            root: {
              borderRadius: "var(--mantine-radius-md)",
              paddingInlineStart: 16,
              paddingInlineEnd: 16,
            },
            label: { color: shellMuted, fontWeight: 500, textAlign: "start" },
          }}
        />
      </Box>
    </Stack>
  );

  return (
    <>
      <Drawer
        opened={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        padding={0}
        withCloseButton={false}
        size={KIDEX_SHELL_LAYOUT.navbarWidth}
        hiddenFrom="md"
        styles={{
          content: { backgroundColor: shellBg },
          body: { padding: 0 },
        }}
      >
        {mobileSecondaryDrawer}
      </Drawer>

      <AppShell
        header={{ height: 60 }}
        footer={{ height: mobilePrimaryNav.length > 0 ? 72 : 0 }}
        navbar={{ width: KIDEX_SHELL_LAYOUT.navbarWidth, breakpoint: "md" }}
        padding={0}
        styles={{
          header: {
            borderBottom: "1px solid var(--mantine-color-default-border)",
            backgroundColor: "var(--mantine-color-body)",
          },
          footer: {
            borderTop: "1px solid var(--mantine-color-default-border)",
            backgroundColor: "var(--mantine-color-body)",
          },
          navbar: {
            borderInlineEnd: "none",
            backgroundColor: shellBg,
          },
          main: {
            backgroundColor: "var(--mantine-color-body)",
          },
        }}
      >
        <AppShell.Header className="no-print">
          <Group h="100%" px="md" justify="space-between" wrap="nowrap">
            <Stack gap={0}>
              <Text size="sm" c="dimmed" tt="uppercase" fw={700} hiddenFrom="sm">
                KIDEX
              </Text>
              <Text fw={700} size="sm">
                {activeNavLabel}
              </Text>
            </Stack>

            <Group gap="xs" wrap="nowrap">
              <Group hiddenFrom="md" gap={6}>
                <LocaleSwitcher />
                <ThemeSwitcher />
              </Group>
              <ActionIcon
                variant="light"
                color="gray"
                size="lg"
                hiddenFrom="md"
                onClick={() => setMobileMenuOpen((open) => !open)}
                aria-label={tc("actions")}
              >
                <IconMenu2 size={18} />
              </ActionIcon>
            </Group>
          </Group>
        </AppShell.Header>

        <AppShell.Navbar visibleFrom="md" p={0} className="no-print">
          {desktopNavContent}
        </AppShell.Navbar>

        {mobilePrimaryNav.length > 0 ? (
          <AppShell.Footer hiddenFrom="md" className="no-print">
            <Group grow gap={0} h="100%" wrap="nowrap">
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
            </Group>
          </AppShell.Footer>
        ) : null}

        <AppShell.Main>
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
        </AppShell.Main>
      </AppShell>
    </>
  );
}
