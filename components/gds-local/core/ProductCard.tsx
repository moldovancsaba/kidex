"use client";

import type { ReactNode } from "react";
import { ActionIcon, Badge, Card, Group, Menu, Stack, Text, ThemeIcon, Title } from "@mantine/core";
import { IconDotsVertical } from "@tabler/icons-react";

export interface ProductCardMetaItem {
  label: string;
  value: ReactNode;
}

export interface ProductCardAction {
  label: string;
  onClick?: () => void;
  href?: string;
  color?: string;
  leftSection?: ReactNode;
}

export interface ProductCardProps {
  title: string;
  description?: ReactNode;
  media?: ReactNode;
  icon?: ReactNode;
  status?: ReactNode;
  metadata?: ProductCardMetaItem[];
  primaryAction?: ReactNode;
  secondaryActions?: ProductCardAction[];
  footer?: ReactNode;
  onClick?: () => void;
}

export function ProductCard({
  title,
  description,
  media,
  icon,
  status,
  metadata = [],
  primaryAction,
  secondaryActions = [],
  footer,
  onClick,
}: ProductCardProps) {
  return (
    <Card withBorder radius="lg" padding="lg" onClick={onClick} style={onClick ? { cursor: "pointer" } : undefined}>
      <Stack gap="md">
        {media}

        <Group justify="space-between" align="flex-start" wrap="nowrap">
          <Group align="flex-start" gap="sm" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
            {icon ? (
              <ThemeIcon variant="light" size="xl" radius="xl" aria-hidden>
                {icon}
              </ThemeIcon>
            ) : null}
            <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
              <Title order={4}>{title}</Title>
              {description ? (
                <Text size="sm" c="dimmed" lineClamp={4}>
                  {description}
                </Text>
              ) : null}
            </Stack>
          </Group>

          <Group gap="xs" align="center" wrap="nowrap">
            {typeof status === "string" ? <Badge variant="light">{status}</Badge> : status}
            {secondaryActions.length ? (
              <Menu position="bottom-end" withinPortal>
                <Menu.Target>
                  <ActionIcon variant="subtle" aria-label="More actions" onClick={(event) => event.stopPropagation()}>
                    <IconDotsVertical size={16} />
                  </ActionIcon>
                </Menu.Target>
                <Menu.Dropdown onClick={(event) => event.stopPropagation()}>
                  {secondaryActions.map((action) =>
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
        </Group>

        {metadata.length ? (
          <Stack gap={6}>
            {metadata.map((item) => (
              <Group key={item.label} justify="space-between" gap="sm">
                <Text size="sm" c="dimmed">
                  {item.label}
                </Text>
                <Text size="sm" fw={500} ta="right">
                  {item.value}
                </Text>
              </Group>
            ))}
          </Stack>
        ) : null}

        {primaryAction ? <Group justify="space-between">{primaryAction}</Group> : null}
        {footer}
      </Stack>
    </Card>
  );
}
