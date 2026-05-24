"use client";

import { Alert, Stack, Text } from "@mantine/core";
import type { ReactNode } from "react";

type ErrorStateProps = {
  title?: string;
  message: ReactNode;
  action?: ReactNode;
};

export function ErrorState({ title, message, action }: ErrorStateProps) {
  return (
    <Alert color="red" variant="light" radius="md">
      <Stack gap="sm">
        {title ? (
          <Text fw={700} size="sm">
            {title}
          </Text>
        ) : null}
        <Text size="sm">{message}</Text>
        {action}
      </Stack>
    </Alert>
  );
}
