export const SUPPORTED_LOCALES = ["en", "hu", "ar"] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export function normalizePreferredLocale(value: unknown, fallback: SupportedLocale = "en"): SupportedLocale {
  return SUPPORTED_LOCALES.includes(value as SupportedLocale) ? (value as SupportedLocale) : fallback;
}
