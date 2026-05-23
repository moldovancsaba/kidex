"use client";

import { Box, Flex, Group, Text, Title } from "@mantine/core";
import type { ReactNode } from "react";

type PageHeaderProps = {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
};

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <Flex
      gap="sm"
      direction={{ base: "column", md: "row" }}
      justify="space-between"
      align={{ base: "stretch", md: "flex-start" }}
    >
      <Box style={{ minWidth: 0 }}>
        <Title order={1} size="h2" fw={800}>
          {title}
        </Title>
        {subtitle ? (
          <Text c="dimmed" size="sm">
            {subtitle}
          </Text>
        ) : null}
      </Box>
      {actions ? (
        <Group gap="sm" wrap="wrap" justify="flex-start" align="center">
          {actions}
        </Group>
      ) : null}
    </Flex>
  );
}
