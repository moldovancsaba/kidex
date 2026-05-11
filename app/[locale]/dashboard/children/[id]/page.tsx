"use client";

import { useEffect, useState, use } from "react";
import { Box, Button, Group, Loader, Modal, Paper, Stack, Table, Text, TextInput, useMantineTheme } from "@mantine/core";
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
import { getStandardForAssessment } from "@/lib/standards";
import type { AssessmentRecord } from "@/types/assessment";
import type { ChildProfile } from "@/repositories/child.repository";
import type { SupportedRuntimeRole } from "@/lib/roles";
import type { KidexSettings } from "@/services/settings-service";
import { Badge, SimpleGrid } from "@mantine/core";

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

  useEffect(() => {
    Promise.all([
      fetch(`/api/children/${id}/history`).then((res) => res.json()),
      fetch("/api/auth/me").then((res) => res.json()).catch(() => null),
      fetch("/api/settings").then((res) => res.json()).catch(() => null),
      fetch(`/api/children/${id}/plan`).then((res) => res.json()).catch(() => ({ plan: null })),
    ])
      .then(([historyData, meData, settingsData, planData]) => {
        setData(historyData);
        setRoles(meData?.user?.roles || []);
        setSettings(settingsData);
        setPlan(planData?.plan || null);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const canWriteAssessments = canPerformAction(roles, "assessments.write");
  const canWritePlans = canPerformAction(roles, "children.write");

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

  const latest = data.assessments[0];
  const baseline = data.assessments.length > 0 ? data.assessments[data.assessments.length - 1] : null;

  const benchmarkData = [
    { subject: ts("movement"), individual: latest?.computed.movementAverage || 0, average: baseline?.computed.movementAverage || 0 },
    { subject: ts("social"), individual: latest?.computed.socialAverage || 0, average: baseline?.computed.socialAverage || 0 },
    { subject: ts("mental"), individual: latest?.computed.mentalAverage || 0, average: baseline?.computed.mentalAverage || 0 },
  ];

  // Calculate Strengths & Focus Areas from the latest record
  const allScores = latest ? Object.entries(latest.scores).map(([key, val]) => ({
    key,
    label: ts(`${key}.title`),
    score: val.score || 0
  })).filter(s => s.score > 0) : [];

  const strengths = allScores.sort((a, b) => b.score - a.score).slice(0, 3);
  const focusAreas = allScores.sort((a, b) => a.score - b.score).slice(0, 3);

  const trend = calculateTrend(data.assessments);
  const assessmentsWithImages = data.assessments.filter((assessment) => assessment.attachments.length > 0);
  const rapidDomainSummary = buildRapidDomainSummary(data.assessments, ts);
  const recommendationSummary = latest
    ? buildRecommendationSummary(
        latest,
        data.assessments,
        getStandardForAssessment(settings?.standards, latest.standardsVersionUsed, latest.child.ageGroup),
        ts,
      )
    : null;

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
              disabled={data.assessments.length === 0}
            >
              {td("downloadPdf")}
            </Button>
            <Button color="red" onClick={() => setDeleteModalOpen(true)} disabled={data.assessments.length === 0 || !canWriteAssessments}>
              Delete survey
            </Button>
          </Group>
        }
      />

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
        <SectionCard title={tr("recommendationsTitle")}>
          <Stack gap="md">
            <Text size="sm" c="dimmed">
              Standards version: {recommendationSummary.standardsVersionUsed || settings?.standards.activeVersion || "v1"} · SKI target {formatScore(recommendationSummary.ski.target)} · minimum {formatScore(recommendationSummary.ski.min)}
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
    </Stack>
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
