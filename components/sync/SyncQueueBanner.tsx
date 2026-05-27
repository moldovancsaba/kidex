"use client";

import { Alert, Button, Group, Text } from "@mantine/core";
import { useEffect } from "react";
import { useSyncQueue } from "@/components/sync/useSyncQueue";

export function SyncQueueBanner() {
  const { queue, online, retry } = useSyncQueue();

  useEffect(() => {
    if (!online || queue.length === 0) return;

    void retry();
    const interval = window.setInterval(() => {
      void retry();
    }, 30_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void retry();
      }
    };
    window.addEventListener("focus", onVisible);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [online, queue.length, retry]);

  if (online && queue.length === 0) {
    return null;
  }

  const conflictCount = queue.filter((operation) => operation.state === "conflict").length;
  const retryableCount = queue.filter((operation) => operation.state === "failed_retryable").length;
  const pendingCount = queue.filter((operation) => operation.state === "pending_local" || operation.state === "retrying").length;
  const title = !online ? "Offline mode active" : conflictCount > 0 ? "Pending sync needs review" : "Pending local sync";
  const color = !online ? "yellow" : conflictCount > 0 ? "red" : retryableCount > 0 ? "orange" : "blue";

  return (
    <Alert color={color} title={title} variant="light" mb="md">
      <Group justify="space-between" align="center" wrap="wrap">
        <Text size="sm">
          {!online
            ? `Your work will stay local until the connection returns. ${queue.length} pending item${queue.length === 1 ? "" : "s"} currently need sync.`
            : `${pendingCount} pending, ${retryableCount} retryable, ${conflictCount} conflict item${queue.length === 1 ? "" : "s"} in the local sync queue.`}
        </Text>
        {online ? (
          <Button size="sm" variant="light" color={color} onClick={() => void retry()}>
            Retry pending sync
          </Button>
        ) : null}
      </Group>
    </Alert>
  );
}
