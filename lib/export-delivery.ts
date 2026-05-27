export type ExportDeliveryState =
  | "idle"
  | "blocked"
  | "queued"
  | "generating"
  | "success"
  | "failed_retryable"
  | "failed_terminal";

export type ExportBlockedReason = "consent" | "permission" | "missing_data";
export type ExportFailureReason = "network" | "validation" | "download_handoff" | "unknown";

export interface ExportDeliveryStatus {
  state: ExportDeliveryState;
  title?: string;
  description?: string;
  generatedAt?: string;
  reason?: ExportBlockedReason | ExportFailureReason;
}

export function idleExportStatus(): ExportDeliveryStatus {
  return { state: "idle" };
}

export function blockedExportStatus(reason: ExportBlockedReason, description: string): ExportDeliveryStatus {
  return {
    state: "blocked",
    reason,
    title: "Export blocked",
    description,
  };
}

export function queuedExportStatus(description: string): ExportDeliveryStatus {
  return {
    state: "queued",
    title: "Preparing export",
    description,
  };
}

export function generatingExportStatus(description: string): ExportDeliveryStatus {
  return {
    state: "generating",
    title: "Generating export",
    description,
  };
}

export function successfulExportStatus(description: string, generatedAt = new Date().toISOString()): ExportDeliveryStatus {
  return {
    state: "success",
    title: "Export ready",
    description,
    generatedAt,
  };
}

export function failedExportStatus(
  reason: ExportFailureReason,
  description: string,
  retryable = true,
): ExportDeliveryStatus {
  return {
    state: retryable ? "failed_retryable" : "failed_terminal",
    reason,
    title: retryable ? "Export failed" : "Export unavailable",
    description,
  };
}

export function classifyExportFailure(error: unknown): {
  reason: ExportFailureReason;
  retryable: boolean;
  message: string;
} {
  const message = error instanceof Error ? error.message : "Unknown export failure.";
  const normalized = message.toLowerCase();

  if (normalized.includes("network") || normalized.includes("fetch")) {
    return { reason: "network", retryable: true, message };
  }

  if (normalized.includes("missing") || normalized.includes("invalid") || normalized.includes("consent")) {
    return { reason: "validation", retryable: false, message };
  }

  if (normalized.includes("download")) {
    return { reason: "download_handoff", retryable: true, message };
  }

  return { reason: "unknown", retryable: true, message };
}

export function exportNowMs() {
  return Date.now();
}
