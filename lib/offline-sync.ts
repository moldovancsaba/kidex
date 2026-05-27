export const SYNC_QUEUE_STORAGE_KEY = "kidex-sync-queue";
export const SYNC_QUEUE_CHANGE_EVENT = "kidex:sync-queue-change";
export const SYNC_QUEUE_FLUSH_EVENT = "kidex:sync-queue-flush";
const SYNC_QUEUE_TIMEOUT_MS = 10_000;

export type SyncQueueState =
  | "synced"
  | "pending_local"
  | "retrying"
  | "failed_retryable"
  | "conflict";

export type SyncQueueOperationKind =
  | "assessment_save"
  | "plan_save"
  | "follow_up_note";

export interface SyncQueueOperationMetadata {
  childId?: string;
  recordId?: string;
  draftId?: string;
  createdAt?: string;
  category?: string;
  subject?: string;
  caregiverIds?: string[];
  caregiverNames?: string[];
}

export interface SyncQueueOperation {
  operationId: string;
  operationKey: string;
  kind: SyncQueueOperationKind;
  endpoint: string;
  method: "POST" | "PATCH";
  body: string;
  summary: string;
  state: SyncQueueState;
  createdAt: string;
  updatedAt: string;
  lastAttemptAt?: string;
  lastError?: string;
  attemptCount: number;
  maxAttempts: number;
  metadata?: SyncQueueOperationMetadata;
}

export interface SyncQueueFlushResult {
  operationId: string;
  operationKey: string;
  kind: SyncQueueOperationKind;
  outcome: Exclude<SyncQueueState, "synced"> | "synced";
  responseBody?: unknown;
  errorMessage?: string;
  metadata?: SyncQueueOperationMetadata;
}

interface ExecuteSyncQueueOperationResult {
  outcome: "synced" | "failed_retryable" | "conflict";
  responseBody?: unknown;
  errorMessage?: string;
}

export function listSyncQueue(raw: string | null | undefined): SyncQueueOperation[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry): entry is SyncQueueOperation =>
        Boolean(entry && typeof entry === "object" && "operationId" in entry && "operationKey" in entry),
    );
  } catch {
    return [];
  }
}

export function serializeSyncQueue(queue: SyncQueueOperation[]) {
  return JSON.stringify(queue);
}

export function readSyncQueueFromStorage(storage: Storage | null | undefined = typeof window !== "undefined" ? window.localStorage : undefined) {
  try {
    return listSyncQueue(storage?.getItem(SYNC_QUEUE_STORAGE_KEY));
  } catch {
    return [];
  }
}

function emitSyncQueueChange(queue: SyncQueueOperation[]) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(SYNC_QUEUE_CHANGE_EVENT, { detail: { queue } }));
}

function emitSyncQueueFlush(results: SyncQueueFlushResult[]) {
  if (typeof window === "undefined" || results.length === 0) return;
  window.dispatchEvent(new CustomEvent(SYNC_QUEUE_FLUSH_EVENT, { detail: { results } }));
}

export function writeSyncQueueToStorage(
  queue: SyncQueueOperation[],
  storage: Storage | null | undefined = typeof window !== "undefined" ? window.localStorage : undefined,
) {
  if (!storage) return false;
  try {
    storage.setItem(SYNC_QUEUE_STORAGE_KEY, serializeSyncQueue(queue));
    emitSyncQueueChange(queue);
    return true;
  } catch {
    return false;
  }
}

export function buildSyncQueueOperation(input: {
  operationKey: string;
  kind: SyncQueueOperationKind;
  endpoint: string;
  method: "POST" | "PATCH";
  body: unknown;
  summary: string;
  metadata?: SyncQueueOperationMetadata;
  operationId?: string;
  createdAt?: string;
  maxAttempts?: number;
}): SyncQueueOperation {
  const createdAt = input.createdAt || new Date().toISOString();
  return {
    operationId: input.operationId || globalThis.crypto?.randomUUID?.() || `${input.kind}-${Date.now()}`,
    operationKey: input.operationKey,
    kind: input.kind,
    endpoint: input.endpoint,
    method: input.method,
    body: JSON.stringify(input.body),
    summary: input.summary,
    state: "pending_local",
    createdAt,
    updatedAt: createdAt,
    attemptCount: 0,
    maxAttempts: input.maxAttempts ?? 5,
    metadata: input.metadata,
  };
}

export function parseSyncQueueOperationBody<T>(operation: SyncQueueOperation): T | null {
  try {
    return JSON.parse(operation.body) as T;
  } catch {
    return null;
  }
}

export function upsertSyncQueueOperation(queue: SyncQueueOperation[], operation: SyncQueueOperation) {
  const existing = queue.find((entry) => entry.operationKey === operation.operationKey);
  const nextOperation = existing
    ? {
        ...operation,
        operationId: existing.operationId,
        createdAt: existing.createdAt,
        attemptCount: existing.attemptCount,
        lastAttemptAt: existing.lastAttemptAt,
      }
    : operation;
  return [nextOperation, ...queue.filter((entry) => entry.operationKey !== operation.operationKey)];
}

