import { NextIntlClientProvider } from "next-intl";
import { cookies } from "next/headers";
import { getMessages } from "next-intl/server";
import { Noto_Sans, Noto_Sans_Arabic } from "next/font/google";
import { ThemeRegistry } from "@/components/theme/ThemeRegistry";
import { CookieConsentBanner } from "@/components/ui/CookieConsentBanner";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "../globals.css";

const notoSans = Noto_Sans({
  subsets: ["latin"],
  variable: "--font-noto-sans",
  display: "swap"
});

const notoSansArabic = Noto_Sans_Arabic({
  subsets: ["arabic"],
  variable: "--font-noto-sans-arabic",
  display: "swap"
});

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const messages = await getMessages();
  const direction = locale === "ar" ? "rtl" : "ltr";
  const cookieStore = await cookies();
  const themeCookie = cookieStore.get("kidex_theme")?.value;
  const initialMode = themeCookie === "dark" || themeCookie === "light" ? themeCookie : undefined;

  return (
    <html lang={locale} dir={direction}>
      <body dir={direction} className={`${notoSans.variable} ${notoSansArabic.variable}`}>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ThemeRegistry initialMode={initialMode}>
            {children}
            <CookieConsentBanner />
          </ThemeRegistry>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
