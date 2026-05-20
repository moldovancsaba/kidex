import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForToken, getUserInfo } from "@/services/auth-service";
import { createSession } from "@/lib/session";
import { cookies } from "next/headers";
import { findUserByEmail, listAllUsers, upsertUser } from "@/repositories/user.repository";
import { getDatabase } from "@/lib/mongodb";
import { DEFAULT_INSTITUTION_ID } from "@/lib/institutions";
import { DEFAULT_BOOTSTRAP_ROLES, sanitizeStoredRoles } from "@/lib/roles";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  const cookieStore = await cookies();
  const savedState = cookieStore.get("oauth_state")?.value;

  if (!code || !state || state !== savedState) {
    return NextResponse.json({ error: "Invalid state or code" }, { status: 400 });
  }

  try {
    const tokens = await exchangeCodeForToken(code);
    const ssoUser = await getUserInfo(tokens.access_token);

    let localUser = await findUserByEmail(ssoUser.email);
    
    // Older bootstrap data may predate email-based identity storage.
    if (!localUser && ssoUser.name) {
      const db = await getDatabase();
      const doc = await db.collection("users").findOne({ name: ssoUser.name, email: { $exists: false } });
      if (doc) {
        console.info(`Migrating existing user ${ssoUser.name} to email ${ssoUser.email}`);
        await upsertUser({
          email: ssoUser.email,
          name: ssoUser.name,
          roles: sanitizeStoredRoles(doc.roles),
          institutionIds: [DEFAULT_INSTITUTION_ID],
          primaryInstitutionId: DEFAULT_INSTITUTION_ID
        });
        localUser = await findUserByEmail(ssoUser.email);
      }
    }

    // Bootstrap the first platform user with setup access.
    const allUsers = await listAllUsers();
    if (allUsers.length === 0) {
      console.info(`Bootstrapping first user as admin: ${ssoUser.email}`);
      await upsertUser({
        email: ssoUser.email,
        name: ssoUser.name,
        roles: [...DEFAULT_BOOTSTRAP_ROLES],
        institutionIds: [DEFAULT_INSTITUTION_ID],
        primaryInstitutionId: DEFAULT_INSTITUTION_ID
      });
      localUser = await findUserByEmail(ssoUser.email);
    }
    
    if (!localUser) {
      console.warn(`Login denied for non-whitelisted email: ${ssoUser.email}`);
      const loginUrl = new URL("/", request.url);
      loginUrl.searchParams.set("error", "access_denied");
      return NextResponse.redirect(loginUrl);
    }

    await createSession({
      id: ssoUser.id,
      email: ssoUser.email,
      name: ssoUser.name,
      role: localUser.roles.join(",") || "user",
      roles: localUser.roles,
      accessToken: tokens.access_token
    });

    cookieStore.delete("oauth_state");

    return NextResponse.redirect(new URL("/", request.url));
  } catch (error) {
    console.error("Auth callback error:", error);
    return NextResponse.json({ error: "Authentication failed" }, { status: 500 });
  }
}
