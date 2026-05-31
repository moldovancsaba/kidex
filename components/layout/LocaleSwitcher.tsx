"use client";

import { Button, Menu } from "@mantine/core";
import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";

export function LocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  function switchLocale(nextLocale: "en" | "hu" | "ar") {
    const cleanPath = pathname.replace(/^\/(en|hu|ar)(\/|$)/, "/");
    router.replace(cleanPath, { locale: nextLocale });
  }

  const localeLabel = locale === "ar" ? "AR" : locale === "hu" ? "HU" : "EN";

  return (
    <Menu shadow="md" width={170} position="bottom-end">
      <Menu.Target>
        <Button variant="default" size="sm" color="gray" style={{ minWidth: 64, fontWeight: 600 }}>
          {localeLabel}
        </Button>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item onClick={() => switchLocale("en")}>English</Menu.Item>
        <Menu.Item onClick={() => switchLocale("hu")}>Magyar</Menu.Item>
        <Menu.Item onClick={() => switchLocale("ar")}>العربية</Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
