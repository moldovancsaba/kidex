"use client";

import type { ReactNode } from "react";
import React from "react";
import { SimpleGrid, Stack } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { StateBlock } from "@/components/gds-local/core";

export interface ResponsiveDataViewColumn<T extends Record<string, unknown>> {
  key: string;
  header: ReactNode;
  render: (item: T) => ReactNode;
}

export interface ResponsiveDataViewProps<T extends object> {
  data: T[];
  renderCard: (item: T, index: number) => ReactNode;
  renderDesktop?: (data: T[]) => ReactNode;
  loading?: boolean;
  error?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  toolbar?: ReactNode;
  getRowKey?: (item: T, index: number) => React.Key;
}

export function ResponsiveDataView<T extends object>({
  data,
  renderCard,
  renderDesktop,
  loading = false,
  error,
  emptyTitle = "No results yet",
  emptyDescription = "Try changing filters or create a new record.",
  toolbar,
  getRowKey,
}: ResponsiveDataViewProps<T>) {
  const isMobile = useMediaQuery("(max-width: 48em)");

  return (
    <Stack gap="md">
      {toolbar}
      {loading ? <StateBlock variant="loading" title="Loading" compact minHeight="12rem" /> : null}
      {!loading && error ? <StateBlock variant="error" title="Unable to load data" description={error} compact /> : null}
      {!loading && !error && data.length === 0 ? <StateBlock variant="empty" title={emptyTitle} description={emptyDescription} compact /> : null}

      {!loading && !error && data.length > 0 && isMobile ? (
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          {data.map((item, index) => (
            <React.Fragment key={getRowKey ? getRowKey(item, index) : index}>{renderCard(item, index)}</React.Fragment>
          ))}
        </SimpleGrid>
      ) : null}

      {!loading && !error && data.length > 0 && !isMobile
        ? renderDesktop ? (
            renderDesktop(data)
          ) : (
            <Stack gap="md">
              {data.map((item, index) => (
                <React.Fragment key={getRowKey ? getRowKey(item, index) : index}>{renderCard(item, index)}</React.Fragment>
              ))}
            </Stack>
          )
        : null}
    </Stack>
  );
}
