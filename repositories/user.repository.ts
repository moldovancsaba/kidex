import { getDatabase } from "@/lib/mongodb";
import { ensureInstitutionIds } from "@/lib/institutions";
import { normalizePreferredLocale } from "@/lib/locales";
import { sanitizeStoredRoles, type SupportedRuntimeRole } from "@/lib/roles";
import type { User } from "@/services/user-service";

const collectionName = "users";

function mapUser(doc: any): User {
  const institutionMembership = ensureInstitutionIds(doc.institutionIds, doc.primaryInstitutionId);
  return {
    id: doc._id.toString(),
    name: doc.name,
    email: doc.email,
    roles: sanitizeStoredRoles(doc.roles),
    institutionIds: institutionMembership.institutionIds,
    primaryInstitutionId: institutionMembership.primaryInstitutionId,
    preferredLocale: normalizePreferredLocale(doc.preferredLocale, "en"),
    googleToken: doc.googleToken
  };
}

export async function listAllUsers(): Promise<User[]> {
  const db = await getDatabase();
  const users = await db.collection(collectionName).find({}).sort({ email: 1 }).toArray();
  return users.map(mapUser);
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const db = await getDatabase();
  const doc = await db.collection(collectionName).findOne({ email: email.toLowerCase().trim() });
  return doc ? mapUser(doc) : null;
}

export async function listUsersByRole(role: SupportedRuntimeRole): Promise<User[]> {
  const db = await getDatabase();
  const users = await db.collection(collectionName)
    .find({ roles: role })
    .sort({ email: 1 })
    .toArray();
  return users.map(mapUser);
}

export async function upsertUser(user: Omit<User, "id">) {
  const db = await getDatabase();
  const normalizedEmail = user.email.toLowerCase().trim();
  const normalizedRoles = sanitizeStoredRoles(user.roles);
  const institutionMembership = ensureInstitutionIds(user.institutionIds, user.primaryInstitutionId);
  const result = await db.collection(collectionName).updateOne(
    { email: normalizedEmail },
    {
      $set: {
        ...user,
        email: normalizedEmail,
        roles: normalizedRoles,
        institutionIds: institutionMembership.institutionIds,
        primaryInstitutionId: institutionMembership.primaryInstitutionId,
        preferredLocale: normalizePreferredLocale(user.preferredLocale, "en"),
      }
    },
    { upsert: true }
  );
  return result;
}

export async function updateGoogleToken(email: string, token: any) {
  const db = await getDatabase();
  await db.collection(collectionName).updateOne(
    { email: email.toLowerCase().trim() },
    { $set: { googleToken: token } }
  );
}

export async function deleteUserByEmail(email: string) {
  const db = await getDatabase();
  await db.collection(collectionName).deleteOne({ email: email.toLowerCase().trim() });
}
