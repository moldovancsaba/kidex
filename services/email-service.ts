import { sendGmailEmail } from "./gmail-service";
import { KIDEX_BRAND_COLORS } from "@/theme/brand-colors";

export interface InviteEmailParams {
  to: string;
  inviteLink: string;
  locale: "en" | "hu" | "ar";
  accessToken?: string;
  customTemplate?: { subject: string; body: string };
}

const TEMPLATES = {
  en: {
    subject: "Welcome to KIDEX - You have been invited",
    body: (link: string) => `
      <h1>Welcome to KIDEX</h1>
      <p>You have been invited to join the KIDEX Bio-Psycho-Social Sport Ecosystem.</p>
      <p>You can now log in using your email address at:</p>
      <a href="${link}" style="padding: 12px 24px; background: ${KIDEX_BRAND_COLORS.brandTeal}; color: ${KIDEX_BRAND_COLORS.white}; text-decoration: none; border-radius: 6px; display: inline-block;">Login to Dashboard</a>
      <p>If the button doesn't work, copy and paste this link: ${link}</p>
    `
  },
  hu: {
    subject: "Üdvözöljük a KIDEX-ben - Meghívót kapott",
    body: (link: string) => `
      <h1>Üdvözöljük a KIDEX-ben</h1>
      <p>Meghívást kapott a KIDEX Bio-pszicho-szociális sport ökoszisztémába.</p>
      <p>Mostantól bejelentkezhet az e-mail címével az alábbi linken:</p>
      <a href="${link}" style="padding: 12px 24px; background: ${KIDEX_BRAND_COLORS.brandTeal}; color: ${KIDEX_BRAND_COLORS.white}; text-decoration: none; border-radius: 6px; display: inline-block;">Belépés a Vezérlőpultra</a>
      <p>Ha a gomb nem működik, másolja be ezt a linket a böngészőjébe: ${link}</p>
    `
  },
  ar: {
    subject: "مرحباً بك في كيديكس - لقد تم دعوتك",
    body: (link: string) => `
      <div dir="rtl">
        <h1>مرحباً بك في كيديكس</h1>
        <p>لقد تم دعوتك للانضمام إلى نظام كيديكس الرياضي الحيوي-النفسي-الاجتماعي.</p>
        <p>يمكنك الآن تسجيل الدخول باستخدام بريدك الإلكتروني عبر الرابط التالي:</p>
        <a href="${link}" style="padding: 12px 24px; background: ${KIDEX_BRAND_COLORS.brandTeal}; color: ${KIDEX_BRAND_COLORS.white}; text-decoration: none; border-radius: 6px; display: inline-block;">تسجيل الدخول إلى لوحة التحكم</a>
        <p>إذا لم يعمل الزر، قم بنسخ ولصق هذا الرابط: ${link}</p>
      </div>
    `
  }
};

/**
 * Sends an invitation email through Gmail when an access token is available.
 * Falls back to mock console delivery when the sender has not linked Google.
 */
export async function sendInviteEmail({ to, inviteLink, locale, accessToken, customTemplate }: InviteEmailParams): Promise<boolean> {
  const template = TEMPLATES[locale] || TEMPLATES.en;
  
  let subject = customTemplate?.subject || template.subject;
  let html = customTemplate?.body || template.body(inviteLink);

  if (customTemplate) {
    html = html.replace(/{{link}}/g, inviteLink);
  }

  if (accessToken) {
    return await sendGmailEmail({
      accessToken,
      to,
      subject,
      html
    });
  }

  console.log("------------------------------------------");
  console.log(`[MOCK EMAIL] To: ${to}`);
  console.log(`[MOCK EMAIL] Subject: ${subject}`);
  console.log(`[MOCK EMAIL] Body HTML: ${html}`);
  console.log("------------------------------------------");

  return true; 
}
