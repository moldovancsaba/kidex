import { ObjectId } from "mongodb";
import { getDatabase } from "@/lib/mongodb";
import { toJsonId } from "@/lib/utils";
import type { AssessmentRecord } from "@/types/assessment";

const collectionName = "assessments";

export async function listAssessmentSummaries(): Promise<AssessmentRecord[]> {
  const db = await getDatabase();
  const assessments = await db
    .collection(collectionName)
    .find({ deletedAt: { $exists: false } }, {
      projection: {
        child: 1,
        session: 1,
        mode: 1,
        scores: 1,
        computed: 1,
        createdAt: 1,
        updatedAt: 1,
        updateHistory: 1
      }
    })
    .sort({ updatedAt: -1 })
    .limit(100)
    .toArray();

  return assessments.map((assessment) => toJsonId(assessment) as unknown as AssessmentRecord);
}

export async function listDeletedAssessmentSummaries(): Promise<AssessmentRecord[]> {
  const db = await getDatabase();
  const assessments = await db
    .collection(collectionName)
    .find({ deletedAt: { $exists: true } }, { projection: { child: 1, session: 1, mode: 1, computed: 1, createdAt: 1, updatedAt: 1 } })
    .sort({ updatedAt: -1 })
    .limit(200)
    .toArray();
  return assessments.map((assessment) => toJsonId(assessment) as unknown as AssessmentRecord);
}

export async function createAssessment(record: Omit<AssessmentRecord, "_id">) {
  const db = await getDatabase();
  const result = await db.collection(collectionName).insertOne(record);
  return { ...record, _id: result.insertedId.toString() };
}

export async function getAssessmentById(id: ObjectId): Promise<AssessmentRecord | null> {
  const db = await getDatabase();
  const assessment = await db.collection(collectionName).findOne({ _id: id, deletedAt: { $exists: false } });
  return assessment ? (toJsonId(assessment) as unknown as AssessmentRecord) : null;
}

export async function updateAssessmentById(id: ObjectId, update: Partial<AssessmentRecord>) {
  const db = await getDatabase();
  const result = await db.collection(collectionName).findOneAndUpdate(
    { _id: id },
    { $set: update },
    { returnDocument: "after" }
  );

  return result ? (toJsonId(result) as unknown as AssessmentRecord) : null;
}

export async function deleteAssessmentById(id: ObjectId) {
  const db = await getDatabase();
  await db.collection(collectionName).updateOne(
    { _id: id },
    ({ $set: { deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString() }, $push: { updateHistory: `soft-delete:${new Date().toISOString()}` } } as any)
  );
}

export async function restoreAssessmentById(id: ObjectId) {
  const db = await getDatabase();
  await db.collection(collectionName).updateOne(
    { _id: id },
    ({ $unset: { deletedAt: "" }, $set: { updatedAt: new Date().toISOString() }, $push: { updateHistory: `restore:${new Date().toISOString()}` } } as any)
  );
}

export async function listAssessmentsByChildId(childId: string): Promise<AssessmentRecord[]> {
  const db = await getDatabase();
  const objectId = ObjectId.isValid(childId) ? new ObjectId(childId) : null;
  let assessments = await db
    .collection(collectionName)
    .find(objectId ? { childId: { $in: [childId, objectId] } } : { childId })
    .sort({ createdAt: 1 })
    .toArray();

  // Backward compatibility: older records may not have childId set,
  // but they can still be linked by immutable identity fields.
  if (assessments.length === 0 && objectId) {
    const child = await db.collection("children").findOne({ _id: objectId });
    if (child?.name && child?.birthDate) {
      assessments = await db
        .collection(collectionName)
        .find({
          "child.name": child.name,
          "child.birthDate": child.birthDate
        })
        .sort({ createdAt: 1 })
        .toArray();
    }
  }

  return assessments.filter((a: any) => !a.deletedAt).map((assessment) => toJsonId(assessment) as unknown as AssessmentRecord);
}

export async function updateAssessmentsForChildProfile(
  childId: string,
  nextChild: { name: string; birthDate: string; ageGroup?: "4-6" | "7-9" | "10-12" | ""; knownTraits?: string; parentSignals?: string; dominantHand?: string; dominantEye?: string; dominantFoot?: string; consentPhoto?: boolean; consentReport?: boolean }
) {
  const db = await getDatabase();
  const objectId = ObjectId.isValid(childId) ? new ObjectId(childId) : null;
  const childFilter = objectId ? { childId: { $in: [childId, objectId] } } : { childId };

  await db.collection(collectionName).updateMany(
    childFilter,
    {
      $set: {
        "child.name": nextChild.name,
        "child.birthDate": nextChild.birthDate,
        "child.ageGroup": nextChild.ageGroup || "",
        "child.knownTraits": nextChild.knownTraits || "",
        "child.parentSignals": nextChild.parentSignals || "",
        "child.dominantHand": nextChild.dominantHand || "",
        "child.dominantEye": nextChild.dominantEye || "",
        "child.dominantFoot": nextChild.dominantFoot || "",
        "session.consentPhoto": Boolean(nextChild.consentPhoto),
        "session.consentReport": Boolean(nextChild.consentReport),
        updatedAt: new Date().toISOString()
      }
    }
  );
}

export async function deleteAssessmentsForChild(
  childId: string,
  fallbackIdentity?: { name: string; birthDate: string }
) {
  const db = await getDatabase();
  const objectId = ObjectId.isValid(childId) ? new ObjectId(childId) : null;
  const childFilter = objectId ? { childId: { $in: [childId, objectId] } } : { childId };

  const now = new Date().toISOString();
  await db.collection(collectionName).updateMany(
    childFilter,
    ({ $set: { deletedAt: now, updatedAt: now }, $push: { updateHistory: `soft-delete:${now}` } } as any)
  );

  if (fallbackIdentity?.name && fallbackIdentity?.birthDate) {
    await db.collection(collectionName).updateMany({
      childId: { $exists: false },
      "child.name": fallbackIdentity.name,
      "child.birthDate": fallbackIdentity.birthDate
    }, ({ $set: { deletedAt: now, updatedAt: now }, $push: { updateHistory: `soft-delete:${now}` } } as any));
  }
}
