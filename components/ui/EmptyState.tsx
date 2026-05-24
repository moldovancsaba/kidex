"use client";

import { Alert, Stack, Text } from "@mantine/core";
import type { ReactNode } from "react";

type EmptyStateProps = {
  title?: string;
  message: ReactNode;
  action?: ReactNode;
};

export function EmptyState({ title, message, action }: EmptyStateProps) {
  return (
    <Alert color="gray" variant="light" radius="md">
      <Stack gap="sm">
        {title ? (
          <Text fw={700} size="sm">
            {title}
          </Text>
        ) : null}
        <Text size="sm" c="dimmed">
          {message}
        </Text>
        {action}
      </Stack>
    </Alert>
  );
}
