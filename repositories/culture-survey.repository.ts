import { ObjectId } from "mongodb";
import { getDatabase } from "@/lib/mongodb";
import { normalizeCultureSurveyLaunch, normalizeCultureSurveyResponse, type CultureSurveyLaunch, type CultureSurveyResponse } from "@/lib/culture-surveys";
import { toJsonId } from "@/lib/utils";

const collectionName = "culture_surveys";

export async function listCultureSurveyLaunches(institutionIds?: string[]): Promise<CultureSurveyLaunch[]> {
  const db = await getDatabase();
  const filter = institutionIds?.length ? { institutionId: { $in: institutionIds } } : {};
  const launches = await db.collection(collectionName).find(filter).sort({ opensAt: -1, _id: -1 }).toArray();
  return launches.map((launch) => normalizeCultureSurveyLaunch(toJsonId(launch)));
}

export async function getCultureSurveyLaunchById(id: string): Promise<CultureSurveyLaunch | null> {
  const db = await getDatabase();
  const filter = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { _id: id as never };
  const launch = await db.collection(collectionName).findOne(filter);
  return launch ? normalizeCultureSurveyLaunch(toJsonId(launch)) : null;
}

export async function createCultureSurveyLaunchRecord(launch: CultureSurveyLaunch): Promise<CultureSurveyLaunch> {
  const db = await getDatabase();
  const { _id, ...payload } = normalizeCultureSurveyLaunch(launch);
  const result = await db.collection(collectionName).insertOne(payload);
  return { ...payload, _id: result.insertedId.toString() };
}

export async function addCultureSurveyResponse(id: string, response: CultureSurveyResponse): Promise<CultureSurveyLaunch | null> {
  const db = await getDatabase();
  if (!ObjectId.isValid(id)) return null;
  const normalizedResponse = normalizeCultureSurveyResponse(response, response.targetRole);
  const now = new Date().toISOString();
  await db.collection(collectionName).updateOne(
    { _id: new ObjectId(id) },
    {
      $push: { responses: normalizedResponse as never },
      $set: { updatedAt: now },
    },
  );
  return await getCultureSurveyLaunchById(id);
}

export async function closeCultureSurveyLaunch(id: string): Promise<CultureSurveyLaunch | null> {
  const db = await getDatabase();
  if (!ObjectId.isValid(id)) return null;
  const now = new Date().toISOString();
  await db.collection(collectionName).updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        status: "closed",
        updatedAt: now,
      },
    },
  );
  return await getCultureSurveyLaunchById(id);
}
