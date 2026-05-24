"use client";

import { Box, Group, Stack } from "@mantine/core";
import type { ReactNode } from "react";

type DataToolbarProps = {
  primary: ReactNode;
  secondary?: ReactNode;
  filters?: ReactNode;
};

export function DataToolbar({ primary, secondary, filters }: DataToolbarProps) {
  return (
    <Stack gap="md">
      <Group align="end" gap="xs" wrap="wrap">
        <Box style={{ flex: 1, minWidth: 220 }}>{primary}</Box>
        {secondary}
      </Group>
      {filters}
    </Stack>
  );
}
