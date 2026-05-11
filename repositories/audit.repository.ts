import { ObjectId } from "mongodb";
import { getDatabase } from "@/lib/mongodb";
import { toJsonId } from "@/lib/utils";

export type AuditAction =
  | "assessment.create"
  | "assessment.update"
  | "assessment.delete"
  | "assessment.restore"
  | "child.create"
  | "child.update"
  | "child.delete"
  | "child.restore"
  | "export.pdf"
  | "invite.send"
  | "media.upload"
  | "settings.update"
  | "user.delete"
  | "user.upsert";

export interface AuditLogEntry {
  _id?: string;
  action: AuditAction;
  status: "success" | "failed";
  createdAt: string;
  actorEmail?: string;
  actorName?: string;
  actorRoles?: string[];
  institutionId?: string;
  targetType?: "assessment" | "child" | "settings" | "user" | "invite" | "media" | "report";
  targetId?: string;
  targetLabel?: string;
  summary: string;
  request?: {
    method?: string;
    path?: string;
    userAgent?: string;
  };
  metadata?: Record<string, unknown>;
}

const collectionName = "audit_logs";

export async function createAuditLog(entry: Omit<AuditLogEntry, "_id">) {
  const db = await getDatabase();
  const result = await db.collection(collectionName).insertOne(entry);
  return { ...entry, _id: result.insertedId.toString() };
}

export async function listRecentAuditLogs(limit = 50): Promise<AuditLogEntry[]> {
  const db = await getDatabase();
  const logs = await db
    .collection(collectionName)
    .find({}, { projection: { action: 1, status: 1, createdAt: 1, actorEmail: 1, actorName: 1, actorRoles: 1, institutionId: 1, targetType: 1, targetId: 1, targetLabel: 1, summary: 1, request: 1, metadata: 1 } })
    .sort({ createdAt: -1, _id: -1 })
    .limit(Math.max(1, Math.min(limit, 200)))
    .toArray();

  return logs.map((log) => toJsonId(log) as unknown as AuditLogEntry);
}

export async function listRecentAuditLogsForTarget(targetId: string, limit = 50): Promise<AuditLogEntry[]> {
  const db = await getDatabase();
  const filter = ObjectId.isValid(targetId)
    ? { targetId: { $in: [targetId, new ObjectId(targetId).toString()] } }
    : { targetId };
  const logs = await db
    .collection(collectionName)
    .find(filter)
    .sort({ createdAt: -1, _id: -1 })
    .limit(Math.max(1, Math.min(limit, 200)))
    .toArray();

  return logs.map((log) => toJsonId(log) as unknown as AuditLogEntry);
}
