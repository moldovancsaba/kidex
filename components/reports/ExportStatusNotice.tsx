"use client";

import { Badge, Button, Stack, Text } from "@mantine/core";
import { SectionPanel } from "@doneisbetter/gds/client";
import type { ExportDeliveryStatus } from "@/lib/export-delivery";

interface ExportStatusNoticeProps {
  status: ExportDeliveryStatus;
  onRetry?: () => void;
  retryLabel?: string;
}

function badgeColorForState(state: ExportDeliveryStatus["state"]) {
  if (state === "blocked" || state === "failed_terminal") return "red";
  if (state === "failed_retryable") return "yellow";
  if (state === "success") return "teal";
  if (state === "queued" || state === "generating") return "blue";
  return "gray";
}

function statusLabelForState(state: ExportDeliveryStatus["state"]) {
  switch (state) {
    case "blocked":
      return "Blocked";
    case "queued":
      return "Queued";
    case "generating":
      return "Generating";
    case "success":
      return "Ready";
    case "failed_retryable":
      return "Retry available";
    case "failed_terminal":
      return "Unavailable";
    default:
      return "Idle";
  }
}

export function ExportStatusNotice({ status, onRetry, retryLabel = "Retry" }: ExportStatusNoticeProps) {
  if (status.state === "idle") return null;

  return (
    <SectionPanel
      title={status.title || "Export status"}
      action={<Badge color={badgeColorForState(status.state)} variant="light">{statusLabelForState(status.state)}</Badge>}
    >
      <Stack gap="sm">
        <Text size="sm">{status.description}</Text>
        {status.state === "failed_retryable" && onRetry ? (
          <Button variant="default" size="sm" onClick={onRetry}>
            {retryLabel}
          </Button>
        ) : null}
      </Stack>
    </SectionPanel>
  );
}
