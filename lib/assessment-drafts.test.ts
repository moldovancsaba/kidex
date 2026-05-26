import { describe, expect, it } from "vitest";
import {
  ASSESSMENT_DRAFT_SCHEMA_VERSION,
  buildAssessmentDraftRecord,
  findAssessmentDraftForContext,
  hasMeaningfulAssessmentDraft,
  listAssessmentDrafts,
  removeAssessmentDraftByContext,
  serializeAssessmentDrafts,
  upsertAssessmentDraft,
} from "@/lib/assessment-drafts";
import { defaultMentalWellbeingProfile } from "@/lib/mental-wellbeing";
import type { AssessmentPayload } from "@/types/assessment";

function emptyAssessment(): AssessmentPayload {
  return {
    childId: "",
    mode: "rapid",
    child: {
      name: "",
      birthDate: "",
      ageGroup: "",
      dominantHand: "",
      dominantEye: "",
      dominantFoot: "",
      knownTraits: "",
      parentSignals: "",
    },
    session: {
      date: "2026-05-27",
      location: "",
      conductor: "",
      observers: "",
      groupSize: "6-8",
      context: "event",
      consentPhoto: false,
      consentReport: false,
    },
    scores: {},
    notes: {
      general: "",
      movement: "",
      social: "",
      mental: "",
      adaptations: "",
      referral: "",
    },
    mentalWellbeing: defaultMentalWellbeingProfile(),
    attachments: [],
  };
}

describe("assessment draft helpers", () => {
  it("serializes and reads draft records", () => {
    const assessment = emptyAssessment();
    assessment.childId = "child-1";
    const draft = buildAssessmentDraftRecord({
      draftId: "draft-1",
      payload: assessment,
      conductorId: "conductor@example.com",
      locale: "en",
      routeChildId: "child-1",
      now: "2026-05-27T10:00:00.000Z",
    });

    const roundTrip = listAssessmentDrafts(serializeAssessmentDrafts([draft]));
    expect(roundTrip).toHaveLength(1);
    expect(roundTrip[0].draftId).toBe("draft-1");
    expect(roundTrip[0].schemaVersion).toBe(ASSESSMENT_DRAFT_SCHEMA_VERSION);
  });

  it("matches the newest compatible draft for the same child context", () => {
    const base = emptyAssessment();
    base.childId = "child-1";

    const staleCompatible = buildAssessmentDraftRecord({
      draftId: "draft-1",
      payload: base,
      conductorId: "coach@example.com",
      routeChildId: "child-1",
      now: "2026-05-10T10:00:00.000Z",
    });
    const freshCompatible = buildAssessmentDraftRecord({
      draftId: "draft-2",
      payload: base,
      conductorId: "coach@example.com",
      routeChildId: "child-1",
      now: "2026-05-27T09:00:00.000Z",
    });

    const result = findAssessmentDraftForContext(
      [staleCompatible, freshCompatible],
      { conductorId: "coach@example.com", routeChildId: "child-1" },
      new Date("2026-05-27T10:00:00.000Z").getTime(),
    );

    expect(result.status).toBe("available");
    expect(result.draft?.draftId).toBe("draft-2");
  });

  it("flags stale drafts when the newest match is too old", () => {
    const assessment = emptyAssessment();
    assessment.childId = "child-1";
    const draft = buildAssessmentDraftRecord({
      draftId: "draft-1",
      payload: assessment,
      conductorId: "coach@example.com",
      routeChildId: "child-1",
      now: "2026-05-01T10:00:00.000Z",
    });

    const result = findAssessmentDraftForContext(
      [draft],
      { conductorId: "coach@example.com", routeChildId: "child-1" },
      new Date("2026-05-27T10:00:00.000Z").getTime(),
    );

    expect(result.status).toBe("stale");
  });

  it("flags incompatible drafts when only an old schema exists", () => {
    const assessment = emptyAssessment();
    assessment.childId = "child-1";
    const draft = {
      ...buildAssessmentDraftRecord({
        draftId: "draft-1",
        payload: assessment,
        conductorId: "coach@example.com",
        routeChildId: "child-1",
        now: "2026-05-27T10:00:00.000Z",
      }),
      schemaVersion: 0,
    };

    const result = findAssessmentDraftForContext([draft], {
      conductorId: "coach@example.com",
      routeChildId: "child-1",
    });

    expect(result.status).toBe("incompatible");
  });

  it("detects meaningful draft content", () => {
    const empty = emptyAssessment();
    expect(hasMeaningfulAssessmentDraft(empty)).toBe(false);

    const withNote = emptyAssessment();
    withNote.notes.general = "Observed hesitation.";
    expect(hasMeaningfulAssessmentDraft(withNote)).toBe(true);
  });

  it("removes drafts for a finalized child context", () => {
    const childOne = buildAssessmentDraftRecord({
      draftId: "draft-1",
      payload: { ...emptyAssessment(), childId: "child-1" },
      conductorId: "coach@example.com",
      routeChildId: "child-1",
    });
    const childTwo = buildAssessmentDraftRecord({
      draftId: "draft-2",
      payload: { ...emptyAssessment(), childId: "child-2" },
      conductorId: "coach@example.com",
      routeChildId: "child-2",
    });

    const remaining = removeAssessmentDraftByContext([childOne, childTwo], {
      conductorId: "coach@example.com",
      routeChildId: "child-1",
    });

    expect(remaining).toHaveLength(1);
    expect(remaining[0].draftId).toBe("draft-2");
  });

  it("upserts draft records by draft id", () => {
    const first = buildAssessmentDraftRecord({
      draftId: "draft-1",
      payload: emptyAssessment(),
      conductorId: "coach@example.com",
      now: "2026-05-27T09:00:00.000Z",
    });
    const updated = buildAssessmentDraftRecord({
      draftId: "draft-1",
      payload: { ...emptyAssessment(), notes: { ...emptyAssessment().notes, general: "Updated" } },
      conductorId: "coach@example.com",
      now: "2026-05-27T10:00:00.000Z",
    });

    const drafts = upsertAssessmentDraft([first], updated);
    expect(drafts).toHaveLength(1);
    expect(drafts[0].payload.notes.general).toBe("Updated");
  });
});
