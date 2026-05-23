"use client";

import { ActionIcon, AppShell, Box, Button, Divider, Drawer, Group, Loader, NavLink, Stack, Text } from "@mantine/core";
import { IconChecklist, IconLayoutDashboard, IconMenu2, IconSettings, IconUsersGroup } from "@tabler/icons-react";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { PageContainer } from "@/components/ui/PageContainer";
import { AppFooter } from "@/components/layout/AppFooter";
import { LocaleSwitcher } from "@/components/ui/LocaleSwitcher";
import { ThemeSwitcher } from "@/components/ui/ThemeSwitcher";
import { requiredActionForDashboardPath } from "@/lib/dashboard-access";
import { canPerformAction } from "@/lib/permissions";
import type { SupportedRuntimeRole } from "@/lib/roles";
import { KIDEX_COLORS, KIDEX_LAYOUT } from "@/theme/tokens";

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations("Dashboard");
  const tc = useTranslations("Common");
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const sideInset = 12;

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

  const roles = user?.roles || [];
  const requiredAction = requiredActionForDashboardPath(pathname);
  const routeAllowed = userLoaded ? !requiredAction || canPerformAction(roles, requiredAction) : false;

  useEffect(() => {
    if (!userLoaded || routeAllowed) return;
    router.replace("/dashboard");
  }, [routeAllowed, router, userLoaded]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const nav = useMemo(() => [
    { href: "/dashboard", label: t("overview"), icon: IconLayoutDashboard, mobilePrimary: true },
    ...(canPerformAction(roles, "children.read") ? [{ href: "/dashboard/children", label: t("children"), icon: IconUsersGroup, mobilePrimary: true }] : []),
    ...(canPerformAction(roles, "assessments.write") ? [{ href: "/dashboard/assessment", label: t("survey"), icon: IconChecklist, mobilePrimary: true }] : []),
    ...(canPerformAction(roles, "assessments.read") ? [{ href: "/dashboard/records", label: t("records"), icon: IconChecklist, mobilePrimary: true }] : []),
    ...(canPerformAction(roles, "settings.read") ? [{ href: "/dashboard/settings", label: t("settings"), icon: IconSettings, mobilePrimary: false }] : []),
  ], [roles, t]);

  const mobilePrimaryNav = nav.filter((item) => item.mobilePrimary).slice(0, 4);
  const secondaryNav = nav.filter((item) => !mobilePrimaryNav.some((primary) => primary.href === item.href));
  const activeNavLabel = nav.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))?.label ?? t("overview");

  const navContent = (
    <Stack h="100%" gap={0} bg={KIDEX_COLORS.brandNavy}>
      <Box p="md" style={{ display: "flex", justifyContent: "center" }}>
        <Box style={{ backgroundColor: KIDEX_COLORS.white, borderRadius: "var(--mantine-radius-md)", padding: 12 }}>
          <Image src="/logo.jpeg" alt="KIDEX" width={100} height={100} priority />
        </Box>
      </Box>
      
      {user && (
        <Stack gap={0} px={sideInset} pb="md" align="center">
          <Box 
            p="xs" 
            style={{ 
              width: "100%",
              backgroundColor: "rgba(255, 255, 255, 0.05)", 
              borderRadius: "var(--mantine-radius-md)",
              border: "1px solid rgba(255, 255, 255, 0.1)"
            }}
          >
            <Stack gap={0}>
              <Box style={{ color: KIDEX_COLORS.white, fontWeight: 700, fontSize: "0.9rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {user.name}
              </Box>
              <Box style={{ color: KIDEX_COLORS.navTextMuted, fontSize: "0.75rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {user.email}
              </Box>
              {user.primaryInstitutionId ? (
                <Box style={{ color: KIDEX_COLORS.navTextMuted, fontSize: "0.7rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {user.primaryInstitutionId}
                </Box>
              ) : null}
            </Stack>
          </Box>
        </Stack>
      )}

      <Group
        gap={8}
        p={8}
        justify="flex-start"
        style={{
          marginInline: sideInset,
          border: "1px solid var(--mantine-color-default-border)",
          borderRadius: "var(--mantine-radius-md)"
        }}
      >
        <LocaleSwitcher />
        <ThemeSwitcher />
      </Group>
      <Stack gap={6} px={sideInset} py="md" style={{ flex: 1 }}>
        {nav.map((item) => {
          const active =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <NavLink
              key={item.href}
              component={Link}
              href={item.href}
              label={item.label}
              active={active}
              leftSection={<Icon size={16} />}
              onClick={() => setMobileMenuOpen(false)}
              styles={{
                root: {
                  borderRadius: "var(--mantine-radius-md)",
                  paddingInlineStart: 16,
                  paddingInlineEnd: 16
                },
                body: { paddingInlineStart: 0 },
                label: {
                  color: KIDEX_COLORS.navTextMuted,
                  fontWeight: 500,
                  textAlign: "left"
                },
                section: {
                  color: KIDEX_COLORS.navTextMuted
                }
              }}
              c={KIDEX_COLORS.navTextMuted}
              bg={active ? KIDEX_COLORS.brandTeal : "transparent"}
            />
          );
        })}
      </Stack>
      <Divider color={KIDEX_COLORS.navBorderMuted} />
      <Box px={sideInset} py="md">
        <NavLink
          label={t("logout")}
          onClick={() => {
            // Use the GET route to trigger the full SSO logout redirect
            window.location.href = "/api/auth/logout";
          }}
          styles={{
            root: {
              borderRadius: "var(--mantine-radius-md)",
              paddingInlineStart: 16,
              paddingInlineEnd: 16
            },
            label: {
              color: KIDEX_COLORS.navTextMuted,
              fontWeight: 500,
              textAlign: "left"
            }
          }}
          c={KIDEX_COLORS.navTextMuted}
        />
      </Box>
      <Box h={16} />
    </Stack>
  );

  return (
    <>
      <Drawer
        opened={mobileOpen}
        onClose={() => setMobileOpen(false)}
        padding={0}
        withCloseButton={false}
        size={KIDEX_LAYOUT.drawerWidth}
        hiddenFrom="md"
        styles={{
          content: {
            backgroundColor: KIDEX_COLORS.brandNavy
          },
          body: {
            padding: 0
          }
        }}
      >
        {navContent}
      </Drawer>

      <AppShell
        header={{ height: 60 }}
        footer={{ height: mobilePrimaryNav.length > 0 ? 72 : 0 }}
        navbar={{ width: KIDEX_LAYOUT.drawerWidth, breakpoint: "md" }}
        padding={0}
        styles={{
          header: {
            borderBottom: "1px solid var(--mantine-color-default-border)",
            backgroundColor: "var(--mantine-color-body)"
          },
          footer: {
            borderTop: "1px solid var(--mantine-color-default-border)",
            backgroundColor: "var(--mantine-color-body)"
          },
          navbar: {
            borderInlineEnd: "none",
            backgroundColor: KIDEX_COLORS.brandNavy
          },
          main: {
            backgroundColor: "var(--mantine-color-body)"
          }
        }}
      >
        <AppShell.Header className="no-print">
          <Group h="100%" px="md" justify="space-between" wrap="nowrap">
            <Stack gap={0}>
              <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
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
                aria-label={t("settings")}
              >
                <IconMenu2 size={18} />
              </ActionIcon>
            </Group>
          </Group>
        </AppShell.Header>

        <AppShell.Navbar visibleFrom="md" p={0} className="no-print">
          {navContent}
        </AppShell.Navbar>

        {mobilePrimaryNav.length > 0 ? (
          <AppShell.Footer hiddenFrom="md" className="no-print">
            <Group grow gap={0} h="100%" wrap="nowrap">
              {mobilePrimaryNav.map((item) => {
                const active =
                  item.href === "/dashboard"
                    ? pathname === "/dashboard"
                    : pathname === item.href || pathname.startsWith(`${item.href}/`);
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
                    <Text size="xs" fw={active ? 700 : 500}>
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
              paddingBottom: mobilePrimaryNav.length > 0 ? 88 : 16
            }}
          >
            <Box style={{ flex: 1 }}>
              <PageContainer>
                {!userLoaded || !routeAllowed ? (
                  <Box style={{ minHeight: "50vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Loader aria-label={tc("loading")} />
                  </Box>
                ) : children}
              </PageContainer>
            </Box>
            <AppFooter />
          </Box>
        </AppShell.Main>
      </AppShell>
    </>
  );
}
