"use client";

import type { ReactNode } from "react";
import { AppShell as MantineAppShell, Group, Stack } from "@mantine/core";

export interface AppShellProps {
  header: ReactNode;
  navbar?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  navbarWidth?: number | string;
  headerHeight?: number | string;
  footerHeight?: number | string;
}

export function AppShell({
  header,
  navbar,
  footer,
  children,
  navbarWidth = 260,
  headerHeight = 64,
  footerHeight = 68,
}: AppShellProps) {
  return (
    <MantineAppShell
      header={{ height: headerHeight }}
      footer={footer ? { height: footerHeight } : undefined}
      navbar={navbar ? { width: navbarWidth, breakpoint: "md", collapsed: { mobile: true } } : undefined}
      padding={0}
    >
      <MantineAppShell.Header>{header}</MantineAppShell.Header>
      {navbar ? (
        <MantineAppShell.Navbar p={0}>
          <Stack gap={0} h="100%">
            {navbar}
          </Stack>
        </MantineAppShell.Navbar>
      ) : null}
      {footer ? (
        <MantineAppShell.Footer>
          <Group h="100%" px="md" justify="space-around" wrap="nowrap">
            {footer}
          </Group>
        </MantineAppShell.Footer>
      ) : null}
      <MantineAppShell.Main>{children}</MantineAppShell.Main>
    </MantineAppShell>
  );
}
