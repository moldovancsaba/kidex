import { NextIntlClientProvider } from "next-intl";
import { cookies } from "next/headers";
import { getMessages } from "next-intl/server";
import { Noto_Sans, Noto_Sans_Arabic } from "next/font/google";
import { ColorSchemeScript } from "@mantine/core";
import { getGdsMessages } from "@doneisbetter/gds/server";
import { Providers } from "@/app/providers";
import { CookieConsentBanner } from "@/components/ui/CookieConsentBanner";
import { getKidexMantineTheme } from "@/theme/mantine-theme";
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
  const gdsMessages = getGdsMessages(locale);
  const theme = getKidexMantineTheme(direction);

  return (
    <html lang={locale} dir={direction}>
      <head>
        <ColorSchemeScript defaultColorScheme={initialMode ?? "light"} />
      </head>
      <body dir={direction} className={`${notoSans.variable} ${notoSansArabic.variable}`}>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Providers locale={locale} gdsMessages={gdsMessages} theme={theme} defaultColorScheme={initialMode}>
            {children}
            <CookieConsentBanner />
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
