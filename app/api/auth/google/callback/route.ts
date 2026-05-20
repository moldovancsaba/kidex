import { NextRequest, NextResponse } from "next/server";
import { exchangeGoogleCodeForTokens } from "@/services/google-auth-service";
import { cookies } from "next/headers";
import { getSession } from "@/lib/session";
import { updateGoogleToken } from "@/repositories/user.repository";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  const cookieStore = await cookies();
  const savedState = cookieStore.get("google_oauth_state")?.value;

  if (!code || !state || state !== savedState) {
    return NextResponse.json({ error: "Invalid state or code" }, { status: 400 });
  }

  try {
    const tokens = await exchangeGoogleCodeForTokens(code);
    const session = await getSession();

    if (!session?.email) {
      return NextResponse.json({ error: "No active session" }, { status: 401 });
    }

    await updateGoogleToken(session.email, tokens);
    cookieStore.delete("google_oauth_state");
    return NextResponse.redirect(new URL("/dashboard/settings", request.url));
  } catch (error) {
    console.error("Google Auth callback error:", error);
    return NextResponse.json({ error: "Google Authentication failed" }, { status: 500 });
  }
}
