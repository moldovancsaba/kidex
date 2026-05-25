"use client";

import type { ReactNode } from "react";
import { ActionIcon, Box, Group, Menu, Stack, Text, Title } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { IconDotsVertical } from "@tabler/icons-react";

export interface PageHeaderMenuAction {
  label: string;
  onClick?: () => void;
  href?: string;
  color?: string;
  leftSection?: ReactNode;
}

export interface PageHeaderProps {
  title: string;
  description?: string;
  subtitle?: ReactNode;
  eyebrow?: string;
  breadcrumbs?: ReactNode[];
  primaryAction?: ReactNode;
  secondaryActions?: ReactNode;
  overflowActions?: PageHeaderMenuAction[];
  status?: ReactNode;
  actions?: ReactNode;
}

export function PageHeader({
  title,
  description,
  subtitle,
  eyebrow,
  breadcrumbs,
  primaryAction,
  secondaryActions,
  overflowActions = [],
  status,
  actions,
}: PageHeaderProps) {
  const compact = useMediaQuery("(max-width: 62em)");
  const actionNode =
    actions ??
    ((primaryAction || secondaryActions || overflowActions.length > 0) ? (
      <Group gap="sm" wrap={compact ? "nowrap" : "wrap"} justify="flex-end" align="center">
        {primaryAction}
        {!compact ? secondaryActions : null}
        {overflowActions.length > 0 || (compact && secondaryActions) ? (
          <Menu shadow="md" width={240} position="bottom-end">
            <Menu.Target>
              <ActionIcon variant="default" size="lg" aria-label="More actions">
                <IconDotsVertical size={18} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              {overflowActions.map((action) =>
                action.href ? (
                  <Menu.Item key={action.label} component="a" href={action.href} color={action.color} leftSection={action.leftSection}>
                    {action.label}
                  </Menu.Item>
                ) : (
                  <Menu.Item key={action.label} onClick={action.onClick} color={action.color} leftSection={action.leftSection}>
                    {action.label}
                  </Menu.Item>
                ),
              )}
            </Menu.Dropdown>
          </Menu>
        ) : null}
      </Group>
    ) : null);

  return (
    <Stack gap="sm" mb="xl">
      {breadcrumbs?.length ? <Group gap="xs">{breadcrumbs}</Group> : null}
      <Group justify="space-between" align="flex-start" gap="md" wrap={compact ? "wrap" : "nowrap"}>
        <Box style={{ minWidth: 0, flex: 1 }}>
          {eyebrow ? (
            <Text c="dimmed" size="sm" fw={700} tt="uppercase" mb={4}>
              {eyebrow}
            </Text>
          ) : null}
          <Title order={1} size="h2" fw={800}>
            {title}
          </Title>
          {description ? (
            <Text c="dimmed" mt="xs" size="lg">
              {description}
            </Text>
          ) : null}
          {subtitle ? (typeof subtitle === "string" ? <Text c="dimmed" size="sm" mt={4}>{subtitle}</Text> : <Box mt={4}>{subtitle}</Box>) : null}
          {status ? <Box mt="xs">{status}</Box> : null}
        </Box>
        {actionNode}
      </Group>
    </Stack>
  );
}
