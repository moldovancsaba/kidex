"use client";

import { useEffect, useState } from "react";
import { Button, Stack, Text } from "@mantine/core";
import { useTranslations } from "next-intl";
import { AdminPageHeader as PageHeader } from "@doneisbetter/gds/client";
import { Link } from "@/i18n/navigation";
import { SectionCard } from "@/components/gds-local/core";
import { APP_VERSION } from "@/lib/app-version";
import { DEFAULT_KIDEX_SETTINGS, getSettings, type KidexSettings } from "@/services/settings-service";

export default function GtcPage() {
  const t = useTranslations("Legal");
  const [settings, setSettings] = useState<KidexSettings>(DEFAULT_KIDEX_SETTINGS);

  useEffect(() => {
    void getSettings().then(setSettings).catch(() => null);
  }, []);

  return (
    <Stack gap="md">
      <PageHeader title={t("gtcTitle")} subtitle={`${t("effectiveDate")}: ${settings.company.registered}`} />

      <SectionCard title={t("scopeTitle")}>
        <Text size="sm">{t("scopeBody")}</Text>
      </SectionCard>

      <SectionCard title={t("serviceTitle")}>
        <Text size="sm">{t("serviceBody")}</Text>
      </SectionCard>

      <SectionCard title={t("responsibilityTitle")}>
        <Text size="sm">{t("responsibilityBody")}</Text>
      </SectionCard>

      <SectionCard title={t("companyDataTitle")}>
        <CompanyData settings={settings} />
        <Text size="sm" mt="xs">
          <strong>App:</strong> KIDEX v{APP_VERSION}
        </Text>
      </SectionCard>

      <Button component={Link} href="/dashboard" variant="default" style={{ alignSelf: "flex-start" }}>
        {t("backToDashboard")}
      </Button>
    </Stack>
  );
}

function CompanyData({ settings }: { settings: KidexSettings }) {
  const t = useTranslations("Legal");
  return (
    <Stack gap={6}>
      <Row label={t("companyDataTitle")} value={settings.company.name} />
      <Row label={t("idNo")} value={settings.company.ico} />
      <Row label={t("registered")} value={settings.company.registered} />
      <Row label={t("legalForm")} value={settings.company.legalForm} />
      <Row label={t("address")} value={settings.company.address} />
      <Row label={t("shareCapital")} value={settings.company.shareCapital} />
      <Row label={t("vatNo")} value={settings.company.vatNo} />
      <Row label={t("website")} value={settings.company.website} />
    </Stack>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <Text size="sm">
      <strong>{label}:</strong> {value}
    </Text>
  );
}
