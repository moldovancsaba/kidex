import type { AssessmentRecord } from "@/types/assessment";

export interface ExportValidationResult {
  ok: boolean;
  warnings: string[];
}

export function validatePdfExport(record: AssessmentRecord | null | undefined, history: AssessmentRecord[] = []): ExportValidationResult {
  const warnings: string[] = [];
  if (!record) warnings.push("Missing assessment record.");
  if (!record?.child?.name) warnings.push("Missing child name.");
  if (!record?.session?.date) warnings.push("Missing session date.");
  if (!record?.computed?.ski && record?.computed?.ski !== 0) warnings.push("Missing computed SKI.");
  if (history.length < 2) warnings.push("Only one assessment available; trend charts are limited.");
  return { ok: warnings.length < 4, warnings };
}

export async function logPdfExportTelemetry(event: {
  status: "success" | "failed";
  format: "map" | "original";
  childId?: string;
  recordId?: string;
  locale?: string;
  durationMs: number;
  warnings?: string[];
  error?: string;
}) {
  const payload = { type: "pdf_export", at: new Date().toISOString(), ...event };
  try {
    await fetch("/api/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event),
    });
  } catch (error) {
    if (event.status === "failed") console.error(payload, error);
    else console.info(payload, error);
  }
}
