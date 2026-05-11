"use client";

import { useEffect, useState, use } from "react";
import { Alert, Box, Button, Checkbox, Loader, Paper, Stack, Text, TextInput, Textarea, Title } from "@mantine/core";
import { useTranslations } from "next-intl";
import { defaultConsentPolicy, type ChildConsentPolicy, type ConsentPolicyKey } from "@/lib/consent-policy";

export default function ConsentReviewPage({
  params,
}: {
  params: Promise<{ locale: string; token: string }>;
}) {
  const { token } = use(params);
  const t = useTranslations("ConsentReview");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [childName, setChildName] = useState("");
  const [caregiverName, setCaregiverName] = useState("");
  const [consentPolicy, setConsentPolicy] = useState<ChildConsentPolicy>(defaultConsentPolicy());

  useEffect(() => {
    fetch(`/api/consent-review?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("load_failed");
        return await res.json();
      })
      .then((data) => {
        setChildName(data.child?.name || "");
        setCaregiverName(data.caregiver?.name || "");
        setConsentPolicy(data.consentPolicy || defaultConsentPolicy());
      })
      .catch(() => setError(t("loadError")))
      .finally(() => setLoading(false));
  }, [token, t]);

  function updateConsentEntry(key: ConsentPolicyKey, field: keyof ChildConsentPolicy[ConsentPolicyKey], value: string | boolean) {
    setConsentPolicy((current) => ({
      ...current,
      [key]: {
        ...current[key],
        [field]: value,
      },
    }));
  }

  async function save() {
    setSaving(true);
    setError("");
    setSuccess("");
    const response = await fetch("/api/consent-review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, consentPolicy }),
    }).catch(() => null);
    setSaving(false);
    if (!response?.ok) {
      setError(t("saveError"));
      return;
    }
    setSuccess(t("saveSuccess"));
  }

  if (loading) {
    return (
      <Box style={{ display: "flex", justifyContent: "center", paddingBlock: "3rem" }}>
        <Loader aria-label={t("loading")} />
      </Box>
    );
  }

  return (
    <Box maw={720} mx="auto" py="xl" px="md">
      <Stack gap="lg">
        <Paper withBorder p="xl" radius="lg">
          <Stack gap="md">
            <Title order={2}>{t("title")}</Title>
            <Text c="dimmed">{t("intro", { caregiver: caregiverName || t("family"), child: childName || t("child") })}</Text>
            {error ? <Alert color="red">{error}</Alert> : null}
            {success ? <Alert color="green">{success}</Alert> : null}
          </Stack>
        </Paper>

        {(["mediaCapture", "familyReport", "dataSharing", "publicity"] as ConsentPolicyKey[]).map((key) => (
          <Paper key={key} withBorder p="lg" radius="md">
            <Stack gap="sm">
              <Checkbox
                label={t(`policy.${key}.label`)}
                checked={consentPolicy[key].granted}
                onChange={(event) => updateConsentEntry(key, "granted", event.currentTarget.checked)}
              />
              <Text size="sm" c="dimmed">{t(`policy.${key}.description`)}</Text>
              <TextInput
                label={t("effectiveFrom")}
                type="date"
                value={consentPolicy[key].effectiveFrom || ""}
                onChange={(event) => updateConsentEntry(key, "effectiveFrom", event.currentTarget.value)}
              />
              <TextInput
                label={t("expiresAt")}
                type="date"
                value={consentPolicy[key].expiresAt || ""}
                onChange={(event) => updateConsentEntry(key, "expiresAt", event.currentTarget.value)}
              />
              <Textarea
                label={t("notes")}
                value={consentPolicy[key].notes}
                onChange={(event) => updateConsentEntry(key, "notes", event.currentTarget.value)}
                minRows={2}
              />
            </Stack>
          </Paper>
        ))}

        <Button color="kidex" onClick={() => void save()} loading={saving}>
          {t("save")}
        </Button>
      </Stack>
    </Box>
  );
}
