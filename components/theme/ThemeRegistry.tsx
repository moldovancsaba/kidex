"use client";

import { MantineProvider } from "@mantine/core";
import { ModalsProvider } from "@mantine/modals";
import { Notifications } from "@mantine/notifications";
import { useMemo } from "react";
import { useLocale } from "next-intl";
import { getKidexMantineTheme } from "@/theme/mantine-theme";
import { ThemeModeProvider, useThemeMode } from "./ThemeModeContext";

function ThemedTree({ children }: { children: React.ReactNode }) {
  const { mode } = useThemeMode();
  const locale = useLocale();
  const direction: "ltr" | "rtl" = locale === "ar" ? "rtl" : "ltr";
  const mantineTheme = useMemo(() => getKidexMantineTheme(mode, direction), [mode, direction]);

  return (
    <MantineProvider theme={mantineTheme} forceColorScheme={mode}>
      <ModalsProvider>
        <Notifications position="top-right" />
        {children}
      </ModalsProvider>
    </MantineProvider>
  );
}

export function ThemeRegistry({
  children,
  initialMode
}: {
  children: React.ReactNode;
  initialMode?: "light" | "dark";
}) {
  return (
    <ThemeModeProvider initialMode={initialMode}>
      <ThemedTree>{children}</ThemedTree>
    </ThemeModeProvider>
  );
}
