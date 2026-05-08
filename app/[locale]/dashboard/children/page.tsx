"use client";

import { useEffect, useMemo, useState } from "react";
import { Alert, Badge, Box, Button, Checkbox, Group, Loader, Modal, MultiSelect, Paper, RangeSlider, Select, Stack, Text, TextInput, Textarea } from "@mantine/core";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionCard } from "@/components/ui/SectionCard";
import { calculateAgeGroup } from "@/lib/utils/age";
import { formatScore } from "@/lib/utils";
import type { ChildProfile } from "@/repositories/child.repository";
import { PdfService } from "@/lib/pdf-service";
import { getUsers } from "@/services/user-service";
import { withDisplayNamesForReport } from "@/lib/report-user-display";
import { logPdfExportTelemetry, validatePdfExport } from "@/lib/pdf-export-guards";
import type { AssessmentRecord } from "@/types/assessment";

export default function ChildrenListPage() {
  const t = useTranslations("Dashboard");
  const tc = useTranslations("Common");
  const ta = useTranslations("Assessment");
  const ts = useTranslations("Schema");
  const tr = useTranslations("Report");
  const { locale } = useParams();

  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [editing, setEditing] = useState<ChildProfile | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftBirthDate, setDraftBirthDate] = useState("");
  const [draftKnownTraits, setDraftKnownTraits] = useState("");
  const [draftParentSignals, setDraftParentSignals] = useState("");
  const [draftAgeGroup, setDraftAgeGroup] = useState<"" | "4-6" | "7-9" | "10-12">("");
  const [draftConsentPhoto, setDraftConsentPhoto] = useState(false);
  const [draftConsentReport, setDraftConsentReport] = useState(false);
  const [saving, setSaving] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [locations, setLocations] = useState<string[]>([]);
  
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [selectedAgeGroups, setSelectedAgeGroups] = useState<string[]>([]);
  const [skiRange, setSkiRange] = useState<[number, number]>([0, 100]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ChildProfile | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deletedChildren, setDeletedChildren] = useState<ChildProfile[]>([]);
  const [showDeleted, setShowDeleted] = useState(false);
  const [restoreTarget, setRestoreTarget] = useState<ChildProfile | null>(null);
  const [restoreConfirmText, setRestoreConfirmText] = useState("");

  useEffect(() => {
    let active = true;

    void (async () => {
      const [cRes, sRes] = await Promise.all([
        fetch("/api/children?metrics=true").catch(() => null),
        fetch("/api/settings").catch(() => null)
      ]);
      const dcRes = await fetch("/api/children?deleted=true").catch(() => null);
      
      if (!active) return;

      if (cRes?.ok) {
        const data = (await cRes.json()) as ChildProfile[];
        setChildren(data);
      }
      if (dcRes?.ok) {
        const d = (await dcRes.json()) as ChildProfile[];
        setDeletedChildren(Array.isArray(d) ? d : []);
      }
      
      if (sRes?.ok) {
        const data = await sRes.json();
        setLocations(data.locations || []);
      }
      
      setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, []);

  const downloadLatestMap = async (childId?: string, latestRecordId?: string) => {
    if (!childId || !latestRecordId) return;
    const startedAt = new Date().getTime();
    setDownloadingId(childId);
    try {
      const [aRes, hRes] = await Promise.all([
        fetch(`/api/assessments/${latestRecordId}`),
        fetch(`/api/children/${childId}/history`)
      ]);

      if (!aRes.ok) throw new Error("Failed to fetch assessment");
      
      const { assessment } = (await aRes.json()) as { assessment: AssessmentRecord };
      const historyData = hRes.ok ? (await hRes.json()).assessments : [];
      const validation = validatePdfExport(assessment, historyData);
      if (validation.warnings.length > 0) console.warn("PDF export warnings:", validation.warnings);
      
      const users = await getUsers();
      const printableRecord = withDisplayNamesForReport(assessment, users);
      await PdfService.generateMapReport(printableRecord, ta, tc, ts, tr, historyData);
      logPdfExportTelemetry({
        status: "success",
        format: "map",
        childId,
        recordId: assessment._id,
        durationMs: new Date().getTime() - startedAt,
        warnings: validation.warnings
      });
    } catch (err) {
      console.error(err);
      logPdfExportTelemetry({
        status: "failed",
        format: "map",
        childId,
        recordId: latestRecordId,
        durationMs: new Date().getTime() - startedAt,
        error: err instanceof Error ? err.message : "unknown"
      });
      setMessage(tc("error"));
      setError(true);
    } finally {
      setDownloadingId(null);
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    
    const source = showDeleted ? deletedChildren : children;
    return source.filter((child) => {
      const ageGroup = calculateAgeGroup(child.birthDate) || "";
      
      const matchesQuery = !q || 
        child.name.toLowerCase().includes(q) ||
        child.birthDate.toLowerCase().includes(q) ||
        ageGroup.toLowerCase().includes(q);
      
      if (!matchesQuery) return false;

      if (selectedLocations.length > 0 && (!child.latestLocation || !selectedLocations.includes(child.latestLocation))) {
        return false;
      }

      if (selectedAgeGroups.length > 0 && !selectedAgeGroups.includes(ageGroup)) {
        return false;
      }

      const ski = child.latestSki ?? 0;
      if (ski < skiRange[0] || ski > skiRange[1]) {
        return false;
      }

      return true;
    });
  }, [children, deletedChildren, query, selectedLocations, selectedAgeGroups, skiRange, showDeleted]);

  async function restoreChild(child: ChildProfile) {
    if (!child._id) return;
    const res = await fetch(`/api/children/${child._id}/restore`, { method: "POST" }).catch(() => null);
    if (!res?.ok) return;
    setDeletedChildren((prev) => prev.filter((x) => x._id !== child._id));
    setChildren((prev) => [...prev, child].sort((a, b) => a.name.localeCompare(b.name)));
    setRestoreTarget(null);
    setRestoreConfirmText("");
  }

  const allAgeGroups = useMemo(() => {
    const groups = new Set<string>();
    children.forEach(c => {
      const g = calculateAgeGroup(c.birthDate);
      if (g) groups.add(g);
    });
    return Array.from(groups).sort();
  }, [children]);

  function startEdit(child: ChildProfile) {
    setEditing(child);
    setDraftName(child.name);
    setDraftBirthDate(child.birthDate);
    setDraftKnownTraits(child.knownTraits || "");
    setDraftParentSignals(child.parentSignals || "");
    setDraftAgeGroup((child.ageGroup || calculateAgeGroup(child.birthDate) || "") as "" | "4-6" | "7-9" | "10-12");
    setDraftConsentPhoto(Boolean(child.consentPhoto));
    setDraftConsentReport(Boolean(child.consentReport));
  }

  function startCreate() {
    setCreateOpen(true);
    setDraftName("");
    setDraftBirthDate("");
    setDraftKnownTraits("");
    setDraftParentSignals("");
    setDraftAgeGroup("");
    setDraftConsentPhoto(false);
    setDraftConsentReport(false);
  }

  async function saveEdit() {
    if (!editing?._id || !draftName.trim() || !draftBirthDate.trim()) {
      return;
    }

    setSaving(true);
    const response = await fetch(`/api/children/${editing._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: draftName,
        birthDate: draftBirthDate,
        ageGroup: draftAgeGroup || calculateAgeGroup(draftBirthDate) || "",
        consentPhoto: draftConsentPhoto,
        consentReport: draftConsentReport,
        dominantHand: editing.dominantHand || "",
        dominantEye: editing.dominantEye || "",
        dominantFoot: editing.dominantFoot || "",
        knownTraits: draftKnownTraits,
        parentSignals: draftParentSignals
      })
    }).catch(() => null);
    setSaving(false);

    if (!response?.ok) {
      setError(true);
      setMessage(tc("error"));
      return;
    }

    const updated = (await response.json()) as ChildProfile;
    setChildren((current) => current.map((child) => (child._id === updated._id ? updated : child)));
    setEditing(null);
    setError(false);
    setMessage(tc("success"));
  }

  async function createChild() {
    if (!draftName.trim() || !draftBirthDate.trim()) return;
    setSaving(true);
    const response = await fetch("/api/children", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: draftName,
        birthDate: draftBirthDate,
        ageGroup: draftAgeGroup || calculateAgeGroup(draftBirthDate) || "",
        consentPhoto: draftConsentPhoto,
        consentReport: draftConsentReport,
        dominantHand: "",
        dominantEye: "",
        dominantFoot: "",
        knownTraits: draftKnownTraits,
        parentSignals: draftParentSignals
      })
    }).catch(() => null);
    setSaving(false);
    if (!response?.ok) {
      setError(true);
      setMessage(tc("error"));
      return;
    }
    const created = (await response.json()) as ChildProfile;
    setChildren((current) => [...current, created].sort((a, b) => a.name.localeCompare(b.name)));
    setCreateOpen(false);
    setError(false);
    setMessage(tc("success"));
  }

  async function deleteChild(child: ChildProfile) {
    if (!child._id) return;
    const response = await fetch(`/api/children/${child._id}`, { method: "DELETE" }).catch(() => null);
    if (!response?.ok) {
      setError(true);
      setMessage(tc("error"));
      return;
    }

    setChildren((current) => current.filter((item) => item._id !== child._id));
    setError(false);
    setMessage(t("childDeleted"));
  }

  if (loading) {
    return (
      <Box style={{ display: "flex", justifyContent: "center", paddingBlock: "2rem" }} role="status">
        <Loader aria-label={tc("loading")} />
      </Box>
    );
  }

  return (
    <Stack gap="md">
      <PageHeader title={t("children")} actions={<Group><Button variant={showDeleted ? "filled" : "default"} color={showDeleted ? "red" : "gray"} onClick={() => setShowDeleted((v) => !v)}>{showDeleted ? t("showingDeleted") : t("showDeleted")}</Button><Button color="kidex" onClick={startCreate}>{t("addChild")}</Button></Group>} />
      <SectionCard>
        <Stack gap="md">
          {message ? (
            <Alert color={error ? "red" : "kidex"} withCloseButton onClose={() => setMessage("")}>
              {message}
            </Alert>
          ) : null}

          <Group align="end" gap="xs">
            <TextInput
              label={t("searchChildren")}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("searchChildrenPlaceholder")}
              style={{ flex: 1 }}
            />
            <Button variant="light" color="gray" onClick={() => setShowAdvanced(!showAdvanced)}>
              {showAdvanced ? tc("hideFilters") : tc("advancedFilters")}
            </Button>
          </Group>

          {showAdvanced && (
            <Paper withBorder p="md">
              <Stack gap="md">
                <Group grow align="start">
                  <MultiSelect
                    label={t("location")}
                    placeholder={tc("all")}
                    data={locations}
                    value={selectedLocations}
                    onChange={setSelectedLocations}
                    clearable
                    searchable
                  />
                  <MultiSelect
                    label={ta("ageGroup")}
                    placeholder={tc("all")}
                    data={allAgeGroups}
                    value={selectedAgeGroups}
                    onChange={setSelectedAgeGroups}
                    clearable
                  />
                </Group>
                <Box>
                  <Text size="sm" fw={500} mb="xs">SKI Score Range: {skiRange[0]} - {skiRange[1]}</Text>
                  <RangeSlider
                    min={0}
                    max={100}
                    step={1}
                    value={skiRange}
                    onChange={setSkiRange}
                    label={null}
                    color="kidex"
                  />
                </Box>
                <Group justify="flex-end">
                  <Button variant="subtle" size="sm" onClick={() => {
                    setSelectedLocations([]);
                    setSelectedAgeGroups([]);
                    setSkiRange([0, 100]);
                  }}>
                    {tc("resetFilters")}
                  </Button>
                </Group>
              </Stack>
            </Paper>
          )}

          {filtered.length === 0 ? (
            <Text c="dimmed" fs="italic">{query ? t("noChildrenMatch") : tc("noChildren")}</Text>
          ) : (
            <Stack gap="md">
              {filtered.map((child) => {
                const ageGroup = calculateAgeGroup(child.birthDate) || "-";
                return (
                  <Paper 
                    key={child._id} 
                    withBorder 
                    p="md"
                    radius="md"
                    onClick={() => !showDeleted && (window.location.href = `/${locale}/dashboard/children/${child._id}`)}
                    style={{ cursor: "pointer" }}
                  >
                    <Stack gap="md">
                      <Box>
                        <Text
                          component={Link}
                          href={`/dashboard/children/${child._id}`}
                          fw={800}
                          size="lg"
                          color="kidex"
                          style={{ textDecoration: "none" }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {child.name}
                        </Text>
                        <Text size="sm" c="dimmed">
                          {ta("birthDate")}: {child.birthDate} · {ta("ageGroup")}: {ageGroup}
                        </Text>
                        {child.latestSki !== undefined && (
                          <Group gap="xs" mt={8}>
                            <Badge color="kidex" variant="filled" size="sm">
                              LATEST SKI: {formatScore(child.latestSki)}
                            </Badge>
                            <Badge color="blue" variant="light" size="sm">
                              AVG SKI: {formatScore(child.avgSki)}
                            </Badge>
                            {child.latestLocation && (
                              <Text size="sm" c="dimmed" fw={500}>
                                @{child.latestLocation}
                              </Text>
                            )}
                          </Group>
                        )}
                      </Box>
                      <Group gap="sm">
                        {!showDeleted ? <Button component={Link} href={`/dashboard/assessment?childId=${child._id}`} color="kidex" size="sm" onClick={(e) => e.stopPropagation()}>
                          {t("newSurveyForChild")}
                        </Button> : null}
                        {child.latestRecordId && (
                          <Button 
                            variant="outline" 
                            color="kidex" 
                            size="sm"
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              void downloadLatestMap(child._id, child.latestRecordId); 
                            }}
                            loading={downloadingId === child._id}
                          >
                            {t("downloadPdf")}
                          </Button>
                        )}
                        {!showDeleted ? <Button component={Link} href={`/dashboard/children/${child._id}`} variant="default" size="sm" onClick={(e) => e.stopPropagation()}>
                          {t("viewHistory")}
                        </Button> : null}
                        {!showDeleted ? <Button variant="subtle" color="gray" size="sm" onClick={(e) => { e.stopPropagation(); startEdit(child); }}>
                          {t("editChild")}
                        </Button> : null}
                        {!showDeleted ? <Button color="red" variant="filled" size="sm" onClick={(e) => { e.stopPropagation(); setDeleteTarget(child); setDeleteConfirmText(""); }}>
                          {t("deleteChild")}
                        </Button> : <Button color="kidex" variant="light" size="sm" onClick={(e) => { e.stopPropagation(); setRestoreTarget(child); setRestoreConfirmText(""); }}>{t("restoreAction")}</Button>}
                      </Group>
                    </Stack>
                  </Paper>
                );
              })}
            </Stack>
          )}
        </Stack>
      </SectionCard>
      <Modal opened={Boolean(editing)} onClose={() => (saving ? null : setEditing(null))} title={t("editChild")} centered>
          <Stack gap="md" mt="xs">
            <TextInput
              label={ta("childName")}
              value={draftName}
              onChange={(event) => setDraftName(event.target.value)}
            />
            <TextInput
              label={ta("birthDate")}
              type="date"
              value={draftBirthDate}
              onChange={(event) => setDraftBirthDate(event.target.value)}
            />
            <Select label={ta("ageGroup")} value={draftAgeGroup} onChange={(v) => setDraftAgeGroup(parseAgeGroup(v))} data={[{ value: "", label: ta("ageGroupPending") }, { value: "4-6", label: "4-6" }, { value: "7-9", label: "7-9" }, { value: "10-12", label: "10-12" }]} />
            <Textarea label={ta("knownTraits")} value={draftKnownTraits} onChange={(event) => setDraftKnownTraits(event.target.value)} minRows={2} />
            <Textarea label={ta("parentSignals")} value={draftParentSignals} onChange={(event) => setDraftParentSignals(event.target.value)} minRows={2} />
            <Group>
              <Checkbox label={ta("consentPhoto")} checked={draftConsentPhoto} onChange={(event) => setDraftConsentPhoto(event.currentTarget.checked)} />
              <Checkbox label={ta("consentReport")} checked={draftConsentReport} onChange={(event) => setDraftConsentReport(event.currentTarget.checked)} />
            </Group>
          </Stack>
          <Group justify="flex-end" mt="md">
          <Button variant="subtle" onClick={() => setEditing(null)} disabled={saving}>
            {tc("cancel")}
          </Button>
          <Button onClick={() => void saveEdit()} color="kidex" disabled={saving || !draftName.trim() || !draftBirthDate.trim()}>
            {saving ? tc("saving") : tc("save")}
          </Button>
        </Group>
      </Modal>
      <Modal opened={createOpen} onClose={() => (saving ? null : setCreateOpen(false))} title={t("addChild")} centered>
        <Stack gap="md" mt="xs">
          <TextInput label={ta("childName")} value={draftName} onChange={(event) => setDraftName(event.target.value)} />
          <TextInput label={ta("birthDate")} type="date" value={draftBirthDate} onChange={(event) => setDraftBirthDate(event.target.value)} />
          <Select label={ta("ageGroup")} value={draftAgeGroup} onChange={(v) => setDraftAgeGroup(parseAgeGroup(v))} data={[{ value: "", label: ta("ageGroupPending") }, { value: "4-6", label: "4-6" }, { value: "7-9", label: "7-9" }, { value: "10-12", label: "10-12" }]} />
          <Textarea label={ta("knownTraits")} value={draftKnownTraits} onChange={(event) => setDraftKnownTraits(event.target.value)} minRows={2} />
          <Textarea label={ta("parentSignals")} value={draftParentSignals} onChange={(event) => setDraftParentSignals(event.target.value)} minRows={2} />
          <Group>
            <Checkbox label={ta("consentPhoto")} checked={draftConsentPhoto} onChange={(event) => setDraftConsentPhoto(event.currentTarget.checked)} />
            <Checkbox label={ta("consentReport")} checked={draftConsentReport} onChange={(event) => setDraftConsentReport(event.currentTarget.checked)} />
          </Group>
          <Group justify="flex-end" mt="sm">
            <Button variant="subtle" onClick={() => setCreateOpen(false)} disabled={saving}>{tc("cancel")}</Button>
            <Button color="kidex" onClick={() => void createChild()} disabled={saving || !draftName.trim() || !draftBirthDate.trim()}>{saving ? tc("saving") : tc("save")}</Button>
          </Group>
        </Stack>
      </Modal>
      <Modal opened={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} title={t("deleteChild")} centered>
        <Stack gap="md">
          <Text size="sm">
            {t("deleteChildConfirm", { name: deleteTarget?.name || "" })}
          </Text>
          <Text size="sm" c="dimmed">{t("typeDeleteToConfirm")}</Text>
          <TextInput value={deleteConfirmText} onChange={(e) => setDeleteConfirmText(e.currentTarget.value)} placeholder="delete" />
          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => setDeleteTarget(null)}>{tc("cancel")}</Button>
            <Button
              color="red"
              disabled={deleteConfirmText.trim().toLowerCase() !== "delete" || !deleteTarget}
              onClick={() => {
                if (!deleteTarget) return;
                void deleteChild(deleteTarget);
                setDeleteTarget(null);
              }}
            >
              {t("deleteChild")}
            </Button>
          </Group>
        </Stack>
      </Modal>
      <Modal opened={Boolean(restoreTarget)} onClose={() => setRestoreTarget(null)} title={t("restoreChild")} centered>
        <Stack gap="md">
          <Text size="sm">{t("typeRestoreToConfirm")}</Text>
          <TextInput value={restoreConfirmText} onChange={(e) => setRestoreConfirmText(e.currentTarget.value)} placeholder="restore" />
          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => setRestoreTarget(null)}>{tc("cancel")}</Button>
            <Button color="kidex" disabled={restoreConfirmText.trim().toLowerCase() !== "restore" || !restoreTarget} onClick={() => restoreTarget && void restoreChild(restoreTarget)}>{t("restoreAction")}</Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
  const parseAgeGroup = (value: string | null): "" | "4-6" | "7-9" | "10-12" => (
    value === "4-6" || value === "7-9" || value === "10-12" ? value : ""
  );
