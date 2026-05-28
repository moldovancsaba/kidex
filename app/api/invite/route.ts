import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/authorization";
import { recordAuditEvent } from "@/lib/audit";
import { sendInviteEmail } from "@/services/email-service";

export async function POST(request: Request) {
  try {
    const { actor, error } = await requirePermission(request, "invites.send");
    if (error) return error;
    const { email, locale } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const inviteLink = new URL("/", request.url).toString();
    
    const { getSession } = await import("@/lib/session");
    const { findUserByEmail, updateGoogleToken } = await import("@/repositories/user.repository");
    const { refreshGoogleToken } = await import("@/services/google-auth-service");
    const { getGlobalSettings } = await import("@/repositories/settings.repository");
    
    const targetUser = await findUserByEmail(email);
    const [session, globalSettings] = await Promise.all([
      getSession(),
      getGlobalSettings()
    ]);

    let accessToken: string | undefined = undefined;
    const localeKey = ((locale as "en" | "hu" | "ar") || targetUser?.preferredLocale || "en");
    const customTemplate = globalSettings?.emailTemplates?.[localeKey];

    if (session?.email) {
      const user = await findUserByEmail(session.email);
      if (user?.googleToken) {
        accessToken = user.googleToken.access_token;

        // Refresh eagerly when possible so invite delivery does not rely on a stale cached Gmail token.
        if (user.googleToken.refresh_token) {
          try {
            const newTokens = await refreshGoogleToken(user.googleToken.refresh_token);
            accessToken = newTokens.access_token;
            await updateGoogleToken(session.email, { ...user.googleToken, ...newTokens });
          } catch (e) {
            console.error("Failed to refresh Google token:", e);
          }
        }
      }
    }
    
    const ok = await sendInviteEmail({
      to: email,
      inviteLink,
      locale: localeKey,
      accessToken,
      customTemplate
    });

    if (!ok && accessToken) {
      await recordAuditEvent({
        action: "invite.send",
        status: "failed",
        actor,
        request,
        targetType: "invite",
        targetId: email,
        targetLabel: email,
        summary: "Invitation send failed through Gmail",
        metadata: { locale: localeKey },
      });
      return NextResponse.json({ 
        error: "Gmail API failed. Check your Google Cloud Console for errors or try reconnecting.",
        debug: "Token was present but Gmail API rejected the request."
      }, { status: 500 });
    }

    if (!ok) {
      await recordAuditEvent({
        action: "invite.send",
        status: "success",
        actor,
        request,
        targetType: "invite",
        targetId: email,
        targetLabel: email,
        summary: "Invitation generated in mock mode",
        metadata: { locale: localeKey, deliveryMode: "mock" },
      });
      return NextResponse.json({ 
        success: true, 
        message: "Invite logged to console (Mock mode). Link your Gmail in Settings to send real emails." 
      });
    }

    await recordAuditEvent({
      action: "invite.send",
      status: "success",
      actor,
      request,
      targetType: "invite",
      targetId: email,
      targetLabel: email,
      summary: "Invitation email sent",
      metadata: { locale: localeKey, deliveryMode: accessToken ? "gmail" : "service" },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Invite API error:", error);
    return NextResponse.json({ error: `Failed to send invitation: ${message}` }, { status: 500 });
  }
}
