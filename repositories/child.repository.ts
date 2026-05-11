import { ObjectId } from "mongodb";
import { getDatabase } from "@/lib/mongodb";
import { toJsonId } from "@/lib/utils";

export interface ChildProfile {
  _id?: string;
  kidexId?: string;
  institutionId?: string;
  createdByUserEmail?: string;
  practitionerEmails?: string[];
  visibility?: "institution" | "restricted";
  name: string;
  birthDate: string;
  ageGroup?: "4-6" | "7-9" | "10-12" | "";
  consentPhoto?: boolean;
  consentReport?: boolean;
  dominantHand?: string;
  dominantEye?: string;
  dominantFoot?: string;
  knownTraits?: string;
  parentSignals?: string;
  locale?: string;
  createdAt: string;
  updatedAt: string;
  // Metrics fields (populated via aggregation)
  latestLocation?: string;
  latestSki?: number;
  avgSki?: number;
  latestRecordId?: string;
  latestScores?: {
    movement: number;
    social: number;
    mental: number;
  };
}

const collectionName = "children";

export async function listChildren(): Promise<ChildProfile[]> {
  const db = await getDatabase();
  const children = await db.collection(collectionName).find({ deletedAt: { $exists: false } }).sort({ name: 1 }).toArray();
  return children.map((child) => toJsonId(child) as unknown as ChildProfile);
}

export async function listDeletedChildren(): Promise<ChildProfile[]> {
  const db = await getDatabase();
  const children = await db.collection(collectionName).find({ deletedAt: { $exists: true } }).sort({ updatedAt: -1 }).toArray();
  return children.map((child) => toJsonId(child) as unknown as ChildProfile);
}

export async function listChildrenWithMetrics(): Promise<ChildProfile[]> {
  const db = await getDatabase();
  const pipeline = [
    { $match: { deletedAt: { $exists: false } } },
    {
      $lookup: {
        from: "assessments",
        let: { childId: { $toString: "$_id" } },
        pipeline: [
          { 
            $match: { 
              $expr: { 
                $or: [
                  { $eq: ["$childId", "$$childId"] },
                  { 
                    $and: [
                      { $eq: ["$child.name", "$name"] },
                      { $eq: ["$child.birthDate", "$birthDate"] }
                    ]
                  }
                ] 
              } 
            } 
          },
          { $sort: { createdAt: -1 } as any },
          { $limit: 1 }
        ],
        as: "latestAssessment"
      }
    },
    {
      $lookup: {
        from: "assessments",
        let: { childId: { $toString: "$_id" } },
        pipeline: [
          {
            $match: {
              $expr: {
                $or: [
                  { $eq: ["$childId", "$$childId"] },
                  {
                    $and: [
                      { $eq: ["$child.name", "$name"] },
                      { $eq: ["$child.birthDate", "$birthDate"] }
                    ]
                  }
                ]
              }
            }
          },
          {
            $group: {
              _id: null,
              avgSki: { $avg: "$computed.ski" }
            }
          }
        ],
        as: "aggregateMetrics"
      }
    },
    {
      $addFields: {
        latestAssessment: { $arrayElemAt: ["$latestAssessment", 0] }
      }
    },
    {
      $addFields: {
        latestLocation: "$latestAssessment.session.location",
        latestSki: "$latestAssessment.computed.ski",
        latestRecordId: { $toString: "$latestAssessment._id" },
        latestScores: {
          movement: "$latestAssessment.computed.movementAverage",
          social: "$latestAssessment.computed.socialAverage",
          mental: "$latestAssessment.computed.mentalAverage"
        },
        avgSki: { $round: [{ $ifNull: [{ $arrayElemAt: ["$aggregateMetrics.avgSki", 0] }, 0] }, 2] }
      }
    },
    { $sort: { name: 1 } as any }
  ];

  const children = await db.collection(collectionName).aggregate(pipeline).toArray();
  return children.map(toJsonId) as any;
}

export async function getChildById(id: ObjectId): Promise<ChildProfile | null> {
  const db = await getDatabase();
  const child = await db.collection(collectionName).findOne({ _id: id, deletedAt: { $exists: false } });
  return child ? (toJsonId(child) as unknown as ChildProfile) : null;
}

