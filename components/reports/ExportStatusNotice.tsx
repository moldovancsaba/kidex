"use client";

import { Alert, Button, Group, Text } from "@mantine/core";
import type { ExportDeliveryStatus } from "@/lib/export-delivery";

interface ExportStatusNoticeProps {
  status: ExportDeliveryStatus;
  onRetry?: () => void;
  retryLabel?: string;
}

function colorForState(state: ExportDeliveryStatus["state"]) {
  if (state === "blocked" || state === "failed_terminal") return "red";
  if (state === "failed_retryable") return "yellow";
  if (state === "success") return "teal";
  if (state === "queued" || state === "generating") return "blue";
  return "gray";
}

export function ExportStatusNotice({ status, onRetry, retryLabel = "Retry" }: ExportStatusNoticeProps) {
  if (status.state === "idle") return null;

  return (
    <Alert color={colorForState(status.state)} title={status.title}>
      <Group justify="space-between" align="flex-start" wrap="wrap">
        <Text size="sm">{status.description}</Text>
        {status.state === "failed_retryable" && onRetry ? (
          <Button variant="default" size="sm" onClick={onRetry}>
            {retryLabel}
          </Button>
        ) : null}
      </Group>
    </Alert>
  );
}
