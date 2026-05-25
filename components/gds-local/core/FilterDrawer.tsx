"use client";

import type { ReactNode } from "react";
import { Drawer, Group, Stack } from "@mantine/core";

export interface FilterDrawerProps {
  opened: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  primaryAction?: ReactNode;
  secondaryAction?: ReactNode;
  position?: "left" | "right" | "top" | "bottom";
  size?: string | number;
}

export function FilterDrawer({
  opened,
  onClose,
  title,
  children,
  primaryAction,
  secondaryAction,
  position = "right",
  size = "md",
}: FilterDrawerProps) {
  return (
    <Drawer opened={opened} onClose={onClose} title={title} position={position} size={size}>
      <Stack gap="md">
        {children}
        {primaryAction || secondaryAction ? (
          <Group justify="space-between" mt="md">
            {secondaryAction ?? <span />}
            {primaryAction}
          </Group>
        ) : null}
      </Stack>
    </Drawer>
  );
}
