"use client";

import type { ReactNode } from "react";
import { Badge, Box, Group, Stack } from "@mantine/core";

export interface DataToolbarFilterChip {
  label: string;
  onRemove?: () => void;
  color?: string;
}

export interface DataToolbarProps {
  searchSlot?: ReactNode;
  filterSlot?: ReactNode;
  sortSlot?: ReactNode;
  resetAction?: ReactNode;
  createAction?: ReactNode;
  activeFilters?: DataToolbarFilterChip[];
  primary?: ReactNode;
  secondary?: ReactNode;
  filters?: ReactNode;
}

export function DataToolbar({
  searchSlot,
  filterSlot,
  sortSlot,
  resetAction,
  createAction,
  activeFilters = [],
  primary,
  secondary,
  filters,
}: DataToolbarProps) {
  const resolvedSearch = searchSlot ?? primary;
  const resolvedFilter = filterSlot ?? filters;
  const resolvedActions = createAction ?? secondary;

  return (
    <Stack gap="sm">
      <Group justify="space-between" align="flex-start" gap="sm">
        <Group flex={1} align="flex-start" gap="sm" wrap="wrap">
          {resolvedSearch ? <Box style={{ flex: 1, minWidth: 220 }}>{resolvedSearch}</Box> : null}
          {resolvedFilter}
          {sortSlot}
        </Group>
        <Group gap="sm" wrap="wrap">
          {resetAction}
          {resolvedActions}
        </Group>
      </Group>

      {activeFilters.length ? (
        <Group gap="xs" wrap="wrap">
          {activeFilters.map((filter) => (
            <Badge
              key={filter.label}
              color={filter.color}
              variant="light"
              rightSection={filter.onRemove ? "×" : undefined}
              style={filter.onRemove ? { cursor: "pointer" } : undefined}
              onClick={filter.onRemove}
            >
              {filter.label}
            </Badge>
          ))}
        </Group>
      ) : null}
    </Stack>
  );
}
