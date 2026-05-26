import { defaultMentalWellbeingProfile } from "@/lib/mental-wellbeing";
import type { AssessmentPayload } from "@/types/assessment";

export const ASSESSMENT_DRAFT_SCHEMA_VERSION = 1;
export const ASSESSMENT_DRAFT_STORAGE_KEY = "kidex-assessment-drafts";
export const LEGACY_ASSESSMENT_DRAFT_STORAGE_KEY = "kidex-draft";
export const ASSESSMENT_DRAFT_STALE_DAYS = 7;

export type AssessmentDraftSyncState =
  | "local_only"
  | "syncing"
  | "synced"
  | "conflict"
  | "stale";

export type AssessmentDraftLookupStatus =
  | "none"
  | "available"
  | "stale"
  | "incompatible";

export interface AssessmentDraftRecord {
  draftId: string;
  childId?: string;
  recordId?: string;
  conductorId: string;
  locale?: string;
  payload: AssessmentPayload;
  lastEditedAt: string;
  syncState: AssessmentDraftSyncState;
  schemaVersion: number;
}

export interface AssessmentDraftContext {
  conductorId: string;
  locale?: string;
  routeChildId?: string | null;
  routeRecordId?: string | null;
  payloadChildId?: string | null;
  payloadRecordId?: string | null;
}

export interface AssessmentDraftLookupResult {
  status: AssessmentDraftLookupStatus;
  draft?: AssessmentDraftRecord;
}

function normalizeDate(value?: string) {
  const parsed = value ? new Date(value).getTime() : Number.NaN;
  return Number.isFinite(parsed) ? parsed : 0;
}

function draftSortDescending(left: AssessmentDraftRecord, right: AssessmentDraftRecord) {
  return normalizeDate(right.lastEditedAt) - normalizeDate(left.lastEditedAt);
}

export function cloneAssessmentPayload(payload: AssessmentPayload): AssessmentPayload {
  return JSON.parse(JSON.stringify(payload)) as AssessmentPayload;
}

export function listAssessmentDrafts(raw: string | null | undefined): AssessmentDraftRecord[] {
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((entry): entry is AssessmentDraftRecord => Boolean(entry && typeof entry === "object" && "draftId" in entry))
      .sort(draftSortDescending);
  } catch {
    return [];
  }
}

export function serializeAssessmentDrafts(drafts: AssessmentDraftRecord[]) {
  return JSON.stringify([...drafts].sort(draftSortDescending));
}

export function isAssessmentDraftStale(
  draft: AssessmentDraftRecord,
  now = Date.now(),
  staleDays = ASSESSMENT_DRAFT_STALE_DAYS,
) {
  return now - normalizeDate(draft.lastEditedAt) > staleDays * 24 * 60 * 60 * 1000;
}

export function hasMeaningfulAssessmentDraft(payload: AssessmentPayload) {
  const hasScore = Object.values(payload.scores).some(
    (entry) => typeof entry.score === "number" || Boolean(entry.note?.trim()) || Boolean(entry.observer?.trim()),
  );
  const hasNotes = Object.values(payload.notes).some((value) => Boolean(value.trim()));
  const mental = payload.mentalWellbeing;
  const defaultMental = defaultMentalWellbeingProfile();
  const hasMentalSignals =
    mental.phase !== defaultMental.phase ||
    mental.reflection.trim().length > 0 ||
    mental.supportNeeds.trim().length > 0 ||
    mental.goalModules.length > 0 ||
    Object.values(mental.riskSignals).some(Boolean) ||
    Object.values(mental.checkIn).some((value) => typeof value === "number") ||
    Object.values(mental.perspectives).some((perspective) =>
      Object.values(perspective).some((value) => typeof value === "number"),
    );

  return Boolean(
    payload.childId ||
      payload.child.name.trim() ||
      payload.child.birthDate.trim() ||
      payload.child.knownTraits.trim() ||
      payload.child.parentSignals.trim() ||
      payload.session.location.trim() ||
      payload.session.conductor.trim() ||
      payload.session.observers.trim() ||
      payload.attachments.length ||
      hasScore ||
      hasNotes ||
      hasMentalSignals,
  );
}

