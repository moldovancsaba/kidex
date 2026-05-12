import { getDatabase } from "@/lib/mongodb";
import type { CommunicationCategory, CommunicationDeliveryStatus, CommunicationPolicy } from "@/lib/communication-policy";
import { toJsonId } from "@/lib/utils";

export interface CommunicationLogEntry {
  _id?: string;
  childId: string;
  institutionId?: string;
  category: CommunicationCategory;
  subject: string;
  body: string;
  caregiverIds: string[];
  caregiverNames: string[];
  visibleToCaregivers: boolean;
  createdByUserEmail?: string;
  createdAt: string;
  deliveryStatus: CommunicationDeliveryStatus;
  policySnapshot: CommunicationPolicy;
}

const collectionName = "communication_logs";

export async function listCommunicationsByChildId(childId: string): Promise<CommunicationLogEntry[]> {
  const db = await getDatabase();
  const logs = await db.collection(collectionName)
    .find({ childId })
    .sort({ createdAt: -1, _id: -1 })
    .toArray();
  return logs.map((log) => toJsonId(log) as unknown as CommunicationLogEntry);
}

export async function createCommunicationLog(entry: Omit<CommunicationLogEntry, "_id">): Promise<CommunicationLogEntry> {
  const db = await getDatabase();
  const result = await db.collection(collectionName).insertOne(entry);
  return { ...entry, _id: result.insertedId.toString() };
}
