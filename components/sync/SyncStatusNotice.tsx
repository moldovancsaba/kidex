"use client";

import { Alert, Button, Group, Text } from "@mantine/core";
import type { SyncQueueOperation } from "@/lib/offline-sync";

const STATE_COPY: Record<SyncQueueOperation["state"], { color: string; title: string }> = {
  synced: { color: "teal", title: "Synced" },
  pending_local: { color: "yellow", title: "Saved locally" },
  retrying: { color: "blue", title: "Retrying sync" },
  failed_retryable: { color: "orange", title: "Sync needs attention" },
  conflict: { color: "red", title: "Sync conflict" },
};

export function SyncStatusNotice({
  operation,
  onRetry,
  onDiscard,
}: {
  operation: SyncQueueOperation;
  onRetry?: () => void;
  onDiscard?: () => void;
}) {
  const copy = STATE_COPY[operation.state];
  return (
    <Alert color={copy.color} title={copy.title} variant="light">
      <Text size="sm">
        {operation.summary}
        {operation.lastError ? ` ${operation.lastError}` : ""}
      </Text>
      <Text size="sm" c="dimmed" mt="sm">
        Attempt {Math.max(1, operation.attemptCount)} of {operation.maxAttempts}
      </Text>
      {onRetry || onDiscard ? (
        <Group gap="xs" mt="sm">
          {onRetry ? (
            <Button size="sm" variant="light" color={copy.color} onClick={onRetry}>
              Retry
            </Button>
          ) : null}
          {onDiscard ? (
            <Button size="sm" variant="default" onClick={onDiscard}>
              Discard local pending copy
            </Button>
          ) : null}
        </Group>
      ) : null}
    </Alert>
  );
}
