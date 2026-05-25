"use client";

import type { ReactNode } from "react";
import { Badge, Card, Group, Stack, Text, ThemeIcon, Title } from "@mantine/core";

export type MetricCardProps = {
  label: string;
  value: ReactNode;
  description?: ReactNode;
  trend?: {
    label: string;
    tone?: "positive" | "negative" | "neutral";
  };
  icon?: ReactNode;
  footer?: ReactNode;
  target?: number;
};

const trendColors: Record<NonNullable<NonNullable<MetricCardProps["trend"]>["tone"]>, string> = {
  positive: "teal",
  negative: "red",
  neutral: "gray",
};

export function MetricCard({ label, value, description, trend, icon, footer, target }: MetricCardProps) {
  const derivedDescription = description ?? (typeof target === "number" ? `Target ${target}` : undefined);

  return (
    <Card withBorder radius="lg" padding="lg" style={{ flex: "1 1 180px" }}>
      <Stack gap="md">
        <Group justify="space-between" align="flex-start" wrap="nowrap">
          <Stack gap={4}>
            <Text size="sm" c="dimmed" fw={600}>
              {label}
            </Text>
            <Title order={3}>{value}</Title>
          </Stack>
          {icon ? (
            <ThemeIcon variant="light" size="xl" radius="xl" aria-hidden>
              {icon}
            </ThemeIcon>
          ) : null}
        </Group>

        {(derivedDescription || trend) ? (
          <Group justify="space-between" align="center" gap="sm">
            {derivedDescription ? (
              <Text size="sm" c="dimmed" flex={1}>
                {derivedDescription}
              </Text>
            ) : (
              <span />
            )}
            {trend ? (
              <Badge color={trendColors[trend.tone ?? "neutral"]} variant="light">
                {trend.label}
              </Badge>
            ) : null}
          </Group>
        ) : null}

        {footer}
      </Stack>
    </Card>
  );
}
