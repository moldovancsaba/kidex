"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  flushSyncQueue,
  readSyncQueueFromStorage,
  removeSyncQueueOperationById,
  SYNC_QUEUE_CHANGE_EVENT,
  SYNC_QUEUE_FLUSH_EVENT,
  writeSyncQueueToStorage,
  type SyncQueueFlushResult,
  type SyncQueueOperation,
} from "@/lib/offline-sync";

export function useSyncQueue() {
  const [queue, setQueue] = useState<SyncQueueOperation[]>(() => readSyncQueueFromStorage());
  const [online, setOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));
  const [lastResults, setLastResults] = useState<SyncQueueFlushResult[]>([]);

  useEffect(() => {
    const syncFromStorage = () => {
      setQueue(readSyncQueueFromStorage());
      setOnline(typeof navigator === "undefined" ? true : navigator.onLine);
    };

    const onQueueChange = () => syncFromStorage();
    const onStorage = (event: StorageEvent) => {
      if (!event.key || event.key === "kidex-sync-queue") {
        syncFromStorage();
      }
    };
    const onFlush = (event: Event) => {
      const custom = event as CustomEvent<{ results?: SyncQueueFlushResult[] }>;
      setLastResults(Array.isArray(custom.detail?.results) ? custom.detail.results : []);
      syncFromStorage();
    };

    window.addEventListener(SYNC_QUEUE_CHANGE_EVENT, onQueueChange);
    window.addEventListener(SYNC_QUEUE_FLUSH_EVENT, onFlush as EventListener);
    window.addEventListener("storage", onStorage);
    window.addEventListener("online", syncFromStorage);
    window.addEventListener("offline", syncFromStorage);

    return () => {
      window.removeEventListener(SYNC_QUEUE_CHANGE_EVENT, onQueueChange);
      window.removeEventListener(SYNC_QUEUE_FLUSH_EVENT, onFlush as EventListener);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("online", syncFromStorage);
      window.removeEventListener("offline", syncFromStorage);
    };
  }, []);

  const retry = useCallback(async (filter?: (operation: SyncQueueOperation) => boolean) => {
    const result = await flushSyncQueue({ manual: true, filter });
    setQueue(result.queue);
    setLastResults(result.results);
    return result;
  }, []);

  const discard = useCallback((operationId: string) => {
    const next = removeSyncQueueOperationById(readSyncQueueFromStorage(), operationId);
    writeSyncQueueToStorage(next);
    setQueue(next);
  }, []);

  return { queue, online, lastResults, retry, discard };
}

export function useSyncQueueOperations(filter: (operation: SyncQueueOperation) => boolean) {
  const syncQueue = useSyncQueue();
  const operations = useMemo(() => syncQueue.queue.filter(filter), [filter, syncQueue.queue]);
  return { ...syncQueue, operations };
}
