"use client";

import type { ReactNode } from "react";
import { Alert, Box, Loader, Stack, Text, ThemeIcon, Title } from "@mantine/core";
import {
  IconAlertTriangle,
  IconInfoCircle,
  IconInbox,
  IconLock,
  IconCircleCheck,
  IconToggleLeft,
} from "@tabler/icons-react";

export type StateBlockVariant =
  | "loading"
  | "empty"
  | "error"
  | "permission"
  | "disabled"
  | "success"
  | "info"
  | "not-enough-data";

export type StateBlockProps = {
  variant: StateBlockVariant;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
  compact?: boolean;
  minHeight?: number | string;
};

const variantConfig: Record<StateBlockVariant, { color: string; icon: ReactNode }> = {
  loading: { color: "violet", icon: <Loader size="sm" /> },
  empty: { color: "gray", icon: <IconInbox size={18} /> },
  error: { color: "red", icon: <IconAlertTriangle size={18} /> },
  permission: { color: "orange", icon: <IconLock size={18} /> },
  disabled: { color: "gray", icon: <IconToggleLeft size={18} /> },
  success: { color: "teal", icon: <IconCircleCheck size={18} /> },
  info: { color: "blue", icon: <IconInfoCircle size={18} /> },
  "not-enough-data": { color: "yellow", icon: <IconInfoCircle size={18} /> },
};

export function StateBlock({
  variant,
  title,
  description,
  action,
  icon,
  compact = false,
  minHeight,
}: StateBlockProps) {
  const config = variantConfig[variant];
  const content = (
    <Stack
      align={compact ? "flex-start" : "center"}
      justify="center"
      gap="md"
      py={compact ? "md" : "xl"}
      ta={compact ? "left" : "center"}
    >
      <ThemeIcon variant="light" color={config.color} size={compact ? "lg" : "xl"} radius="xl">
        {icon ?? config.icon}
      </ThemeIcon>
      <Stack gap={6} align={compact ? "flex-start" : "center"}>
        <Title order={compact ? 4 : 3}>{title}</Title>
        {description ? (
          <Text c="dimmed" maw={compact ? undefined : 480}>
            {description}
          </Text>
        ) : null}
      </Stack>
      {action}
    </Stack>
  );

  if (variant === "loading" && minHeight) {
    return (
      <Box style={{ minHeight, display: "flex", alignItems: "center", justifyContent: "center" }} role="status">
        {content}
      </Box>
    );
  }

  if (variant === "error" || variant === "permission" || variant === "disabled") {
    return (
      <Alert color={config.color} variant="light" radius="md">
        {content}
      </Alert>
    );
  }

  return content;
}
