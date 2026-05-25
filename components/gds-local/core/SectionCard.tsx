"use client";

import type { CSSProperties, ReactNode } from "react";
import { Box, Group, Paper, Stack, Text } from "@mantine/core";

export interface SectionCardProps {
  title?: string;
  subheader?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  sx?: Record<string, unknown>;
  contentSx?: Record<string, unknown>;
}

function toStyleObject(input?: Record<string, unknown>, withDefaultMargin = false): CSSProperties {
  if (!input) {
    return withDefaultMargin ? { marginBottom: "1rem" } : {};
  }

  const { mb, ...rest } = input;
  const style = rest as CSSProperties;
  if (typeof mb === "number") {
    style.marginBottom = `${mb * 0.25}rem`;
  } else if (typeof mb === "string") {
    style.marginBottom = mb;
  } else if (withDefaultMargin) {
    style.marginBottom = "1rem";
  }
  return style;
}

export function SectionCard({ title, subheader, action, children, className, sx, contentSx }: SectionCardProps) {
  return (
    <Paper withBorder radius="lg" className={className} style={toStyleObject(sx, true)}>
      {title || action ? (
        <Group justify="space-between" align="flex-start" px="md" pt="md" pb={0}>
          <Stack gap={2}>
            {title ? <Text fw={700}>{title}</Text> : null}
            {subheader ? (
              typeof subheader === "string" ? (
                <Text size="sm" c="dimmed">
                  {subheader}
                </Text>
              ) : (
                <Box>{subheader}</Box>
              )
            ) : null}
          </Stack>
          {action ? <Box>{action}</Box> : null}
        </Group>
      ) : null}
      <Box p="md" style={toStyleObject(contentSx)}>
        {children}
      </Box>
    </Paper>
  );
}
