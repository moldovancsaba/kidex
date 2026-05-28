"use client";

import type { ReactNode } from "react";
import { GdsProvider } from "@doneisbetter/gds/client";
import type { MantineThemeOverride } from "@mantine/core";

export function Providers({
  children,
  locale,
  gdsMessages,
  theme,
  defaultColorScheme,
}: {
  children: ReactNode;
  locale: string;
  gdsMessages: Record<string, string>;
  theme: MantineThemeOverride;
  defaultColorScheme?: "light" | "dark";
}) {
  return (
    <GdsProvider
      locale={locale}
      messages={gdsMessages}
      theme={theme}
      defaultColorScheme={defaultColorScheme ?? "light"}
    >
      {children}
    </GdsProvider>
  );
}