export function resolveAssessmentDraftTarget(context: AssessmentDraftContext) {
  const recordId = context.routeRecordId || context.payloadRecordId || undefined;
  if (recordId) {
    return { recordId, childId: context.routeChildId || context.payloadChildId || undefined };
  }

  const childId = context.routeChildId || context.payloadChildId || undefined;
  return { childId };
}

export function findAssessmentDraftForContext(
  drafts: AssessmentDraftRecord[],
  context: AssessmentDraftContext,
  now = Date.now(),
): AssessmentDraftLookupResult {
  const ownerMatches = drafts
    .filter((draft) => draft.conductorId === context.conductorId)
    .sort(draftSortDescending);

  if (!ownerMatches.length) {
    return { status: "none" };
  }

  const { recordId, childId } = resolveAssessmentDraftTarget(context);
  const exactMatches = ownerMatches.filter((draft) => {
    if (recordId) {
      return draft.recordId === recordId;
    }
    if (childId) {
      return !draft.recordId && draft.childId === childId;
    }
    return !draft.recordId && !draft.childId;
  });

  if (!exactMatches.length) {
    return { status: "none" };
  }

  const compatible = exactMatches.find((draft) => draft.schemaVersion === ASSESSMENT_DRAFT_SCHEMA_VERSION);
  if (!compatible) {
    return { status: "incompatible", draft: exactMatches[0] };
  }

  if (isAssessmentDraftStale(compatible, now)) {
    return { status: "stale", draft: compatible };
  }

  return { status: "available", draft: compatible };
}

export function upsertAssessmentDraft(
  drafts: AssessmentDraftRecord[],
  nextDraft: AssessmentDraftRecord,
) {
  const filtered = drafts.filter((draft) => draft.draftId !== nextDraft.draftId);
  return [nextDraft, ...filtered].sort(draftSortDescending);
}

export function removeAssessmentDraftById(drafts: AssessmentDraftRecord[], draftId?: string | null) {
  if (!draftId) {
    return drafts;
  }
  return drafts.filter((draft) => draft.draftId !== draftId);
}

export function removeAssessmentDraftByContext(
  drafts: AssessmentDraftRecord[],
  context: AssessmentDraftContext,
) {
  const { recordId, childId } = resolveAssessmentDraftTarget(context);
  return drafts.filter((draft) => {
    if (draft.conductorId !== context.conductorId) {
      return true;
    }
    if (recordId) {
      return draft.recordId !== recordId;
    }
    if (childId) {
      return draft.recordId || draft.childId !== childId;
    }
    return draft.recordId || draft.childId;
  });
}

export function buildAssessmentDraftRecord(input: {
  draftId: string;
  payload: AssessmentPayload;
  conductorId: string;
  locale?: string;
  routeChildId?: string | null;
  routeRecordId?: string | null;
  payloadRecordId?: string | null;
  now?: string;
  syncState?: AssessmentDraftSyncState;
}): AssessmentDraftRecord {
  const { recordId, childId } = resolveAssessmentDraftTarget({
    conductorId: input.conductorId,
    locale: input.locale,
    routeChildId: input.routeChildId,
    routeRecordId: input.routeRecordId,
    payloadChildId: input.payload.childId,
    payloadRecordId: input.payloadRecordId,
  });

  return {
    draftId: input.draftId,
    recordId,
    childId,
    conductorId: input.conductorId,
    locale: input.locale,
    payload: cloneAssessmentPayload(input.payload),
    lastEditedAt: input.now || new Date().toISOString(),
    syncState: input.syncState || "local_only",
    schemaVersion: ASSESSMENT_DRAFT_SCHEMA_VERSION,
  };
}

