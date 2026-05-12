"use client";

import { useEffect, useMemo, useState, use } from "react";
import { Alert, Badge, Box, Button, Checkbox, Group, Loader, Modal, MultiSelect, Paper, Select, SimpleGrid, Stack, Table, Text, TextInput, Textarea, useMantineTheme } from "@mantine/core";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip } from "recharts";
import { PageHeader } from "@/components/ui/PageHeader";
import { rapidSections } from "@/lib/kidex-schema";
import { calculateTrend } from "@/lib/utils/trends";
import { formatScore } from "@/lib/utils";
import { PdfService } from "@/lib/pdf-service";
import { getUsers } from "@/services/user-service";
import { withDisplayNamesForReport } from "@/lib/report-user-display";
import { logPdfExportTelemetry, validatePdfExport } from "@/lib/pdf-export-guards";
import { SectionCard } from "@/components/ui/SectionCard";
import { getDomainMainColor, type AssessmentDomain } from "@/lib/domain-colors";
import { LongitudinalChart } from "@/components/analytics/LongitudinalChart";
import { BenchmarkChart } from "@/components/analytics/BenchmarkChart";
import { SparklineChart } from "@/components/analytics/SparklineChart";
import { canPerformAction } from "@/lib/permissions";
import { buildRecommendationSummary } from "@/lib/recommendations";
import { buildSuggestedDevelopmentPlan, type DevelopmentPlan } from "@/lib/development-plans";
import { getConsentAlerts, hasActiveConsent } from "@/lib/consent-policy";
import { getStandardForAssessment } from "@/lib/standards";
import type { CommunicationLogEntry } from "@/repositories/communication.repository";
import type { AssessmentRecord } from "@/types/assessment";
import type { ChildProfile } from "@/repositories/child.repository";
import type { SupportedRuntimeRole } from "@/lib/roles";
import type { KidexSettings } from "@/services/settings-service";
import { buildDefaultSupportWorkspace, buildSupportWorkspaceSummary, refreshMicroLearning, type ChildSupportWorkspace, type EvidenceMediaType, type ReferralUrgency } from "@/lib/support-workspace";

const RADAR_CHART_HEIGHT = 220;
const RADAR_TICK_FONT_SIZE = 12;
const CHART_FONT_FAMILY = 'var(--font-noto-sans), "Noto Sans", Helvetica, Arial, sans-serif';

