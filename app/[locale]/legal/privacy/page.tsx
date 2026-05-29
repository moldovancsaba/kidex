"use client";

import { useEffect, useState } from "react";
import { Button, Stack, Text } from "@mantine/core";
import { useTranslations } from "next-intl";
import { AdminPageHeader as PageHeader, SectionPanel } from "@doneisbetter/gds/client";
import { Link } from "@/i18n/navigation";
import { APP_VERSION } from "@/lib/app-version";
import { DEFAULT_KIDEX_SETTINGS, getSettings, type KidexSettings } from "@/services/settings-service";

export default function PrivacyPolicyPage() {
  const t = useTranslations("Legal");
  const [settings, setSettings] = useState<KidexSettings>(DEFAULT_KIDEX_SETTINGS);

  useEffect(() => {
    void getSettings().then(setSettings).catch(() => null);
  }, []);

  return (
    <Stack gap="md">
      <PageHeader title={t("privacyTitle")} subtitle={`${t("effectiveDate")}: ${settings.company.registered}`} />

      <SectionPanel title={t("privacyCollectionTitle")}>
        <Text size="sm">{t("privacyCollectionBody")}</Text>
      </SectionPanel>

      <SectionPanel title={t("privacyUseTitle")}>
        <Text size="sm">{t("privacyUseBody")}</Text>
      </SectionPanel>

      <SectionPanel title={t("privacyRetentionTitle")}>
        <Text size="sm">{t("privacyRetentionBody")}</Text>
      </SectionPanel>

      <SectionPanel title={t("companyDataTitle")}>
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
        <Text size="sm" mt="xs">
          <strong>App:</strong> KIDEX v{APP_VERSION}
        </Text>
      </SectionPanel>

      <Button component={Link} href="/dashboard" variant="default" style={{ alignSelf: "flex-start" }}>
        {t("backToDashboard")}
      </Button>
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
