import { getDatabase } from "@/lib/mongodb";
import { toJsonId } from "@/lib/utils";
import type { DevelopmentPlan } from "@/lib/development-plans";

const collectionName = "development_plans";

export async function getLatestDevelopmentPlanByChildId(childId: string): Promise<DevelopmentPlan | null> {
  const db = await getDatabase();
  const plan = await db.collection(collectionName).findOne({ childId }, { sort: { updatedAt: -1, createdAt: -1 } });
  return plan ? (toJsonId(plan) as unknown as DevelopmentPlan) : null;
}

export async function listLatestDevelopmentPlans(): Promise<DevelopmentPlan[]> {
  const db = await getDatabase();
  const plans = await db.collection(collectionName).aggregate([
    { $sort: { updatedAt: -1, createdAt: -1 } },
    {
      $group: {
        _id: "$childId",
        latest: { $first: "$$ROOT" },
      },
    },
    { $replaceRoot: { newRoot: "$latest" } },
  ]).toArray();
  return plans.map((plan) => toJsonId(plan) as unknown as DevelopmentPlan);
}

export async function upsertDevelopmentPlanByChildId(
  childId: string,
  plan: Omit<DevelopmentPlan, "_id" | "createdAt" | "updatedAt"> & Partial<Pick<DevelopmentPlan, "createdAt" | "updatedAt">>,
): Promise<DevelopmentPlan> {
  const db = await getDatabase();
  const existing = await getLatestDevelopmentPlanByChildId(childId);
  const now = new Date().toISOString();
  if (existing?._id) {
    await db.collection(collectionName).updateOne(
      { _id: existing._id as any },
      {
        $set: {
          ...plan,
          childId,
          updatedAt: now,
        },
      },
    );
    return {
      ...existing,
      ...plan,
      childId,
      updatedAt: now,
    };
  }

  const nextPlan = {
    ...plan,
    childId,
    createdAt: plan.createdAt || now,
    updatedAt: now,
  };
  const result = await db.collection(collectionName).insertOne(nextPlan);
  return { ...(nextPlan as DevelopmentPlan), _id: result.insertedId.toString() };
}