export default function ChildHistoryPage({ params }: { params: Promise<{ id: string; locale: string }> }) {
  const { id, locale } = use(params);
  const t = useTranslations("Assessment");
  const tc = useTranslations("Common");
  const ts = useTranslations("Schema");
  const td = useTranslations("Dashboard");
  const tr = useTranslations("Report");

  const [data, setData] = useState<{ child: ChildProfile; assessments: AssessmentRecord[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deletingSurvey, setDeletingSurvey] = useState(false);
  const [roles, setRoles] = useState<SupportedRuntimeRole[]>([]);
  const [settings, setSettings] = useState<KidexSettings | null>(null);
  const [plan, setPlan] = useState<DevelopmentPlan | null>(null);
  const [savingPlan, setSavingPlan] = useState(false);
  const [supportWorkspace, setSupportWorkspace] = useState<ChildSupportWorkspace | null>(null);
  const [supportWorkspaceLoaded, setSupportWorkspaceLoaded] = useState(false);
  const [savingSupportWorkspace, setSavingSupportWorkspace] = useState(false);
  const [consentLinkModalOpen, setConsentLinkModalOpen] = useState(false);
  const [generatedConsentLink, setGeneratedConsentLink] = useState("");
  const [consentLinkTarget, setConsentLinkTarget] = useState<{ id: string; name: string } | null>(null);
  const [communications, setCommunications] = useState<CommunicationLogEntry[]>([]);
  const [communicationCategory, setCommunicationCategory] = useState<"internal_note" | "caregiver_update" | "family_announcement">("internal_note");
  const [communicationSubject, setCommunicationSubject] = useState("");
  const [communicationBody, setCommunicationBody] = useState("");
  const [communicationCaregiverIds, setCommunicationCaregiverIds] = useState<string[]>([]);
  const [sendingCommunication, setSendingCommunication] = useState(false);
  const [newReferral, setNewReferral] = useState({
    concernType: "",
    explanation: "",
    resourceType: "Support service",
    resourceName: "",
    locality: "",
    contact: "",
    urgency: "routine" as ReferralUrgency,
    followUpDate: "",
  });
  const [newEvidence, setNewEvidence] = useState({
    title: "",
    note: "",
    context: "",
    domainTags: "",
    skillTags: "",
    attachmentName: "",
    attachmentUrl: "",
    mediaType: "link" as EvidenceMediaType,
  });

  useEffect(() => {
    Promise.all([
      fetch(`/api/children/${id}/history`).then((res) => res.json()),
      fetch("/api/auth/me").then((res) => res.json()).catch(() => null),
      fetch("/api/settings").then((res) => res.json()).catch(() => null),
      fetch(`/api/children/${id}/plan`).then((res) => res.json()).catch(() => ({ plan: null })),
      fetch(`/api/children/${id}/communications`).then((res) => res.json()).catch(() => ({ communications: [] })),
      fetch(`/api/children/${id}/support`).then((res) => res.json()).catch(() => ({ workspace: null })),
    ])
      .then(([historyData, meData, settingsData, planData, communicationData, supportData]) => {
        setData(historyData);
        setRoles(meData?.user?.roles || []);
        setSettings(settingsData);
        setPlan(planData?.plan || null);
        setCommunications(Array.isArray(communicationData?.communications) ? communicationData.communications : []);
        setSupportWorkspace(supportData?.workspace || null);
        setSupportWorkspaceLoaded(true);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const canWriteAssessments = canPerformAction(roles, "assessments.write");
  const canWritePlans = canPerformAction(roles, "children.write");
  const canWriteCommunications = canPerformAction(roles, "communications.write");
  const canGenerateFamilyReport = hasActiveConsent(data?.child?.consentPolicy, "familyReport");
  const canExportProfessional = hasActiveConsent(data?.child?.consentPolicy, "dataSharing");

  async function downloadPdf() {
    if (!data || data.assessments.length === 0) return;
    const startedAt = Date.now();
    const latestRecord = data.assessments[0];
    const validation = validatePdfExport(latestRecord, data.assessments);
    if (validation.warnings.length > 0) console.warn("PDF export warnings:", validation.warnings);

    setDownloadingPdf(true);
    try {
      const users = await getUsers();
      const printableRecord = withDisplayNamesForReport(latestRecord, users);
      const recommendationSummary = buildRecommendationSummary(
        printableRecord,
        data.assessments,
        getStandardForAssessment(settings?.standards, printableRecord.standardsVersionUsed, printableRecord.child.ageGroup),
        ts,
      );
      await PdfService.generateMapReport(printableRecord, t, tc, ts, tr, data.assessments, recommendationSummary);
      await logPdfExportTelemetry({
        status: "success",
        format: "map",
        audience: "professional",
        childId: latestRecord.childId,
        recordId: latestRecord._id,
        durationMs: Date.now() - startedAt,
        warnings: validation.warnings
      });
    } catch (error) {
      console.error("PDF generation failed:", error);
      await logPdfExportTelemetry({
        status: "failed",
        format: "map",
        audience: "professional",
        childId: latestRecord.childId,
        recordId: latestRecord._id,
        durationMs: Date.now() - startedAt,
        warnings: validation.warnings,
        error: error instanceof Error ? error.message : "unknown"
      });
    } finally {
      setDownloadingPdf(false);
    }
  }

  async function deleteLatestSurvey() {
    if (!data?.assessments?.[0]?._id) return;
    setDeletingSurvey(true);
    const response = await fetch(`/api/assessments/${data.assessments[0]._id}`, { method: "DELETE" }).catch(() => null);
    setDeletingSurvey(false);
    if (!response?.ok) return;
    setData((current) => current ? { ...current, assessments: current.assessments.slice(1) } : current);
    setDeleteModalOpen(false);
    setDeleteConfirmText("");
  }

  const latest = data?.assessments?.[0];
  const baseline = data?.assessments?.length ? data.assessments[data.assessments.length - 1] : null;
  const benchmarkData = [
    { subject: ts("movement"), individual: latest?.computed.movementAverage || 0, average: baseline?.computed.movementAverage || 0 },
    { subject: ts("social"), individual: latest?.computed.socialAverage || 0, average: baseline?.computed.socialAverage || 0 },
    { subject: ts("mental"), individual: latest?.computed.mentalAverage || 0, average: baseline?.computed.mentalAverage || 0 },
  ];
  const allScores = latest ? Object.entries(latest.scores).map(([key, val]) => ({
    key,
    label: ts(`${key}.title`),
    score: val.score || 0
  })).filter(s => s.score > 0) : [];
  const strengths = allScores.sort((a, b) => b.score - a.score).slice(0, 3);
  const focusAreas = allScores.sort((a, b) => a.score - b.score).slice(0, 3);
  const trend = data ? calculateTrend(data.assessments) : [];
  const assessmentsWithImages = data ? data.assessments.filter((assessment) => assessment.attachments.length > 0) : [];
  const rapidDomainSummary = data ? buildRapidDomainSummary(data.assessments, ts) : { movement: [], social: [], mental: [] };
  const recommendationSummary = latest
    ? buildRecommendationSummary(
        latest,
        data?.assessments || [],
        getStandardForAssessment(settings?.standards, latest.standardsVersionUsed, latest.child.ageGroup),
        ts,
      )
    : null;
  const caregiverOptions = (data?.child.caregivers || [])
    .filter((caregiver) => caregiver.status === "active")
    .map((caregiver) => ({ value: caregiver.id, label: caregiver.name }));
  const effectiveSupportWorkspace = useMemo(() => {
    if (supportWorkspace) return supportWorkspace;
    if (!supportWorkspaceLoaded || !data?.child || !latest || !recommendationSummary) return null;
    return buildDefaultSupportWorkspace({
      child: data.child,
      recommendationSummary,
      plan,
      latestAssessment: latest,
    });
  }, [supportWorkspace, supportWorkspaceLoaded, data, latest, recommendationSummary, plan]);
  const supportSummary = buildSupportWorkspaceSummary(effectiveSupportWorkspace);

  if (loading) {
    return (
      <Box style={{ display: "flex", justifyContent: "center", paddingBlock: "2rem" }} role="status">
        <Loader aria-label={tc("loading")} />
      </Box>
    );
  }

  if (!data) {
    return (
      <Text c="red" py="md">
        {tc("error")}
      </Text>
    );
  }

  function ensureDraftPlan() {
    if (!data?.child || !latest || !recommendationSummary) return;
    setPlan((current) => current || buildSuggestedDevelopmentPlan({
      childId: id,
      assessmentId: latest._id,
      institutionId: data.child.institutionId,
      createdByUserEmail: undefined,
      recommendationSummary,
    }));
  }

  async function savePlan() {
    if (!plan) return;
    setSavingPlan(true);
    const response = await fetch(`/api/children/${id}/plan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(plan),
    }).catch(() => null);
    setSavingPlan(false);
    if (!response?.ok) return;
    const payload = await response.json();
    setPlan(payload.plan || plan);
  }

  async function saveSupport() {
    if (!effectiveSupportWorkspace) return;
    setSavingSupportWorkspace(true);
    const response = await fetch(`/api/children/${id}/support`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(effectiveSupportWorkspace),
    }).catch(() => null);
    setSavingSupportWorkspace(false);
    if (!response?.ok) return;
    const payload = await response.json();
    setSupportWorkspace(payload.workspace || effectiveSupportWorkspace);
  }

  function updateCaregiverTool(index: number, patch: Partial<ChildSupportWorkspace["caregiverTools"][number]>) {
    setSupportWorkspace((current) => current ? {
      ...current,
      updatedAt: new Date().toISOString(),
      caregiverTools: current.caregiverTools.map((entry, entryIndex) => entryIndex === index ? { ...entry, ...patch } : entry),
    } : current);
  }

  function updateCoachTool(index: number, patch: Partial<ChildSupportWorkspace["coachTools"][number]>) {
    setSupportWorkspace((current) => current ? {
      ...current,
      updatedAt: new Date().toISOString(),
      coachTools: current.coachTools.map((entry, entryIndex) => entryIndex === index ? { ...entry, ...patch } : entry),
    } : current);
  }

  function updateMicroLearningLesson(sequenceIndex: number, lessonIndex: number, patch: Partial<ChildSupportWorkspace["microLearning"][number]["lessons"][number]>) {
    setSupportWorkspace((current) => current ? {
      ...current,
      updatedAt: new Date().toISOString(),
      microLearning: current.microLearning.map((sequence, currentSequenceIndex) => {
        if (currentSequenceIndex !== sequenceIndex) return sequence;
        const next = {
          ...sequence,
          lessons: sequence.lessons.map((lesson, currentLessonIndex) => currentLessonIndex === lessonIndex ? { ...lesson, ...patch } : lesson),
        };
        return refreshMicroLearning(next);
      }),
    } : current);
  }

  function updateReferral(index: number, patch: Partial<ChildSupportWorkspace["referrals"][number]>) {
    setSupportWorkspace((current) => current ? {
      ...current,
      updatedAt: new Date().toISOString(),
      referrals: current.referrals.map((entry, entryIndex) => entryIndex === index ? { ...entry, ...patch, updatedAt: new Date().toISOString() } : entry),
    } : current);
  }

  function addReferral() {
    if (!newReferral.concernType.trim() || !newReferral.explanation.trim()) return;
    if (!data?.child || !latest || !recommendationSummary) return;
    setSupportWorkspace((current) => {
      const base = current || buildDefaultSupportWorkspace({
        child: data.child,
        recommendationSummary,
        plan,
        latestAssessment: latest,
      });
      return {
        ...base,
        updatedAt: new Date().toISOString(),
        referrals: [{
          id: crypto.randomUUID(),
          concernType: newReferral.concernType.trim(),
          urgency: newReferral.urgency,
          status: "recommended",
          explanation: newReferral.explanation.trim(),
          resourceType: newReferral.resourceType.trim(),
          resourceName: newReferral.resourceName.trim(),
          locality: newReferral.locality.trim(),
          contact: newReferral.contact.trim(),
          followUpDate: newReferral.followUpDate || undefined,
          resolutionNotes: "",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }, ...base.referrals],
      };
    });
    setNewReferral({
      concernType: "",
      explanation: "",
      resourceType: "Support service",
      resourceName: "",
      locality: "",
      contact: "",
      urgency: "routine",
      followUpDate: "",
    });
  }

  function addEvidenceEntry() {
    if (!newEvidence.title.trim() || !newEvidence.note.trim()) return;
    if (!data?.child || !latest || !recommendationSummary) return;
    setSupportWorkspace((current) => {
      const base = current || buildDefaultSupportWorkspace({
        child: data.child,
        recommendationSummary,
        plan,
        latestAssessment: latest,
      });
      const attachments = newEvidence.attachmentUrl.trim() ? [{
        id: crypto.randomUUID(),
        name: newEvidence.attachmentName.trim() || "Reference",
        url: newEvidence.attachmentUrl.trim(),
        mediaType: newEvidence.mediaType,
      }] : [];
      return {
        ...base,
        updatedAt: new Date().toISOString(),
        evidenceJournal: [{
          id: crypto.randomUUID(),
          title: newEvidence.title.trim(),
          note: newEvidence.note.trim(),
          context: newEvidence.context.trim(),
          domainTags: newEvidence.domainTags.split(",").map((entry) => entry.trim()).filter(Boolean),
          skillTags: newEvidence.skillTags.split(",").map((entry) => entry.trim()).filter(Boolean),
          linkedAssessmentId: latest?._id,
          linkedPlanId: plan?._id,
          createdAt: new Date().toISOString(),
          attachments,
        }, ...base.evidenceJournal],
      };
    });
    setNewEvidence({
      title: "",
      note: "",
      context: "",
      domainTags: "",
      skillTags: "",
      attachmentName: "",
      attachmentUrl: "",
      mediaType: "link",
    });
  }

  function updateAssignmentField(index: number, field: "title" | "notes" | "status" | "dueDate" | "audience", value: string) {
    setPlan((current) => current ? {
      ...current,
      updatedAt: new Date().toISOString(),
      assignments: current.assignments.map((assignment, assignmentIndex) => (
        assignmentIndex === index
          ? {
              ...assignment,
              [field]: value,
            }
          : assignment
      )),
    } : current);
  }

  function updateCheckpointField(index: number, field: "title" | "notes" | "dueDate", value: string) {
    setPlan((current) => current ? {
      ...current,
      updatedAt: new Date().toISOString(),
      checkpoints: current.checkpoints.map((checkpoint, checkpointIndex) => (
        checkpointIndex === index
          ? {
              ...checkpoint,
              [field]: value,
            }
          : checkpoint
      )),
    } : current);
  }

  function toggleCheckpoint(index: number) {
    setPlan((current) => current ? {
      ...current,
      updatedAt: new Date().toISOString(),
      checkpoints: current.checkpoints.map((checkpoint, checkpointIndex) => (
        checkpointIndex === index
          ? {
              ...checkpoint,
              completed: !checkpoint.completed,
            }
          : checkpoint
      )),
    } : current);
  }

  async function generateConsentLink(caregiverId: string, caregiverName: string) {
    const response = await fetch(`/api/children/${id}/consent-link`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ caregiverId, locale }),
    }).catch(() => null);
    if (!response?.ok) return;
    const payload = await response.json();
    setGeneratedConsentLink(payload.reviewLink || "");
    setConsentLinkTarget({ id: caregiverId, name: caregiverName });
    setConsentLinkModalOpen(true);
  }

  async function sendCommunication() {
    if (!communicationSubject.trim() || !communicationBody.trim()) return;
    setSendingCommunication(true);
    const response = await fetch(`/api/children/${id}/communications`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category: communicationCategory,
        subject: communicationSubject,
        body: communicationBody,
        caregiverIds: communicationCaregiverIds,
      }),
    }).catch(() => null);
    setSendingCommunication(false);
    if (!response?.ok) return;
    const payload = await response.json();
    if (payload?.communication) {
      setCommunications((current) => [payload.communication, ...current]);
      setCommunicationCategory("internal_note");
      setCommunicationSubject("");
      setCommunicationBody("");
      setCommunicationCaregiverIds([]);
    }
  }

  return (
    <Stack gap="lg">
      <PageHeader 
        title={data.child.name} 
        subtitle={data.child.birthDate} 
        actions={
          <Group>
            {canWriteAssessments ? (
              <Button
                component={Link}
                href={data.assessments[0]?._id ? `/dashboard/assessment?id=${data.assessments[0]._id}` : "/dashboard/assessment"}
                variant="default"
                disabled={data.assessments.length === 0}
              >
                {tc("update")}
              </Button>
            ) : null}
            <Button 
              color="kidex" 
              onClick={() => void downloadPdf()} 
              loading={downloadingPdf}
              disabled={data.assessments.length === 0 || !canExportProfessional}
            >
              {td("downloadPdf")}
            </Button>
            <Button
              color="kidex"
              variant="light"
              onClick={async () => {
                if (!latest || !recommendationSummary) return;
                if (!canGenerateFamilyReport) return;
                setDownloadingPdf(true);
                try {
                  const users = await getUsers();
                  const printableRecord = withDisplayNamesForReport(latest, users);
                  await PdfService.generateFamilyReport(printableRecord, t, tc, ts, tr, recommendationSummary, plan, data.child, effectiveSupportWorkspace);
                } finally {
                  setDownloadingPdf(false);
                }
              }}
              disabled={data.assessments.length === 0 || !canGenerateFamilyReport}
            >
              {tr("familyReportTitle")}
            </Button>
            <Button color="red" onClick={() => setDeleteModalOpen(true)} disabled={data.assessments.length === 0 || !canWriteAssessments}>
              Delete survey
            </Button>
          </Group>
        }
      />

      <ConsentAlertPanel alerts={getConsentAlerts(data.child.consentPolicy)} title={t("consentAlertTitle")} t={t} />

      {data.child.caregivers?.length ? (
        <SectionCard title={t("familyConsentLinksTitle")}>
          <Stack gap="sm">
            {data.child.caregivers.map((caregiver) => (
              <Paper key={caregiver.id} withBorder p="sm">
                <Group justify="space-between" align="center">
                  <Box>
                    <Text fw={700}>{caregiver.name}</Text>
                    <Text size="sm" c="dimmed">{caregiver.email || caregiver.relationship}</Text>
                  </Box>
                  <Button
                    variant="light"
                    color="kidex"
                    onClick={() => void generateConsentLink(caregiver.id, caregiver.name)}
                    disabled={!canWritePlans}
                  >
                    {t("generateConsentLink")}
                  </Button>
                </Group>
              </Paper>
            ))}
          </Stack>
        </SectionCard>
      ) : null}

      {data.child.accessibilityProfile ? (
        <SectionCard title={td("accessibilityProfileTitle")}>
          <Stack gap="xs">
            <Text size="sm"><strong>{td("familyViewMode")}:</strong> {td(`familyViewModeLabel.${data.child.accessibilityProfile.familyViewMode}`)}</Text>
            <Text size="sm"><strong>{td("communicationSupport")}:</strong> {td(`communicationSupportLabel.${data.child.accessibilityProfile.communicationSupport}`)}</Text>
            <Text size="sm"><strong>{td("accommodations")}:</strong> {data.child.accessibilityProfile.accommodations.length > 0 ? data.child.accessibilityProfile.accommodations.map((value) => td(`accommodationLabel.${value}`)).join(", ") : td("noAccommodations")}</Text>
            {data.child.accessibilityProfile.participationBarriers ? (
              <Text size="sm"><strong>{td("participationBarriers")}:</strong> {data.child.accessibilityProfile.participationBarriers}</Text>
            ) : null}
            {data.child.accessibilityProfile.supportNotes ? (
              <Text size="sm"><strong>{td("supportNotes")}:</strong> {data.child.accessibilityProfile.supportNotes}</Text>
            ) : null}
            {data.child.accessibilityProfile.strengthsNotes ? (
              <Text size="sm"><strong>{td("strengthsNotes")}:</strong> {data.child.accessibilityProfile.strengthsNotes}</Text>
            ) : null}
          </Stack>
        </SectionCard>
      ) : null}

      <SectionCard title="Communication Log">
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            This workflow logs caregiver-visible updates and internal notes with policy-aware review history. Direct adult-minor messaging is not supported.
          </Text>
          {canWriteCommunications ? (
            <Paper withBorder p="md" radius="md">
              <Stack gap="sm">
                <Select
                  label="Message type"
                  value={communicationCategory}
                  onChange={(value) => setCommunicationCategory((value || "internal_note") as typeof communicationCategory)}
                  data={[
                    { value: "internal_note", label: "Internal note" },
                    { value: "caregiver_update", label: "Caregiver update" },
                    { value: "family_announcement", label: "Family announcement" },
                  ]}
                  allowDeselect={false}
                />
                {communicationCategory !== "internal_note" ? (
                  <MultiSelect
                    label="Visible caregivers"
                    value={communicationCaregiverIds}
                    onChange={setCommunicationCaregiverIds}
                    data={caregiverOptions}
                    searchable
                  />
                ) : null}
                <TextInput label="Subject" value={communicationSubject} onChange={(event) => setCommunicationSubject(event.currentTarget.value)} />
                <Textarea label="Message" value={communicationBody} onChange={(event) => setCommunicationBody(event.currentTarget.value)} minRows={3} />
                <Group justify="flex-end">
                  <Button color="kidex" onClick={() => void sendCommunication()} loading={sendingCommunication} disabled={!communicationSubject.trim() || !communicationBody.trim()}>
                    Log communication
                  </Button>
                </Group>
              </Stack>
            </Paper>
          ) : null}
          {communications.length === 0 ? (
            <Text size="sm" c="dimmed">No governed communication logged for this child yet.</Text>
          ) : (
            <Stack gap="sm">
              {communications.map((communication) => (
                <Paper key={communication._id} withBorder p="sm" radius="md">
                  <Stack gap={6}>
                    <Group justify="space-between" align="start">
                      <Box>
                        <Text fw={700}>{communication.subject}</Text>
                        <Text size="sm" c="dimmed">
                          {new Date(communication.createdAt).toLocaleString()} · {communication.createdByUserEmail || "Unknown sender"}
                        </Text>
                      </Box>
                      <Group gap="xs">
                        <Badge color={communication.visibleToCaregivers ? "teal" : "gray"} variant="light">
                          {communication.visibleToCaregivers ? "Caregiver-visible" : "Internal"}
                        </Badge>
                        <Badge color={communication.deliveryStatus === "scheduled_quiet_hours" ? "yellow" : "blue"} variant="light">
                          {communication.deliveryStatus === "scheduled_quiet_hours" ? "Quiet-hours hold" : "Logged"}
                        </Badge>
                      </Group>
                    </Group>
                    {communication.caregiverNames.length > 0 ? (
                      <Text size="sm">Recipients: {communication.caregiverNames.join(", ")}</Text>
                    ) : null}
                    <Text size="sm">{communication.body}</Text>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          )}
        </Stack>
      </SectionCard>

      <SectionCard title={td("skiProgression")}>
        <LongitudinalChart 
          data={data.assessments.slice().reverse().map(a => ({ 
            date: a.session.date, 
            value: a.computed.ski || 0 
          }))} 
        />
        <Text size="sm" c="dimmed" mt="xs">
          {td("insightChildSkiProgression", {
            sessions: data.assessments.length,
            current: formatScore(latest?.computed.ski || 0),
            baseline: formatScore(baseline?.computed.ski || 0)
          })}
        </Text>
      </SectionCard>

      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
        <Box>
          <SectionCard title={t("longitudinalTrends")}>
            <Stack gap="md">
              <LongitudinalChart 
                title={ts("movement")}
                data={trend.map(p => ({ date: p.date, value: p.movement }))}
                color={getDomainMainColor("movement")}
              />
              <LongitudinalChart 
                title={ts("social")}
                data={trend.map(p => ({ date: p.date, value: p.social }))}
                color={getDomainMainColor("social")}
              />
              <LongitudinalChart 
                title={ts("mental")}
                data={trend.map(p => ({ date: p.date, value: p.mental }))}
                color={getDomainMainColor("mental")}
              />
            </Stack>
          </SectionCard>
        </Box>
        <Box>
          <BenchmarkChart 
            title={td("ageBenchmarking")}
            data={benchmarkData}
            labels={{
              individual: tc("latestAssessment") || "Latest",
              average: td("baselineAssessment") || "Baseline"
            }}
          />
          <Text size="sm" c="dimmed" mt="xs">
            {td("insightChildBenchmark", {
              movement: formatScore(latest?.computed.movementAverage || 0),
              social: formatScore(latest?.computed.socialAverage || 0),
              mental: formatScore(latest?.computed.mentalAverage || 0)
            })}
          </Text>
          <Stack gap="md" mt="lg">
            <Paper withBorder p="md" radius="md">
              <Text fw={700} size="sm" mb="xs" c="green">{td("strengthsTitle")}</Text>
              <Stack gap={4}>
                {strengths.map(s => (
                  <Group key={s.key} justify="space-between">
                    <Text size="sm">{s.label}</Text>
                    <Badge variant="light" color="green">{s.score}</Badge>
                  </Group>
                ))}
              </Stack>
            </Paper>
            <Paper withBorder p="md" radius="md">
              <Text fw={700} size="sm" mb="xs" c="orange">{td("focusAreasTitle")}</Text>
              <Stack gap={4}>
                {focusAreas.map(s => (
                  <Group key={s.key} justify="space-between">
                    <Text size="sm">{s.label}</Text>
                    <Badge variant="light" color="orange">{s.score}</Badge>
                  </Group>
                ))}
              </Stack>
            </Paper>
          </Stack>
        </Box>
      </SimpleGrid>

      <SectionCard title={t("rapidSpiderSummaryTitle")} subheader={t("rapidSpiderSummarySubtitle")}>
        <Stack gap="md" style={{ flexDirection: "row", flexWrap: "wrap" }}>
          <Box style={{ flex: 1, minWidth: 0 }}>
            <RapidRadarChart title={t("rapidMovementTitle")} data={rapidDomainSummary.movement} domain="movement" />
          </Box>
          <Box style={{ flex: 1, minWidth: 0 }}>
            <RapidRadarChart title={t("rapidSocialTitle")} data={rapidDomainSummary.social} domain="social" />
          </Box>
          <Box style={{ flex: 1, minWidth: 0 }}>
            <RapidRadarChart title={t("rapidMentalTitle")} data={rapidDomainSummary.mental} domain="mental" />
          </Box>
        </Stack>
      </SectionCard>

      {recommendationSummary ? (
        <SectionCard title="Mental Wellbeing Track" subheader="Baseline and follow-up mental-skills, readiness, recovery, and support signals linked to this child record.">
          <Stack gap="md">
            <Text size="sm" c="dimmed">
              {recommendationSummary.mentalWellbeing.phase === "baseline" ? "Baseline" : "Follow-up"} · risk {recommendationSummary.mentalWellbeing.riskLevel}
              {typeof recommendationSummary.mentalWellbeing.baselineMentalSkillsAverage === "number" && typeof recommendationSummary.mentalWellbeing.mentalSkillsAverage === "number"
                ? ` · mental skills ${formatScore(recommendationSummary.mentalWellbeing.baselineMentalSkillsAverage)} → ${formatScore(recommendationSummary.mentalWellbeing.mentalSkillsAverage)}`
                : typeof recommendationSummary.mentalWellbeing.mentalSkillsAverage === "number"
                  ? ` · mental skills ${formatScore(recommendationSummary.mentalWellbeing.mentalSkillsAverage)}`
                  : ""}
            </Text>
            <SimpleGrid cols={{ base: 2, md: 4 }} spacing="md">
              <Paper withBorder p="md" radius="md">
                <Text size="sm" c="dimmed">Mental skills</Text>
                <Text fw={700}>{formatScore(recommendationSummary.mentalWellbeing.mentalSkillsAverage)}</Text>
              </Paper>
              <Paper withBorder p="md" radius="md">
                <Text size="sm" c="dimmed">Check-in average</Text>
                <Text fw={700}>{formatScore(recommendationSummary.mentalWellbeing.checkInAverage)}</Text>
              </Paper>
              <Paper withBorder p="md" radius="md">
                <Text size="sm" c="dimmed">Recovery average</Text>
                <Text fw={700}>{formatScore(recommendationSummary.mentalWellbeing.recoveryAverage)}</Text>
              </Paper>
              <Paper withBorder p="md" radius="md">
                <Text size="sm" c="dimmed">Disagreement index</Text>
                <Text fw={700}>{formatScore(recommendationSummary.mentalWellbeing.disagreementIndex)}</Text>
              </Paper>
            </SimpleGrid>
            {recommendationSummary.mentalWellbeing.goalModules.length > 0 ? (
              <Paper withBorder p="md" radius="md">
                <Text fw={700} size="sm" mb="xs">Guided practice modules</Text>
                <Text size="sm">{recommendationSummary.mentalWellbeing.goalModules.join(", ")}</Text>
              </Paper>
            ) : null}
            {recommendationSummary.mentalWellbeing.flaggedSignals.length > 0 ? (
              <Paper withBorder p="md" radius="md">
                <Text fw={700} size="sm" mb="xs">Flagged concern signals</Text>
                <Group gap="xs">
                  {recommendationSummary.mentalWellbeing.flaggedSignals.map((signal) => (
                    <Badge key={signal} color={recommendationSummary.mentalWellbeing.riskLevel === "high" ? "red" : "orange"} variant="light">
                      {signal}
                    </Badge>
                  ))}
                </Group>
              </Paper>
            ) : null}
          </Stack>
        </SectionCard>
      ) : null}

      {recommendationSummary ? (
        <SectionCard title={tr("recommendationsTitle")}>
          <Stack gap="md">
            <Text size="sm" c="dimmed">
              Standards version: {recommendationSummary.standardsVersionUsed || settings?.standards.activeVersion || "v1"}{recommendationSummary.standardsVariantUsed ? ` · benchmark ${recommendationSummary.standardsVariantUsed}` : ""} · SKI target {formatScore(recommendationSummary.ski.target)} · minimum {formatScore(recommendationSummary.ski.min)}
            </Text>
            {recommendationSummary.recommendations.map((recommendation) => (
              <Paper key={recommendation.id} withBorder p="md" radius="md">
                <Stack gap={6}>
                  <Group justify="space-between">
                    <Text fw={700}>{recommendation.title}</Text>
                    <Group gap="xs">
                      <Badge color={recommendation.severity === "high" ? "red" : recommendation.severity === "medium" ? "orange" : "teal"} variant="light">
                        {recommendation.severity}
                      </Badge>
                      <Badge color={recommendation.evidenceStrength === "high" ? "grape" : recommendation.evidenceStrength === "medium" ? "blue" : "gray"} variant="outline">
                        evidence {recommendation.evidenceStrength}
                      </Badge>
                    </Group>
                  </Group>
                  <Text size="sm">{recommendation.rationale}</Text>
                  {recommendation.focusItems.length > 0 ? (
                    <Text size="sm" c="dimmed">
                      Focus items: {recommendation.focusItems.map((item) => `${item.label} (${item.score})`).join(", ")}
                    </Text>
                  ) : null}
                  <Stack gap={4}>
                    {recommendation.sourceEvidence.map((evidence, index) => (
                      <Text key={`${recommendation.id}-${index}`} size="sm" c="dimmed">
                        {evidence.label}: {evidence.detail}
                      </Text>
                    ))}
                  </Stack>
                </Stack>
              </Paper>
            ))}
          </Stack>
        </SectionCard>
      ) : null}

      <SectionCard
        title="Development Plan"
        subheader="Translate the latest support recommendations into practical assignments, checkpoints, and family-safe follow-up."
        action={canWritePlans ? (
          <Group gap="xs">
            {!plan ? (
              <Button variant="default" onClick={ensureDraftPlan} disabled={!recommendationSummary}>
                Generate draft plan
              </Button>
            ) : null}
            <Button color="kidex" onClick={() => void savePlan()} loading={savingPlan} disabled={!plan}>
              Save plan
            </Button>
          </Group>
        ) : null}
      >
        {!plan ? (
          <Text c="dimmed">No development plan yet. Generate one from the current recommendation set to start structured follow-up.</Text>
        ) : (
          <Stack gap="md">
            <Paper withBorder p="md">
              <Stack gap="sm">
                <Text fw={700}>Plan summary</Text>
                <TextInput
                  value={plan.summary}
                  onChange={(event) => setPlan((current) => current ? { ...current, summary: event.currentTarget.value, updatedAt: new Date().toISOString() } : current)}
                  disabled={!canWritePlans}
                />
                <TextInput
                  label="Progress notes"
                  value={plan.progressNotes}
                  onChange={(event) => setPlan((current) => current ? { ...current, progressNotes: event.currentTarget.value, updatedAt: new Date().toISOString() } : current)}
                  disabled={!canWritePlans}
                />
              </Stack>
            </Paper>

            <Paper withBorder p="md">
              <Stack gap="sm">
                <Group justify="space-between">
                  <Text fw={700}>Assignments</Text>
                  <Badge variant="light">{plan.status}</Badge>
                </Group>
                {plan.assignments.map((assignment, index) => (
                  <Paper key={assignment.id} withBorder p="sm">
                    <Stack gap="xs">
                      <TextInput
                        label={`Assignment ${index + 1}`}
                        value={assignment.title}
                        onChange={(event) => updateAssignmentField(index, "title", event.currentTarget.value)}
                        disabled={!canWritePlans}
                      />
                      <TextInput
                        label="Notes"
                        value={assignment.notes}
                        onChange={(event) => updateAssignmentField(index, "notes", event.currentTarget.value)}
                        disabled={!canWritePlans}
                      />
                      <Group grow>
                        <TextInput
                          label="Audience"
                          value={assignment.audience}
                          onChange={(event) => updateAssignmentField(index, "audience", event.currentTarget.value)}
                          disabled={!canWritePlans}
                        />
                        <TextInput
                          label="Status"
                          value={assignment.status}
                          onChange={(event) => updateAssignmentField(index, "status", event.currentTarget.value)}
                          disabled={!canWritePlans}
                        />
                        <TextInput
                          label="Due date"
                          type="date"
                          value={assignment.dueDate || ""}
                          onChange={(event) => updateAssignmentField(index, "dueDate", event.currentTarget.value)}
                          disabled={!canWritePlans}
                        />
                      </Group>
                      {assignment.focusAreaIds.length > 0 ? (
                        <Text size="sm" c="dimmed">Focus items: {assignment.focusAreaIds.join(", ")}</Text>
                      ) : null}
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            </Paper>

            <Paper withBorder p="md">
              <Stack gap="sm">
                <Text fw={700}>Review checkpoints</Text>
                {plan.checkpoints.map((checkpoint, index) => (
                  <Paper key={checkpoint.id} withBorder p="sm">
                    <Stack gap="xs">
                      <Group justify="space-between">
                        <Text fw={600}>{checkpoint.title}</Text>
                        <Button variant="light" size="compact-sm" onClick={() => toggleCheckpoint(index)} disabled={!canWritePlans}>
                          {checkpoint.completed ? "Completed" : "Mark complete"}
                        </Button>
                      </Group>
                      <TextInput
                        label="Checkpoint title"
                        value={checkpoint.title}
                        onChange={(event) => updateCheckpointField(index, "title", event.currentTarget.value)}
                        disabled={!canWritePlans}
                      />
                      <TextInput
                        label="Due date"
                        type="date"
                        value={checkpoint.dueDate || ""}
                        onChange={(event) => updateCheckpointField(index, "dueDate", event.currentTarget.value)}
                        disabled={!canWritePlans}
                      />
                      <TextInput
                        label="Notes"
                        value={checkpoint.notes}
                        onChange={(event) => updateCheckpointField(index, "notes", event.currentTarget.value)}
                        disabled={!canWritePlans}
                      />
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            </Paper>
          </Stack>
        )}
      </SectionCard>

      <SectionCard
        title="Support Workspace"
        subheader="Caregiver tools, coach guidance, micro-learning, referrals, and evidence journaling for this child."
        action={canWritePlans ? (
          <Button color="kidex" onClick={() => void saveSupport()} loading={savingSupportWorkspace} disabled={!effectiveSupportWorkspace}>
            Save support workspace
          </Button>
        ) : null}
      >
        {!effectiveSupportWorkspace ? (
          <Text c="dimmed">Support tools will appear once a plan or recommendation set exists for this child.</Text>
        ) : (
          <Stack gap="md">
            <SimpleGrid cols={{ base: 2, md: 5 }} spacing="md">
              <Paper withBorder p="md" radius="md">
                <Text size="sm" c="dimmed">Caregiver tools completed</Text>
                <Text fw={700}>{supportSummary.caregiverCompleted}</Text>
              </Paper>
              <Paper withBorder p="md" radius="md">
                <Text size="sm" c="dimmed">Coach guidance completed</Text>
                <Text fw={700}>{supportSummary.coachCompleted}</Text>
              </Paper>
              <Paper withBorder p="md" radius="md">
                <Text size="sm" c="dimmed">Active micro-learning</Text>
                <Text fw={700}>{supportSummary.activeMicroLearning}</Text>
              </Paper>
              <Paper withBorder p="md" radius="md">
                <Text size="sm" c="dimmed">Open referrals</Text>
                <Text fw={700}>{supportSummary.openReferrals}</Text>
              </Paper>
              <Paper withBorder p="md" radius="md">
                <Text size="sm" c="dimmed">Evidence moments</Text>
                <Text fw={700}>{supportSummary.evidenceCount}</Text>
              </Paper>
            </SimpleGrid>

            <Paper withBorder p="md">
              <Stack gap="sm">
                <Text fw={700}>Caregiver education and partnership tools</Text>
                {effectiveSupportWorkspace.caregiverTools.map((tool, index) => (
                  <Paper key={tool.id} withBorder p="sm">
                    <Stack gap="xs">
                      <Group justify="space-between">
                        <Text fw={600}>{tool.title}</Text>
                        <Badge variant="light">{tool.status}</Badge>
                      </Group>
                      <Text size="sm">{tool.description}</Text>
                      <Group grow>
                        <Select
                          label="Status"
                          value={tool.status}
                          data={[
                            { value: "recommended", label: "Recommended" },
                            { value: "acknowledged", label: "Acknowledged" },
                            { value: "completed", label: "Completed" },
                          ]}
                          onChange={(value) => updateCaregiverTool(index, { status: (value as typeof tool.status) || "recommended", completedAt: value === "completed" ? new Date().toISOString() : undefined })}
                          disabled={!canWritePlans}
                        />
                        <TextInput
                          label="Focus tags"
                          value={tool.focusTags.join(", ")}
                          onChange={(event) => updateCaregiverTool(index, { focusTags: event.currentTarget.value.split(",").map((entry) => entry.trim()).filter(Boolean) })}
                          disabled={!canWritePlans}
                        />
                      </Group>
                      {tool.commitmentLabel ? (
                        <Checkbox
                          label={tool.commitmentLabel}
                          checked={Boolean(tool.commitmentAcceptedAt)}
                          onChange={(event) => updateCaregiverTool(index, { commitmentAcceptedAt: event.currentTarget.checked ? new Date().toISOString() : undefined })}
                          disabled={!canWritePlans}
                        />
                      ) : null}
                      <TextInput
                        label="Notes"
                        value={tool.notes}
                        onChange={(event) => updateCaregiverTool(index, { notes: event.currentTarget.value })}
                        disabled={!canWritePlans}
                      />
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            </Paper>

            <Paper withBorder p="md">
              <Stack gap="sm">
                <Text fw={700}>Coach guidance and just-in-time prompts</Text>
                {effectiveSupportWorkspace.coachTools.map((tool, index) => (
                  <Paper key={tool.id} withBorder p="sm">
                    <Stack gap="xs">
                      <Group justify="space-between">
                        <Text fw={600}>{tool.title}</Text>
                        <Badge variant="light">{tool.status}</Badge>
                      </Group>
                      <Text size="sm">{tool.description}</Text>
                      <Group grow>
                        <Select
                          label="Status"
                          value={tool.status}
                          data={[
                            { value: "recommended", label: "Recommended" },
                            { value: "acknowledged", label: "Acknowledged" },
                            { value: "completed", label: "Completed" },
                          ]}
                          onChange={(value) => updateCoachTool(index, { status: (value as typeof tool.status) || "recommended", completedAt: value === "completed" ? new Date().toISOString() : undefined })}
                          disabled={!canWritePlans}
                        />
                        <TextInput
                          label="Focus tags"
                          value={tool.focusTags.join(", ")}
                          onChange={(event) => updateCoachTool(index, { focusTags: event.currentTarget.value.split(",").map((entry) => entry.trim()).filter(Boolean) })}
                          disabled={!canWritePlans}
                        />
                      </Group>
                      <TextInput
                        label="Notes"
                        value={tool.notes}
                        onChange={(event) => updateCoachTool(index, { notes: event.currentTarget.value })}
                        disabled={!canWritePlans}
                      />
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            </Paper>

            <Paper withBorder p="md">
              <Stack gap="sm">
                <Text fw={700}>Micro-learning and reflection</Text>
                {effectiveSupportWorkspace.microLearning.map((sequence, sequenceIndex) => (
                  <Paper key={sequence.id} withBorder p="sm">
                    <Stack gap="xs">
                      <Group justify="space-between">
                        <Box>
                          <Text fw={600}>{sequence.title}</Text>
                          <Text size="sm" c="dimmed">
                            {sequence.focusArea} · {sequence.ageGroup || "all ages"} · streak {sequence.currentStreak}
                          </Text>
                        </Box>
                        <Badge variant="light">{sequence.status}</Badge>
                      </Group>
                      {sequence.lessons.map((lesson, lessonIndex) => (
                        <Paper key={lesson.id} withBorder p="sm">
                          <Stack gap="xs">
                            <Checkbox
                              label={`${lesson.title} (${lesson.durationMinutes} min)`}
                              checked={lesson.completed}
                              onChange={(event) => updateMicroLearningLesson(sequenceIndex, lessonIndex, {
                                completed: event.currentTarget.checked,
                                completedAt: event.currentTarget.checked ? new Date().toISOString() : undefined,
                              })}
                              disabled={!canWritePlans}
                            />
                            <Text size="sm" c="dimmed">{lesson.prompt}</Text>
                            <TextInput
                              label="Reflection"
                              value={lesson.reflection}
                              onChange={(event) => updateMicroLearningLesson(sequenceIndex, lessonIndex, { reflection: event.currentTarget.value })}
                              disabled={!canWritePlans}
                            />
                          </Stack>
                        </Paper>
                      ))}
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            </Paper>

            <Paper withBorder p="md">
              <Stack gap="sm">
                <Text fw={700}>Referral workflow and local support directory</Text>
                <SimpleGrid cols={{ base: 1, md: 2 }} spacing="sm">
                  <TextInput label="Concern type" value={newReferral.concernType} onChange={(event) => setNewReferral((current) => ({ ...current, concernType: event.currentTarget.value }))} disabled={!canWritePlans} />
                  <Select
                    label="Urgency"
                    value={newReferral.urgency}
                    data={[
                      { value: "routine", label: "Routine" },
                      { value: "priority", label: "Priority" },
                      { value: "urgent", label: "Urgent" },
                    ]}
                    onChange={(value) => setNewReferral((current) => ({ ...current, urgency: (value as ReferralUrgency) || "routine" }))}
                    disabled={!canWritePlans}
                  />
                  <TextInput label="Resource type" value={newReferral.resourceType} onChange={(event) => setNewReferral((current) => ({ ...current, resourceType: event.currentTarget.value }))} disabled={!canWritePlans} />
                  <TextInput label="Resource name" value={newReferral.resourceName} onChange={(event) => setNewReferral((current) => ({ ...current, resourceName: event.currentTarget.value }))} disabled={!canWritePlans} />
                  <TextInput label="Locality" value={newReferral.locality} onChange={(event) => setNewReferral((current) => ({ ...current, locality: event.currentTarget.value }))} disabled={!canWritePlans} />
                  <TextInput label="Contact" value={newReferral.contact} onChange={(event) => setNewReferral((current) => ({ ...current, contact: event.currentTarget.value }))} disabled={!canWritePlans} />
                </SimpleGrid>
                <TextInput label="Follow-up date" type="date" value={newReferral.followUpDate} onChange={(event) => setNewReferral((current) => ({ ...current, followUpDate: event.currentTarget.value }))} disabled={!canWritePlans} />
                <Textarea label="Parent-safe explanation" value={newReferral.explanation} onChange={(event) => setNewReferral((current) => ({ ...current, explanation: event.currentTarget.value }))} minRows={2} disabled={!canWritePlans} />
                <Group justify="flex-end">
                  <Button variant="default" onClick={addReferral} disabled={!canWritePlans || !newReferral.concernType.trim() || !newReferral.explanation.trim()}>
                    Add referral
                  </Button>
                </Group>
                {effectiveSupportWorkspace.referrals.map((referral, index) => (
                  <Paper key={referral.id} withBorder p="sm">
                    <Stack gap="xs">
                      <Group justify="space-between">
                        <Text fw={600}>{referral.concernType}</Text>
                        <Badge color={referral.urgency === "urgent" ? "red" : referral.urgency === "priority" ? "orange" : "blue"} variant="light">
                          {referral.urgency}
                        </Badge>
                      </Group>
                      <Text size="sm">{referral.explanation}</Text>
                      <Group grow>
                        <Select
                          label="Status"
                          value={referral.status}
                          data={[
                            { value: "recommended", label: "Recommended" },
                            { value: "contacted", label: "Contacted" },
                            { value: "scheduled", label: "Scheduled" },
                            { value: "closed", label: "Closed" },
                          ]}
                          onChange={(value) => updateReferral(index, { status: (value as typeof referral.status) || "recommended" })}
                          disabled={!canWritePlans}
                        />
                        <TextInput label="Follow-up date" type="date" value={referral.followUpDate || ""} onChange={(event) => updateReferral(index, { followUpDate: event.currentTarget.value || undefined })} disabled={!canWritePlans} />
                      </Group>
                      <TextInput label="Resource name" value={referral.resourceName} onChange={(event) => updateReferral(index, { resourceName: event.currentTarget.value })} disabled={!canWritePlans} />
                      <TextInput label="Resolution notes" value={referral.resolutionNotes} onChange={(event) => updateReferral(index, { resolutionNotes: event.currentTarget.value })} disabled={!canWritePlans} />
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            </Paper>

            <Paper withBorder p="md">
              <Stack gap="sm">
                <Text fw={700}>Multimedia evidence journal</Text>
                <SimpleGrid cols={{ base: 1, md: 2 }} spacing="sm">
                  <TextInput label="Moment title" value={newEvidence.title} onChange={(event) => setNewEvidence((current) => ({ ...current, title: event.currentTarget.value }))} disabled={!canWritePlans} />
                  <TextInput label="Context" value={newEvidence.context} onChange={(event) => setNewEvidence((current) => ({ ...current, context: event.currentTarget.value }))} disabled={!canWritePlans} />
                  <TextInput label="Domain tags" value={newEvidence.domainTags} onChange={(event) => setNewEvidence((current) => ({ ...current, domainTags: event.currentTarget.value }))} disabled={!canWritePlans} placeholder="movement, social, mental" />
                  <TextInput label="Skill tags" value={newEvidence.skillTags} onChange={(event) => setNewEvidence((current) => ({ ...current, skillTags: event.currentTarget.value }))} disabled={!canWritePlans} placeholder="balance, confidence" />
                  <TextInput label="Attachment label" value={newEvidence.attachmentName} onChange={(event) => setNewEvidence((current) => ({ ...current, attachmentName: event.currentTarget.value }))} disabled={!canWritePlans} />
                  <TextInput label="Attachment URL" value={newEvidence.attachmentUrl} onChange={(event) => setNewEvidence((current) => ({ ...current, attachmentUrl: event.currentTarget.value }))} disabled={!canWritePlans} placeholder="https://..." />
                </SimpleGrid>
                <Select
                  label="Attachment type"
                  value={newEvidence.mediaType}
                  data={[
                    { value: "image", label: "Image" },
                    { value: "video", label: "Video" },
                    { value: "file", label: "File" },
                    { value: "link", label: "Link" },
                  ]}
                  onChange={(value) => setNewEvidence((current) => ({ ...current, mediaType: (value as EvidenceMediaType) || "link" }))}
                  disabled={!canWritePlans}
                />
                <Textarea label="Observation note" value={newEvidence.note} onChange={(event) => setNewEvidence((current) => ({ ...current, note: event.currentTarget.value }))} minRows={2} disabled={!canWritePlans} />
                <Group justify="flex-end">
                  <Button variant="default" onClick={addEvidenceEntry} disabled={!canWritePlans || !newEvidence.title.trim() || !newEvidence.note.trim()}>
                    Add evidence moment
                  </Button>
                </Group>
                <Stack gap="sm">
                  {effectiveSupportWorkspace.evidenceJournal.map((entry) => (
                    <Paper key={entry.id} withBorder p="sm">
                      <Stack gap="xs">
                        <Group justify="space-between">
                          <Text fw={600}>{entry.title}</Text>
                          <Text size="sm" c="dimmed">{new Date(entry.createdAt).toLocaleDateString()}</Text>
                        </Group>
                        <Text size="sm">{entry.note}</Text>
                        <Text size="sm" c="dimmed">
                          {[entry.context, entry.domainTags.join(", "), entry.skillTags.join(", ")].filter(Boolean).join(" · ")}
                        </Text>
                        {entry.attachments.length > 0 ? (
                          <Group gap="xs">
                            {entry.attachments.map((attachment) => (
                              <Button key={attachment.id} component="a" href={attachment.url} target="_blank" rel="noreferrer" variant="light" size="compact-sm">
                                {attachment.mediaType}: {attachment.name}
                              </Button>
                            ))}
                          </Group>
                        ) : null}
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              </Stack>
            </Paper>
          </Stack>
        )}
      </SectionCard>

      {recommendationSummary ? (
        <SectionCard title={tr("familyReportTitle")}>
          <Stack gap="sm">
            <Text size="sm" c="dimmed">{tr("familyReportIntro")}</Text>
            <Paper withBorder p="sm">
              <Text fw={700}>{tr("familyHeadline")}</Text>
              <Text size="sm" c="dimmed">
                {recommendationSummary.readinessStatus === "ready"
                  ? tr("familyReady")
                  : recommendationSummary.readinessStatus === "developing"
                    ? tr("familyDeveloping")
                    : tr("familySupport")}
              </Text>
            </Paper>
            {plan?.assignments?.length ? (
              <Paper withBorder p="sm">
                <Text fw={700}>{tr("familyNextStepsTitle")}</Text>
                <Stack gap={4} mt="xs">
                  {plan.assignments.slice(0, 3).map((assignment) => (
                    <Text key={assignment.id} size="sm">• {assignment.title}</Text>
                  ))}
                </Stack>
              </Paper>
            ) : null}
            {supportSummary.openReferrals > 0 || supportSummary.recentEvidenceTitles.length > 0 ? (
              <Paper withBorder p="sm">
                <Text fw={700}>Support follow-up</Text>
                {supportSummary.openReferrals > 0 ? (
                  <Text size="sm" c="dimmed">{supportSummary.openReferrals} referral follow-up item(s) are currently open.</Text>
                ) : null}
                {supportSummary.recentEvidenceTitles.length > 0 ? (
                  <Stack gap={4} mt="xs">
                    {supportSummary.recentEvidenceTitles.map((title) => (
                      <Text key={title} size="sm">• {title}</Text>
                    ))}
                  </Stack>
                ) : null}
              </Paper>
            ) : null}
          </Stack>
        </SectionCard>
      ) : null}

      <SectionCard title={t("assessmentHistory")}>
        <Paper withBorder p={0}>
          <Table striped highlightOnHover verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{tc("date")}</Table.Th>
                <Table.Th>{tc("mode")}</Table.Th>
                <Table.Th>{ts("movement")}</Table.Th>
                <Table.Th>{ts("social")}</Table.Th>
                <Table.Th>{ts("mental")}</Table.Th>
                <Table.Th>{ts("ski")}</Table.Th>
                <Table.Th>{td("volatility")}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {data.assessments.map((a) => (
                <Table.Tr 
                  key={a._id} 
                  onClick={() => window.location.href = `/${locale}/dashboard/records/${a._id}`}
                  style={{ cursor: "pointer" }}
                >
                  <Table.Td>{a.session.date}</Table.Td>
                  <Table.Td>
                    <Badge variant="outline" size="sm" color="gray">{a.mode}</Badge>
                  </Table.Td>
                  <Table.Td>{formatScore(a.computed.movementAverage)}</Table.Td>
                  <Table.Td>{formatScore(a.computed.socialAverage)}</Table.Td>
                  <Table.Td>{formatScore(a.computed.mentalAverage)}</Table.Td>
                  <Table.Td>
                    <Text fw={700} color="kidex">{formatScore(a.computed.ski)}</Text>
                  </Table.Td>
                  <Table.Td>
                    <SparklineChart data={[
                      a.computed.movementAverage || 0,
                      a.computed.socialAverage || 0,
                      a.computed.mentalAverage || 0
                    ]} />
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Paper>
        <Text size="sm" c="dimmed" mt="xs">
          {td("insightChildHistoryCount", { count: data.assessments.length })}
        </Text>
      </SectionCard>

      <SectionCard title={t("evidenceImages")}>
        {assessmentsWithImages.length === 0 ? (
          <Text c="dimmed">{t("noImages")}</Text>
        ) : (
          <Stack gap="md">
            {assessmentsWithImages.map((assessment) => (
              <Paper key={assessment._id} withBorder p="sm">
                <Text size="sm" fw={600} mb="xs">
                  {assessment.session.date}
                </Text>
                <Stack gap="sm" style={{ flexDirection: "row", flexWrap: "wrap" }}>
                  {assessment.attachments.map((attachment) => {
                    const isPdf = attachment.mimeType === "application/pdf" || attachment.url.toLowerCase().endsWith(".pdf");
                    return (
                      <Paper key={attachment.id} withBorder p="xs" style={{ width: 180, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                        {isPdf ? (
                          <Box style={{ height: 110, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--mantine-color-gray-0)", borderRadius: "var(--mantine-radius-md)" }}>
                             <Stack align="center" gap={4}>
                               <Text size="xl" style={{ fontSize: 40 }}>📄</Text>
                               <Text size="sm" c="dimmed" style={{ textAlign: "center", paddingInline: 8 }}>{attachment.name || "PDF Report"}</Text>
                             </Stack>
                          </Box>
                        ) : (
                          <Image
                            src={attachment.thumbUrl || attachment.url}
                            alt={attachment.name || "Evidence image"}
                            width={160}
                            height={110}
                            style={{ width: "100%", height: "auto", borderRadius: "var(--mantine-radius-md)" }}
                            unoptimized
                          />
                        )}
                        <Button 
                          component="a" 
                          href={attachment.url} 
                          download={attachment.name || "report.pdf"}
                          target="_blank" 
                          rel="noreferrer" 
                          variant="light"
                          size="sm"
                          mt={8}
                          fullWidth
                        >
                          {isPdf ? tc("download") : tc("view")}
                        </Button>
                      </Paper>
                    );
                  })}
                </Stack>
              </Paper>
            ))}
          </Stack>
        )}
      </SectionCard>
      <DeleteSurveyModal
        opened={canWriteAssessments && deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        confirmValue={deleteConfirmText}
        onConfirmValueChange={setDeleteConfirmText}
        onDelete={() => void deleteLatestSurvey()}
        deleting={deletingSurvey}
      />
      <Modal
        opened={consentLinkModalOpen}
        onClose={() => setConsentLinkModalOpen(false)}
        title={t("consentLinkModalTitle")}
        centered
      >
        <Stack gap="sm">
          <Text size="sm" c="dimmed">
            {t("consentLinkModalIntro", { caregiver: consentLinkTarget?.name || "" })}
          </Text>
          <TextInput value={generatedConsentLink} readOnly />
        </Stack>
      </Modal>
    </Stack>
  );
}

function ConsentAlertPanel({
  alerts,
  title,
  t,
}: {
  alerts: ReturnType<typeof getConsentAlerts>;
  title: string;
  t: (key: string, values?: Record<string, string | number>) => string;
}) {
  if (alerts.length === 0) return null;
  const expired = alerts.filter((alert) => alert.reason === "expired");
  const expiring = alerts.filter((alert) => alert.reason === "expiring_soon");
  const future = alerts.filter((alert) => alert.reason === "future");
  const missing = alerts.filter((alert) => alert.reason === "missing");
  const lines = [
    expired.length > 0 ? t("consentAlertExpired", { count: expired.length }) : "",
    expiring.length > 0 ? t("consentAlertExpiring", { count: expiring.length }) : "",
    future.length > 0 ? t("consentAlertFuture", { count: future.length }) : "",
    missing.length > 0 ? t("consentAlertMissing", { count: missing.length }) : "",
  ].filter(Boolean);

  return (
    <Alert color={expired.length > 0 ? "red" : "yellow"} title={title}>
      <Stack gap={4}>
        {lines.map((line) => <Text key={line} size="sm">{line}</Text>)}
      </Stack>
    </Alert>
  );
}

function DeleteSurveyModal({
  opened,
  onClose,
  confirmValue,
  onConfirmValueChange,
  onDelete,
  deleting
}: {
  opened: boolean;
  onClose: () => void;
  confirmValue: string;
  onConfirmValueChange: (next: string) => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  return (
    <Modal opened={opened} onClose={onClose} title="Delete survey" centered>
      <Stack gap="md">
        <Text size="sm">This will permanently remove the selected survey.</Text>
        <Text size="sm" c="dimmed">Type `delete` to confirm.</Text>
        <TextInput value={confirmValue} onChange={(e) => onConfirmValueChange(e.currentTarget.value)} placeholder="delete" />
        <Group justify="flex-end">
          <Button variant="subtle" onClick={onClose}>Cancel</Button>
          <Button color="red" disabled={confirmValue.trim().toLowerCase() !== "delete" || deleting} loading={deleting} onClick={onDelete}>
            Delete survey
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

function RapidRadarChart({
  title,
  data,
  domain
}: {
  title: string;
  data: Array<{ label: string; value: number }>;
  domain: AssessmentDomain;
}) {
  const theme = useMantineTheme();
  const domainColor = getDomainMainColor(domain);
  return (
    <Paper withBorder p="sm">
      <Text size="sm" fw={600} mb="xs">
        {title}
      </Text>
      <Box style={{ width: "100%", height: RADAR_CHART_HEIGHT }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data}>
            <PolarGrid />
            <PolarAngleAxis
              dataKey="label"
              tick={{ fontSize: RADAR_TICK_FONT_SIZE, fill: "var(--mantine-color-text)", fontFamily: CHART_FONT_FAMILY }}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 6]}
              tickCount={4}
              tick={(props) => renderRotatedRadiusTick(props)}
              stroke={theme.colors.gray[6]}
            />
            <Tooltip />
            <Radar dataKey="value" stroke={domainColor} fill={domainColor} fillOpacity={0.25} />
          </RadarChart>
        </ResponsiveContainer>
      </Box>
    </Paper>
  );
}

function renderRotatedRadiusTick(props: { x?: string | number; y?: string | number; payload?: { value?: string | number } }) {
  const x = Number(props.x ?? 0);
  const y = Number(props.y ?? 0);
  const value = props.payload?.value ?? "";
  return (
    <text
      x={x}
      y={y}
      fill="var(--mantine-color-text)"
      fontSize={RADAR_TICK_FONT_SIZE}
      fontFamily={CHART_FONT_FAMILY}
      textAnchor="middle"
      dominantBaseline="central"
      transform={`rotate(90, ${x}, ${y})`}
    >
      {value}
    </text>
  );
}

function buildRapidDomainSummary(assessments: AssessmentRecord[], translateSchema: (key: string) => string) {
  const rapidRecords = assessments.filter((assessment) => assessment.mode === "rapid");
  const buildDomain = (sectionKey: "rapid_movement" | "rapid_social" | "rapid_mental") => {
    const section = rapidSections.find((item) => item.key === sectionKey);
    if (!section) return [];

    return section.items.map((item) => {
      let sum = 0;
      let count = 0;
      for (const assessment of rapidRecords) {
        const raw = assessment.scores[item.key]?.score;
        if (typeof raw === "number") {
          sum += raw;
          count += 1;
        }
      }
      return {
        label: translateSchema(`${item.key}.title`),
        value: count ? Number((sum / count).toFixed(2)) : 0
      };
    });
  };

  return {
    movement: buildDomain("rapid_movement"),
    social: buildDomain("rapid_social"),
    mental: buildDomain("rapid_mental")
  };
}
