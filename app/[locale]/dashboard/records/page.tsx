"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge, Box, Button, Group, Modal, Stack, Text, TextInput } from "@mantine/core";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LoadingState } from "@/components/ui/LoadingState";
import { canPerformAction } from "@/lib/permissions";
import { formatScore } from "@/lib/utils";
import { DataToolbar, ProductCard, SectionCard } from "@/components/gds-local/core";
import { PageHeader, ResponsiveDataView } from "@/components/gds-local/admin";
import type { AssessmentRecord } from "@/types/assessment";
import type { SupportedRuntimeRole } from "@/lib/roles";

export default function RecordsPage() {
  const t = useTranslations("Dashboard");
  const ta = useTranslations("Assessment");
  const tc = useTranslations("Common");
  const { locale } = useParams();
  const [savedRecords, setSavedRecords] = useState<AssessmentRecord[]>([]);
  const [deletedRecords, setDeletedRecords] = useState<AssessmentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [showDeleted, setShowDeleted] = useState(false);
  const [restoreTargetId, setRestoreTargetId] = useState<string | null>(null);
  const [restoreConfirmText, setRestoreConfirmText] = useState("");
  const [roles, setRoles] = useState<SupportedRuntimeRole[]>([]);

  useEffect(() => {
    void (async () => {
      const [response, deletedResponse, meResponse] = await Promise.all([
        fetch("/api/assessments").catch(() => null),
        fetch("/api/assessments?deleted=true").catch(() => null),
        fetch("/api/auth/me").catch(() => null),
      ]);
      if (!response?.ok) {
        setLoading(false);
        return;
      }
      const data = (await response.json()) as { assessments?: AssessmentRecord[] };
      setSavedRecords(data.assessments || []);
      if (deletedResponse?.ok) {
        const deletedData = (await deletedResponse.json()) as { assessments?: AssessmentRecord[] };
        setDeletedRecords(deletedData.assessments || []);
      }
      if (meResponse?.ok) {
        const meData = await meResponse.json() as { user?: { roles?: SupportedRuntimeRole[] } };
        setRoles(meData.user?.roles || []);
      }
      setLoading(false);
    })();
  }, []);

  const canWriteAssessments = canPerformAction(roles, "assessments.write");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const source = showDeleted ? deletedRecords : savedRecords;
    if (!q) return source;
    return source.filter(r =>
      r.child.name.toLowerCase().includes(q) || 
      r.session.location?.toLowerCase().includes(q) ||
      r.session.date.includes(q)
    );
  }, [savedRecords, deletedRecords, query, showDeleted]);

  async function restoreAssessment(id?: string) {
    if (!id) return;
    const res = await fetch(`/api/assessments/${id}`, { method: "POST" }).catch(() => null);
    if (!res?.ok) return;
    const restored = deletedRecords.find((r) => r._id === id);
    if (restored) setSavedRecords((prev) => [restored, ...prev]);
    setDeletedRecords((prev) => prev.filter((r) => r._id !== id));
    setRestoreTargetId(null);
    setRestoreConfirmText("");
  }

  if (loading) {
    return <LoadingState label={tc("loading")} minHeight="12rem" />;
  }

  return (
    <Stack gap="md">
      <PageHeader
        title={t("records")}
        primaryAction={
          canWriteAssessments ? (
            <Button variant={showDeleted ? "filled" : "default"} color={showDeleted ? "red" : "gray"} onClick={() => setShowDeleted((v) => !v)}>
              {showDeleted ? t("showingDeleted") : t("showDeleted")}
            </Button>
          ) : null
        }
      />
      <SectionCard>
        <ResponsiveDataView
          data={filtered}
          emptyTitle={query ? t("noRecordsMatch") : ta("noHistory")}
          emptyDescription={query ? t("searchRecordsPlaceholder") : ta("noHistory")}
          toolbar={
            <DataToolbar
              searchSlot={
                <TextInput
                  label={t("searchRecords")}
                  placeholder={t("searchRecordsPlaceholder")}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              }
            />
          }
          renderCard={(item) => {
            const record = item as unknown as AssessmentRecord;
            return (
              <ProductCard
                title={record.child.name || "---"}
                description={`${record.session.date}${record.session.location ? ` · ${record.session.location}` : ""}`}
                status={
                  <Badge color="kidex" variant="filled" size="lg">
                    SKI: {formatScore(record.computed.ski)}
                  </Badge>
                }
                metadata={[
                  { label: tc("date"), value: record.session.date },
                  { label: t("location"), value: record.session.location || "—" },
                ]}
                onClick={!showDeleted ? () => (window.location.href = `/${locale}/dashboard/records/${record._id}`) : undefined}
                primaryAction={
                  !showDeleted ? (
                    <Group gap="sm">
                      <Button component={Link} href={`/dashboard/records/${record._id}`} variant="default" size="sm" onClick={(e) => e.stopPropagation()}>
                        {tc("view")}
                      </Button>
                      {canWriteAssessments ? (
                        <Button component={Link} href={`/dashboard/assessment?id=${record._id}`} color="kidex" variant="light" size="sm" onClick={(e) => e.stopPropagation()}>
                          {tc("update")}
                        </Button>
                      ) : null}
                    </Group>
                  ) : (
                    <Button
                      color="kidex"
                      variant="light"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setRestoreTargetId(record._id || null);
                        setRestoreConfirmText("");
                      }}
                    >
                      {t("restoreAction")}
                    </Button>
                  )
                }
              />
            );
          }}
          renderDesktop={(items) => (
            <Stack gap="md">
              {items.map((item) => (
                <Box key={(item as unknown as AssessmentRecord)._id}>
                  {(
                    <ProductCard
                      title={(item as unknown as AssessmentRecord).child.name || "---"}
                      description={`${(item as unknown as AssessmentRecord).session.date}${(item as unknown as AssessmentRecord).session.location ? ` · ${(item as unknown as AssessmentRecord).session.location}` : ""}`}
                      status={
                        <Badge color="kidex" variant="filled" size="lg">
                          SKI: {formatScore((item as unknown as AssessmentRecord).computed.ski)}
                        </Badge>
                      }
                      metadata={[
                        { label: tc("date"), value: (item as unknown as AssessmentRecord).session.date },
                        { label: t("location"), value: (item as unknown as AssessmentRecord).session.location || "—" },
                      ]}
                      onClick={!showDeleted ? () => (window.location.href = `/${locale}/dashboard/records/${(item as unknown as AssessmentRecord)._id}`) : undefined}
                      primaryAction={
                        !showDeleted ? (
                          <Group gap="sm">
                            <Button component={Link} href={`/dashboard/records/${(item as unknown as AssessmentRecord)._id}`} variant="default" size="sm" onClick={(e) => e.stopPropagation()}>
                              {tc("view")}
                            </Button>
                            {canWriteAssessments ? (
                              <Button component={Link} href={`/dashboard/assessment?id=${(item as unknown as AssessmentRecord)._id}`} color="kidex" variant="light" size="sm" onClick={(e) => e.stopPropagation()}>
                                {tc("update")}
                              </Button>
                            ) : null}
                          </Group>
                        ) : (
                          <Button
                            color="kidex"
                            variant="light"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setRestoreTargetId((item as unknown as AssessmentRecord)._id || null);
                              setRestoreConfirmText("");
                            }}
                          >
                            {t("restoreAction")}
                          </Button>
                        )
                      }
                    />
                  )}
                </Box>
              ))}
            </Stack>
          )}
          getRowKey={(item) => (item as unknown as AssessmentRecord)._id || `${(item as unknown as AssessmentRecord).child.name}-${(item as unknown as AssessmentRecord).session.date}`}
        />
      </SectionCard>
      <Modal opened={canWriteAssessments && Boolean(restoreTargetId)} onClose={() => setRestoreTargetId(null)} title={t("restoreAssessment")} centered>
        <Stack gap="md">
          <Text size="sm">{t("typeRestoreAssessmentToConfirm")}</Text>
          <TextInput value={restoreConfirmText} onChange={(e) => setRestoreConfirmText(e.currentTarget.value)} placeholder="restore" />
          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => setRestoreTargetId(null)}>{tc("cancel")}</Button>
            <Button color="kidex" disabled={restoreConfirmText.trim().toLowerCase() !== "restore" || !restoreTargetId} onClick={() => void restoreAssessment(restoreTargetId || undefined)}>{t("restoreAction")}</Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