export function removeSyncQueueOperationById(queue: SyncQueueOperation[], operationId?: string | null) {
  if (!operationId) return queue;
  return queue.filter((entry) => entry.operationId !== operationId);
}

export function removeSyncQueueOperationByKey(queue: SyncQueueOperation[], operationKey?: string | null) {
  if (!operationKey) return queue;
  return queue.filter((entry) => entry.operationKey !== operationKey);
}

export function findSyncQueueOperationByKey(queue: SyncQueueOperation[], operationKey?: string | null) {
  if (!operationKey) return null;
  return queue.find((entry) => entry.operationKey === operationKey) || null;
}

export function retryDelayMsForOperation(operation: SyncQueueOperation) {
  return Math.min(5 * 60 * 1000, 5_000 * Math.max(1, 2 ** Math.max(0, operation.attemptCount - 1)));
}

export function canAutoRetryOperation(operation: SyncQueueOperation, now = Date.now()) {
  if (operation.state === "pending_local") return true;
  if (operation.state !== "failed_retryable") return false;
  if (operation.attemptCount >= operation.maxAttempts) return false;
  const lastAttempt = operation.lastAttemptAt ? new Date(operation.lastAttemptAt).getTime() : 0;
  return now - lastAttempt >= retryDelayMsForOperation(operation);
}

function classifyResponseFailure(status: number, fallbackMessage: string): ExecuteSyncQueueOperationResult {
  if (status === 409 || status === 412) {
    return {
      outcome: "conflict",
      errorMessage: fallbackMessage || "Server reported a write conflict. Review the latest server state before retrying.",
    };
  }

  return {
    outcome: "failed_retryable",
    errorMessage: fallbackMessage || "The operation could not be synced yet. Retry when connectivity or authentication is restored.",
  };
}

export function isRetryableSyncResponseStatus(status: number) {
  return status === 408 || status === 425 || status === 429 || status >= 500;
}

async function parseResponseError(response: Response) {
  const payload = (await response.json().catch(() => null)) as { error?: string } | null;
  return payload?.error || "";
}

export async function executeSyncQueueOperation(
  operation: SyncQueueOperation,
  fetchImpl: typeof fetch = fetch,
): Promise<ExecuteSyncQueueOperationResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SYNC_QUEUE_TIMEOUT_MS);

  try {
    const response = await fetchImpl(operation.endpoint, {
      method: operation.method,
      headers: { "Content-Type": "application/json" },
      body: operation.body,
      signal: controller.signal,
    });

    if (!response.ok) {
      const message = await parseResponseError(response);
      return classifyResponseFailure(response.status, message);
    }

    const responseBody = (await response.json().catch(() => null)) as unknown;
    return { outcome: "synced", responseBody };
  } catch (error) {
    if ((error as Error).name === "AbortError") {
      return {
        outcome: "failed_retryable",
        errorMessage: "The sync attempt timed out. Retry when the connection is stable.",
      };
    }

    return {
      outcome: "failed_retryable",
      errorMessage: error instanceof Error ? error.message : "The sync attempt failed before the server responded.",
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function flushSyncQueue(options?: {
  manual?: boolean;
  filter?: (operation: SyncQueueOperation) => boolean;
  fetchImpl?: typeof fetch;
  storage?: Storage | null;
}) {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { queue: readSyncQueueFromStorage(options?.storage), results: [] as SyncQueueFlushResult[] };
  }

  let queue = readSyncQueueFromStorage(options?.storage);
  const now = Date.now();
  const results: SyncQueueFlushResult[] = [];

  for (const operation of queue) {
    if (options?.filter && !options.filter(operation)) {
      continue;
    }
    if (!options?.manual && !canAutoRetryOperation(operation, now)) {
      continue;
    }

    const retryingOperation: SyncQueueOperation = {
      ...operation,
      state: "retrying",
      attemptCount: operation.attemptCount + 1,
      lastAttemptAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    queue = upsertSyncQueueOperation(queue, retryingOperation);
    writeSyncQueueToStorage(queue, options?.storage);

    const result = await executeSyncQueueOperation(retryingOperation, options?.fetchImpl);
    if (result.outcome === "synced") {
      queue = removeSyncQueueOperationById(queue, retryingOperation.operationId);
    } else {
      queue = upsertSyncQueueOperation(queue, {
        ...retryingOperation,
        state: result.outcome,
        lastError: result.errorMessage,
        updatedAt: new Date().toISOString(),
      });
    }

    writeSyncQueueToStorage(queue, options?.storage);
    results.push({
      operationId: retryingOperation.operationId,
      operationKey: retryingOperation.operationKey,
      kind: retryingOperation.kind,
      outcome: result.outcome,
      responseBody: result.responseBody,
      errorMessage: result.errorMessage,
      metadata: retryingOperation.metadata,
    });
  }

  emitSyncQueueFlush(results);
  return { queue, results };
}
