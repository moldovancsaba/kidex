import { NextResponse } from "next/server";
import { getAuthenticatedActor } from "@/lib/authorization";

export async function GET() {
  const actor = await getAuthenticatedActor();
  if (!actor?.email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { findUserByEmail } = await import("@/repositories/user.repository");
  const user = await findUserByEmail(actor.email);

  return NextResponse.json({ 
    user: {
      ...actor,
      role: actor.roles.join(","),
      isGoogleLinked: !!user?.googleToken
    }
  });
}
