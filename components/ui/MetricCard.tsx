"use client";

import { Paper, Text } from "@mantine/core";

type MetricCardProps = {
  label: string;
  value: string;
};

export function MetricCard({ label, value }: MetricCardProps) {
  return (
    <Paper withBorder p="md" style={{ flex: "1 1 180px" }}>
      <Text size="sm" c="dimmed">
        {label}
      </Text>
      <Text size="xl" fw={800}>
        {value}
      </Text>
    </Paper>
  );
}
