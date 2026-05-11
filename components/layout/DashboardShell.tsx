"use client";

import { AppShell, Box, Burger, Divider, Drawer, Group, Loader, NavLink, Stack } from "@mantine/core";
import Image from "next/image";
import { useEffect, useState } from "react";
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
  const [mobileOpen, setMobileOpen] = useState(false);
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

  const nav = [
    { href: "/dashboard", label: t("overview") },
    ...(canPerformAction(roles, "assessments.read") ? [{ href: "/dashboard/records", label: t("records") }] : []),
    ...(canPerformAction(roles, "assessments.write") ? [{ href: "/dashboard/assessment", label: t("survey") }] : []),
    ...(canPerformAction(roles, "children.read") ? [{ href: "/dashboard/children", label: t("children") }] : []),
    ...(canPerformAction(roles, "settings.read") ? [{ href: "/dashboard/settings", label: t("settings") }] : []),
  ];

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
          return (
            <NavLink
              key={item.href}
              component={Link}
              href={item.href}
              label={item.label}
              active={active}
              onClick={() => setMobileOpen(false)}
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
        navbar={{ width: KIDEX_LAYOUT.drawerWidth, breakpoint: "md" }}
        padding={0}
        styles={{
          navbar: {
            borderInlineEnd: "none",
            backgroundColor: KIDEX_COLORS.brandNavy
          },
          main: {
            backgroundColor: "var(--mantine-color-body)"
          }
        }}
      >
        <AppShell.Navbar visibleFrom="md" p={0}>
          {navContent}
        </AppShell.Navbar>

        <AppShell.Main>
          <Burger
            opened={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
            size="sm"
            hiddenFrom="md"
            style={{ position: "fixed", top: 10, left: 10, zIndex: 300 }}
            color={KIDEX_COLORS.navText}
            bg={KIDEX_COLORS.white}
          />
          <Box className="dashboard-main" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", paddingBottom: 16 }}>
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