export async function upsertChild(profile: Omit<ChildProfile, "_id" | "createdAt" | "updatedAt">) {
  const db = await getDatabase();
  const now = new Date().toISOString();
  
  const name = profile.name.trim();
  
  // Try to find existing child by name and birthDate to avoid duplicates
  const existing = await db.collection(collectionName).findOne({ 
    name: name, 
    birthDate: profile.birthDate 
  });

  if (existing) {
    await db.collection(collectionName).updateOne(
      { _id: existing._id },
      { $set: { ...profile, updatedAt: now } }
    );
    return toJsonId({ ...existing, ...profile, updatedAt: now }) as unknown as ChildProfile;
  }

  const newChild = { ...profile, kidexId: profile.kidexId || crypto.randomUUID(), name, createdAt: now, updatedAt: now };
  const result = await db.collection(collectionName).insertOne(newChild);
  return { ...newChild, _id: result.insertedId.toString() };
}

export async function updateChildById(
  id: ObjectId,
  profile: Omit<ChildProfile, "_id" | "createdAt" | "updatedAt">
) {
  const db = await getDatabase();
  const now = new Date().toISOString();
  const nextProfile = {
    ...profile,
    name: profile.name.trim(),
    updatedAt: now
  };

  const result = await db.collection(collectionName).findOneAndUpdate(
    { _id: id },
    { $set: nextProfile },
    { returnDocument: "after" }
  );

  return result ? (toJsonId(result) as unknown as ChildProfile) : null;
}

export async function deleteChildById(id: ObjectId) {
  const db = await getDatabase();
  const child = await db.collection(collectionName).findOne({ _id: id });
  if (!child) {
    return null;
  }

  const now = new Date().toISOString();
  await db.collection(collectionName).updateOne({ _id: id }, { $set: { deletedAt: now, updatedAt: now } });
  const jsonChild = toJsonId(child) as Record<string, unknown>;
  return {
    _id: typeof jsonChild._id === "string" ? jsonChild._id : undefined,
    kidexId: typeof jsonChild.kidexId === "string" ? jsonChild.kidexId : "",
    institutionId: typeof jsonChild.institutionId === "string" ? jsonChild.institutionId : undefined,
    createdByUserEmail: typeof jsonChild.createdByUserEmail === "string" ? jsonChild.createdByUserEmail : undefined,
    practitionerEmails: Array.isArray(jsonChild.practitionerEmails) ? jsonChild.practitionerEmails.filter((value): value is string => typeof value === "string") : [],
    visibility: jsonChild.visibility === "restricted" ? "restricted" : "institution",
    name: typeof jsonChild.name === "string" ? jsonChild.name : "",
    birthDate: typeof jsonChild.birthDate === "string" ? jsonChild.birthDate : "",
    ageGroup: (typeof jsonChild.ageGroup === "string" ? jsonChild.ageGroup : "") as ChildProfile["ageGroup"],
    consentPhoto: Boolean(jsonChild.consentPhoto),
    consentReport: Boolean(jsonChild.consentReport),
    dominantHand: typeof jsonChild.dominantHand === "string" ? jsonChild.dominantHand : "",
    dominantEye: typeof jsonChild.dominantEye === "string" ? jsonChild.dominantEye : "",
    dominantFoot: typeof jsonChild.dominantFoot === "string" ? jsonChild.dominantFoot : "",
    knownTraits: typeof jsonChild.knownTraits === "string" ? jsonChild.knownTraits : "",
    parentSignals: typeof jsonChild.parentSignals === "string" ? jsonChild.parentSignals : "",
    createdAt: typeof jsonChild.createdAt === "string" ? jsonChild.createdAt : "",
    updatedAt: typeof jsonChild.updatedAt === "string" ? jsonChild.updatedAt : ""
  } satisfies ChildProfile;
}

export async function restoreChildById(id: ObjectId) {
  const db = await getDatabase();
  const result = await db.collection(collectionName).findOneAndUpdate(
    { _id: id },
    { $unset: { deletedAt: "" }, $set: { updatedAt: new Date().toISOString() } },
    { returnDocument: "after" }
  );
  return result ? (toJsonId(result) as unknown as ChildProfile) : null;
}
