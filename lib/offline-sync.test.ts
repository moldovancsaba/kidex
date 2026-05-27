import { describe, expect, it } from "vitest";
import {
  buildSyncQueueOperation,
  canAutoRetryOperation,
  executeSyncQueueOperation,
  isRetryableSyncResponseStatus,
  parseSyncQueueOperationBody,
  retryDelayMsForOperation,
  upsertSyncQueueOperation,
  type SyncQueueOperation,
} from "@/lib/offline-sync";

describe("offline sync queue", () => {
  it("upserts by operation key", () => {
    const first = buildSyncQueueOperation({
      operationKey: "plan-save:child-1",
      kind: "plan_save",
      endpoint: "/api/children/child-1/plan",
      method: "POST",
      body: { summary: "First" },
      summary: "first",
    });
    const second = buildSyncQueueOperation({
      operationKey: "plan-save:child-1",
      kind: "plan_save",
      endpoint: "/api/children/child-1/plan",
      method: "POST",
      body: { summary: "Second" },
      summary: "second",
    });

    const queue = upsertSyncQueueOperation([first], second);
    expect(queue).toHaveLength(1);
    expect(queue[0]?.operationId).toBe(first.operationId);
    expect(parseSyncQueueOperationBody<{ summary: string }>(queue[0] as SyncQueueOperation)?.summary).toBe("Second");
  });

  it("backs off retry timing for failed operations", () => {
    const operation = {
      ...buildSyncQueueOperation({
        operationKey: "assessment-save:draft-1",
        kind: "assessment_save",
        endpoint: "/api/assessments",
        method: "POST",
        body: { childId: "child-1" },
        summary: "assessment",
      }),
      state: "failed_retryable" as const,
      attemptCount: 2,
      lastAttemptAt: new Date(10_000).toISOString(),
    };

    expect(retryDelayMsForOperation(operation)).toBe(10_000);
    expect(canAutoRetryOperation(operation, 19_000)).toBe(false);
    expect(canAutoRetryOperation(operation, 20_000)).toBe(true);
  });

  it("classifies retryable and conflict responses", async () => {
    const operation = buildSyncQueueOperation({
      operationKey: "plan-save:child-1",
      kind: "plan_save",
      endpoint: "/api/children/child-1/plan",
      method: "POST",
      body: { summary: "Queued" },
      summary: "plan",
    });

    const retryable = await executeSyncQueueOperation(
      operation,
      async () => new Response(JSON.stringify({ error: "Try again" }), { status: 503, headers: { "Content-Type": "application/json" } }),
    );
    expect(retryable.outcome).toBe("failed_retryable");

    const conflict = await executeSyncQueueOperation(
      operation,
      async () => new Response(JSON.stringify({ error: "Conflict" }), { status: 409, headers: { "Content-Type": "application/json" } }),
    );
    expect(conflict.outcome).toBe("conflict");

    const success = await executeSyncQueueOperation(
      operation,
      async () => new Response(JSON.stringify({ plan: { summary: "Synced" } }), { status: 200, headers: { "Content-Type": "application/json" } }),
    );
    expect(success.outcome).toBe("synced");
  });

  it("tracks retryable server statuses", () => {
    expect(isRetryableSyncResponseStatus(408)).toBe(true);
    expect(isRetryableSyncResponseStatus(429)).toBe(true);
    expect(isRetryableSyncResponseStatus(503)).toBe(true);
    expect(isRetryableSyncResponseStatus(400)).toBe(false);
  });
});
