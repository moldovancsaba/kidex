import { getDatabase } from "@/lib/mongodb";
import { toJsonId } from "@/lib/utils";
import type { ChildSupportWorkspace } from "@/lib/support-workspace";

const collectionName = "child_support_workspaces";

export async function getSupportWorkspaceByChildId(childId: string): Promise<ChildSupportWorkspace | null> {
  const db = await getDatabase();
  const workspace = await db.collection(collectionName).findOne({ childId });
  return workspace ? (toJsonId(workspace) as unknown as ChildSupportWorkspace) : null;
}

export async function upsertSupportWorkspaceByChildId(
  childId: string,
  workspace: Omit<ChildSupportWorkspace, "_id" | "createdAt" | "updatedAt"> & Partial<Pick<ChildSupportWorkspace, "createdAt" | "updatedAt">>,
): Promise<ChildSupportWorkspace> {
  const db = await getDatabase();
  const existing = await getSupportWorkspaceByChildId(childId);
  const now = new Date().toISOString();

  if (existing?._id) {
    await db.collection(collectionName).updateOne(
      { _id: existing._id as any },
      {
        $set: {
          ...workspace,
          childId,
          updatedAt: now,
        },
      },
    );

    return {
      ...existing,
      ...workspace,
      childId,
      updatedAt: now,
    };
  }

  const nextWorkspace = {
    ...workspace,
    childId,
    createdAt: workspace.createdAt || now,
    updatedAt: now,
  };
  const result = await db.collection(collectionName).insertOne(nextWorkspace);
  return { ...(nextWorkspace as ChildSupportWorkspace), _id: result.insertedId.toString() };
}
