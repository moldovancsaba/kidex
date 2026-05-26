"use client";

import { useEffect, useState, use } from "react";
import { Alert, Badge, Box, Button, Group, Paper, SimpleGrid, Stack, Table, Text, Title, useMantineTheme } from "@mantine/core";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { buildChildStateSummary } from "@/lib/child-state-summary";
import { buildFamilyFriendlyReportSummary } from "@/lib/family-report";
import { PdfService } from "@/lib/pdf-service";
import { buildProgressComparisonSummary } from "@/lib/progress-comparison";
import { buildReassessmentSummary } from "@/lib/reassessment";
import { buildRecommendationSummary } from "@/lib/recommendations";
import { buildSessionFocusPriorities } from "@/lib/session-focus";
import { getConsentAlerts, hasActiveConsent } from "@/lib/consent-policy";
import { getUsers } from "@/services/user-service";
import { withDisplayNamesForReport } from "@/lib/report-user-display";
import { logPdfExportTelemetry, validatePdfExport } from "@/lib/pdf-export-guards";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";
import { PageHeader } from "@/components/gds-local/admin";
import { ErrorState, LoadingState, SectionCard } from "@/components/gds-local/core";
import { rapidSections } from "@/lib/kidex-schema";
import { getDomainMainColor, type AssessmentDomain } from "@/lib/domain-colors";
import { sectionsForMode } from "@/lib/kidex-schema";
import { getStandardForAssessment } from "@/lib/standards";
import { formatScore } from "@/lib/utils";
import { ReadinessGauge } from "@/components/analytics/ReadinessGauge";
import { MaturityRadarChart } from "@/components/analytics/MaturityRadarChart";
import { buildSupportWorkspaceSummary, type ChildSupportWorkspace } from "@/lib/support-workspace";
import type { AssessmentRecord } from "@/types/assessment";
import type { ChildProfile } from "@/repositories/child.repository";
import type { KidexSettings } from "@/services/settings-service";
import type { DevelopmentPlan } from "@/lib/development-plans";

const RADAR_CHART_HEIGHT = 200;
const RADAR_TICK_FONT_SIZE = 10;
const CHART_FONT_FAMILY = 'var(--font-noto-sans), "Noto Sans", Helvetica, Arial, sans-serif';

export default function RecordDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations("Assessment");
  const tc = useTranslations("Common");
  const ts = useTranslations("Schema");
  const td = useTranslations("Dashboard");
  const tr = useTranslations("Report");
  const searchParams = useSearchParams();
  const shouldPrint = searchParams.get("print") === "true";
  const reportFormat = searchParams.get("format") || "original";

  const [record, setRecord] = useState<AssessmentRecord | null>(null);
  const [history, setHistory] = useState<AssessmentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [settings, setSettings] = useState<KidexSettings | null>(null);
  const [plan, setPlan] = useState<DevelopmentPlan | null>(null);
  const [child, setChild] = useState<ChildProfile | null>(null);
  const [supportWorkspace, setSupportWorkspace] = useState<ChildSupportWorkspace | null>(null);

  const sections = record ? sectionsForMode(record.mode) : [];
  const recordedAt = record ? new Date(record.createdAt) : new Date();
  const reportDate = new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(recordedAt);
  const reportTime = new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit"
  }).format(recordedAt);

  const downloadPdf = async (audience: "professional" | "family" = "professional") => {
    if (!record) return;
    const startedAt = Date.now();
    const validation = validatePdfExport(record, history);
    if (validation.warnings.length > 0) {
      console.warn("PDF export warnings:", validation.warnings);
    }
    setDownloadingPdf(true);
    try {
      const users = await getUsers();
      const printableRecord = withDisplayNamesForReport(record, users);
      const recommendationSummary = buildRecommendationSummary(
        printableRecord,
        history,
        getStandardForAssessment(settings?.standards, printableRecord.standardsVersionUsed, printableRecord.child.ageGroup),
        ts,
      );
      if (audience === "family") {
        if (!hasActiveConsent(child?.consentPolicy, "familyReport")) return;
        await PdfService.generateFamilyReport(printableRecord, t, tc, ts, tr, recommendationSummary, plan, child, supportWorkspace, history, history.length);
      } else if (reportFormat === "map") {
        await PdfService.generateMapReport(printableRecord, t, tc, ts, tr, history, recommendationSummary, plan);
      } else {
        await PdfService.generateOriginalReport(printableRecord, t, tc, ts);
      }
      await logPdfExportTelemetry({
        status: "success",
        format: reportFormat === "map" ? "map" : "original",
        audience,
        childId: record.childId,
        recordId: record._id,
        durationMs: Date.now() - startedAt,
        warnings: validation.warnings
      });
    } catch (error) {
      console.error("PDF generation failed:", error);
      await logPdfExportTelemetry({
        status: "failed",
        format: reportFormat === "map" ? "map" : "original",
        audience,
        childId: record.childId,
        recordId: record._id,
        durationMs: Date.now() - startedAt,
        warnings: validation.warnings,
        error: error instanceof Error ? error.message : "unknown"
      });
    } finally {
      setDownloadingPdf(false);
    }
  };

  useEffect(() => {
    fetch(`/api/assessments/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setRecord(data.assessment);
        fetch("/api/settings")
          .then((res) => res.json())
          .then(setSettings)
          .catch(() => null);
        if (data.assessment?.childId) {
          fetch(`/api/children/${data.assessment.childId}/plan`)
            .then((res) => res.json())
            .then((planData) => setPlan(planData?.plan || null))
            .catch(() => null);
          fetch(`/api/children/${data.assessment.childId}/support`)
            .then((res) => res.json())
            .then((supportData) => setSupportWorkspace(supportData?.workspace || null))
            .catch(() => null);
          fetch(`/api/children/${data.assessment.childId}/history`)
            .then(r => r.json())
            .then(hData => {
              setHistory(hData.assessments || []);
              setChild(hData.child || null);
            });
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (record && shouldPrint && !downloadingPdf) {
      const timer = setTimeout(() => {
        void downloadPdf();
      }, 500);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record, shouldPrint]);

  if (loading) {
    return <LoadingState label={tc("loading")} minHeight="12rem" />;
  }

  if (!record) {
    return <ErrorState title={tc("error")} message={t("recordUnavailable")} />;
  }

  const radarData = {
    movement: buildRadarData("rapid_movement", record, ts),
    social: buildRadarData("rapid_social", record, ts),
    mental: buildRadarData("rapid_mental", record, ts)
  };

  const baseline = history.length > 0 ? history[history.length - 1] : null;
  const recommendationSummary = buildRecommendationSummary(
    record,
    history,
    getStandardForAssessment(settings?.standards, record.standardsVersionUsed, record.child.ageGroup),
    ts,
  );
  const childStateSummary = buildChildStateSummary(record, recommendationSummary, history.length);
  const progressSummary = buildProgressComparisonSummary({
    record,
    history,
    recommendationSummary,
    plan,
  });
  const reassessmentSummary = buildReassessmentSummary({
    plan,
    latestAssessmentAt: record.createdAt,
  });
  const sessionFocus = buildSessionFocusPriorities({
    recommendationSummary,
    progressSummary,
    plan,
    supportWorkspace,
  });
  const supportSummary = buildSupportWorkspaceSummary(supportWorkspace);
  const familySummary = buildFamilyFriendlyReportSummary({
    record,
    recommendationSummary,
    history,
    historyCount: history.length,
    plan,
    accessibilityProfile: child?.accessibilityProfile,
    supportWorkspace,
  });
  const canGenerateFamilyReport = hasActiveConsent(child?.consentPolicy, "familyReport");
  const canExportProfessional = hasActiveConsent(child?.consentPolicy, "dataSharing");
  const consentAlerts = getConsentAlerts(child?.consentPolicy);
  const expiredConsentCount = consentAlerts.filter((alert) => alert.reason === "expired").length;
  const expiringConsentCount = consentAlerts.filter((alert) => alert.reason === "expiring_soon").length;
  const deltaRadarData = [
    { subject: ts("movement"), A: record.computed.movementAverage || 0, B: baseline?.computed.movementAverage || 0, fullMark: 6 },
    { subject: ts("social"), A: record.computed.socialAverage || 0, B: baseline?.computed.socialAverage || 0, fullMark: 6 },
    { subject: ts("mental"), A: record.computed.mentalAverage || 0, B: baseline?.computed.mentalAverage || 0, fullMark: 6 },
  ];

  return (
    <Box className="record-detail print-container">
      <Stack gap="md" mb="lg">
        <Box className="no-print">
          <PageHeader
            title={t("recordTitle")}
            subtitle={
              <Stack gap={6}>
                <Box>
                  <Text component="span">{record.session.date} · </Text>
                  <Text
                    component={Link}
                    href={`/dashboard/children/${record.childId}`}
                    fw={700}
                    color="kidex"
                    style={{ textDecoration: "none" }}
                  >
                    {record.child.name}
                  </Text>
                </Box>
                <Group gap="xs" wrap="wrap">
                  <Badge color={reassessmentSummary.status === "overdue" ? "red" : reassessmentSummary.status === "due_soon" ? "yellow" : reassessmentSummary.status === "on_track" ? "teal" : "gray"} variant="light">
                    {reassessmentSummary.status.replace("_", " ")}
                  </Badge>
                  {expiredConsentCount > 0 ? (
                    <Badge color="red" variant="light">
                      {t("consentExpiredBadge", { count: expiredConsentCount })}
                    </Badge>
                  ) : null}
                  {expiredConsentCount === 0 && expiringConsentCount > 0 ? (
                    <Badge color="yellow" variant="light">
                      {t("consentExpiringBadge", { count: expiringConsentCount })}
                    </Badge>
                  ) : null}
                  {canGenerateFamilyReport ? (
                    <Badge color="teal" variant="outline">
                      {tr("familyReportTitle")}
                    </Badge>
                  ) : null}
                </Group>
              </Stack>
            }
            primaryAction={<Button component={Link} href={`/dashboard/assessment?id=${record._id}`} color="kidex">{t("resumeSurvey")}</Button>}
            secondaryActions={
              <>
                <Button
                  color="kidex"
                  variant="light"
                  onClick={() => void downloadPdf()}
                  loading={downloadingPdf}
                  disabled={!canExportProfessional}
                >
                  {td("downloadPdf")}
                </Button>
                <Button
                  color="kidex"
                  variant="outline"
                  onClick={() => void downloadPdf("family")}
                  loading={downloadingPdf}
                  disabled={!canGenerateFamilyReport}
                >
                  {tr("familyReportTitle")}
                </Button>
              </>
            }
            overflowActions={[
              { label: td("downloadPdf"), onClick: () => void downloadPdf() },
              { label: tr("familyReportTitle"), onClick: () => void downloadPdf("family") },
            ]}
          />
        </Box>
      </Stack>
      <SectionCard title={t("reportPreview")}>
        <Stack gap="xl">
          <ConsentAlertPanel alerts={consentAlerts} title={t("consentAlertTitle")} t={t} />
          {child?.accessibilityProfile ? (
            <Paper withBorder p="md" radius="md">
              <Stack gap="xs">
                <Text fw={700}>{td("accessibilityProfileTitle")}</Text>
                <Text size="sm"><strong>{td("familyViewMode")}:</strong> {td(`familyViewModeLabel.${child.accessibilityProfile.familyViewMode}`)}</Text>
                <Text size="sm"><strong>{td("communicationSupport")}:</strong> {td(`communicationSupportLabel.${child.accessibilityProfile.communicationSupport}`)}</Text>
                <Text size="sm"><strong>{td("accommodations")}:</strong> {child.accessibilityProfile.accommodations.length > 0 ? child.accessibilityProfile.accommodations.map((value) => td(`accommodationLabel.${value}`)).join(", ") : td("noAccommodations")}</Text>
              </Stack>
            </Paper>
          ) : null}
          <Group gap="md" align="center" justify="space-between" wrap="wrap" className="print-report-header">
            <Group gap="md">
              <Image src="/logo.jpeg" alt="KIDEX" width={64} height={64} style={{ borderRadius: "var(--mantine-radius-md)" }} />
              <Box>
                <Title order={3} fw={800}>{t("reportPrintTitle")}</Title>
                <Text size="sm" c="dimmed">{record.child.name}</Text>
              </Box>
            </Group>
            <Box className="report-meta-grid" style={{ textAlign: "right" }}>
              <MetaRow label={tc("date")} value={reportDate} />
              <MetaRow label={t("tableTime")} value={reportTime} />
            </Box>
          </Group>

          <SimpleGrid cols={{ base: 1, md: 3 }} spacing="lg" style={{ alignItems: "flex-end" }}>
            <Box>
              <ReadinessGauge 
                value={record.computed.ski || 0} 
                title={td("sportReadiness")}
                subtitle={td("readinessStatus")}
              />
            </Box>
            <Box style={{ gridColumn: "span 2" }}>
              <MaturityRadarChart 
                title={td("deltaProfile")}
                data={deltaRadarData}
                labels={{
                  A: td("currentAssessment"),
                  B: history.length > 1 ? td("baselineAssessment") : undefined
                }}
              />
            </Box>
          </SimpleGrid>
          <Text size="sm" c="dimmed">
            {td("insightRecordReadiness", {
              ski: formatScore(record.computed.ski || 0),
              movement: formatScore(record.computed.movementAverage || 0),
              social: formatScore(record.computed.socialAverage || 0),
              mental: formatScore(record.computed.mentalAverage || 0)
            })}
          </Text>

          <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md" className="print-metrics-grid">
            <Metric label={ts("movement")} value={formatScore(record.computed.movementAverage)} />
            <Metric label={ts("social")} value={formatScore(record.computed.socialAverage)} />
            <Metric label={ts("mental")} value={formatScore(record.computed.mentalAverage)} />
            <Metric label={ts("ski")} value={formatScore(record.computed.ski)} />
          </SimpleGrid>
          <Text size="sm" c="dimmed">
            {td("insightRecordDomainSummary", {
              movement: formatScore(record.computed.movementAverage || 0),
              social: formatScore(record.computed.socialAverage || 0),
              mental: formatScore(record.computed.mentalAverage || 0)
            })}
          </Text>

          <SectionCard title="Current State Summary" subheader="One shared interpretation of the child’s physical, social, and mental state for conductor review and parent communication.">
            <Stack gap="md">
              <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
                <Paper withBorder p="md" radius="md">
                  <Stack gap="xs">
                    <Group justify="space-between" align="center">
                      <Text fw={700}>Conductor view</Text>
                      <Badge variant="light" color={childStateSummary.supportPressure === "high" ? "red" : childStateSummary.supportPressure === "medium" ? "orange" : "teal"}>
                        pressure {childStateSummary.supportPressure}
                      </Badge>
                    </Group>
                    <Text>{childStateSummary.conductorHeadline}</Text>
                    <Text size="sm" c="dimmed">{childStateSummary.conductorSummary}</Text>
                  </Stack>
                </Paper>
                <Paper withBorder p="md" radius="md">
                  <Stack gap="xs">
                    <Group justify="space-between" align="center">
                      <Text fw={700}>Parent-ready view</Text>
                      <Badge variant="outline" color={childStateSummary.confidence === "high" ? "teal" : childStateSummary.confidence === "medium" ? "yellow" : "gray"}>
                        confidence {childStateSummary.confidence}
                      </Badge>
                    </Group>
                    <Text>{childStateSummary.parentHeadline}</Text>
                    <Text size="sm" c="dimmed">{childStateSummary.parentSummary}</Text>
                  </Stack>
                </Paper>
              </SimpleGrid>
              <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
                {childStateSummary.domains.map((domain) => (
                  <StateDomainCard key={domain.key} domain={domain} />
                ))}
              </SimpleGrid>
              <Paper withBorder p="md" radius="md">
                <Text fw={700} size="sm" mb="xs">Reliability context</Text>
                <Text size="sm" c="dimmed">
                  High-confidence items: {recommendationSummary.confidenceContext.highConfidenceCount} · Medium-confidence items: {recommendationSummary.confidenceContext.mediumConfidenceCount} · Low-confidence items: {recommendationSummary.confidenceContext.lowConfidenceCount} · Missing confidence: {recommendationSummary.confidenceContext.missingConfidenceCount}
                </Text>
              </Paper>
              {childStateSummary.limitations.length > 0 ? (
                <Paper withBorder p="md" radius="md">
                  <Text fw={700} size="sm" mb="xs">Interpretation limits</Text>
                  <Stack gap={4}>
                    {childStateSummary.limitations.map((limitation) => (
                      <Text key={limitation} size="sm" c="dimmed">{limitation}</Text>
                    ))}
                  </Stack>
                </Paper>
              ) : null}
            </Stack>
          </SectionCard>

          <SectionCard title="Progress and Plan Effectiveness" subheader="One bounded explanation of what changed over time and whether the current support plan looks helpful yet.">
            <Stack gap="md">
              <Alert color={reassessmentSummary.status === "overdue" ? "red" : reassessmentSummary.status === "due_soon" ? "yellow" : reassessmentSummary.status === "on_track" ? "teal" : "gray"}>
                <Text fw={700}>Reassessment cadence</Text>
                <Text size="sm">{reassessmentSummary.summary}</Text>
                <Text size="sm" c="dimmed">{reassessmentSummary.conductorMessage}</Text>
              </Alert>
              <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
                <Paper withBorder p="md" radius="md">
                  <Stack gap="xs">
                    <Text fw={700}>{progressSummary.headline}</Text>
                    <Text size="sm" c="dimmed">{progressSummary.conductorSummary}</Text>
                  </Stack>
                </Paper>
                <Paper withBorder p="md" radius="md">
                  <Stack gap="xs">
                    <Group justify="space-between" align="center">
                      <Text fw={700}>{progressSummary.planEffectiveness.label}</Text>
                      <Badge variant="light" color={progressSummary.planEffectiveness.status === "supporting_progress" ? "teal" : progressSummary.planEffectiveness.status === "needs_adjustment" ? "red" : "yellow"}>
                        {progressSummary.planEffectiveness.status}
                      </Badge>
                    </Group>
                    <Text size="sm" c="dimmed">{progressSummary.planEffectiveness.summary}</Text>
                  </Stack>
                </Paper>
              </SimpleGrid>
              <SimpleGrid cols={{ base: 1, md: 4 }} spacing="md">
                {progressSummary.domains.map((domain) => (
                  <Paper key={domain.key} withBorder p="md" radius="md">
                    <Stack gap={4}>
                      <Group justify="space-between" align="center">
                        <Text fw={700}>{domain.label}</Text>
                        <Badge
                          variant="light"
                          color={domain.direction === "improved" ? "teal" : domain.direction === "regressed" ? "red" : domain.direction === "stable" ? "blue" : "gray"}
                        >
                          {domain.direction}
                        </Badge>
                      </Group>
                      <Text size="sm" c="dimmed">
                        {typeof domain.baseline === "number" && typeof domain.current === "number"
                          ? `${formatScore(domain.baseline)} -> ${formatScore(domain.current)}`
                          : "Not enough history"}
                      </Text>
                      {typeof domain.delta === "number" ? (
                        <Text size="sm" fw={600}>
                          Delta {domain.delta > 0 ? "+" : ""}{formatScore(domain.delta)}
                        </Text>
                      ) : null}
                    </Stack>
                  </Paper>
                ))}
              </SimpleGrid>
              {progressSummary.limitations.length > 0 ? (
                <Paper withBorder p="md" radius="md">
                  <Text fw={700} size="sm" mb="xs">Comparison limits</Text>
                  <Stack gap={4}>
                    {progressSummary.limitations.map((entry) => (
                      <Text key={entry} size="sm" c="dimmed">{entry}</Text>
                    ))}
                  </Stack>
                </Paper>
              ) : null}
            </Stack>
          </SectionCard>

          <SectionCard title="Next Session Focus" subheader="Operational priorities for the next live conductor session, linked to the measured profile and current support plan.">
            <Stack gap="md">
              {sessionFocus.map((priority) => (
                <Paper key={priority.id} withBorder p="md" radius="md">
                  <Stack gap="xs">
                    <Group justify="space-between" align="center">
                      <Text fw={700}>{priority.title}</Text>
                      <Badge variant="light" color={priority.urgency === "high" ? "red" : priority.urgency === "medium" ? "orange" : "teal"}>
                        {priority.urgency}
                      </Badge>
                    </Group>
                    <Text size="sm">{priority.whyNow}</Text>
                    <Stack gap={4}>
                      {priority.sessionActions.map((action) => (
                        <Text key={action} size="sm" c="dimmed">• {action}</Text>
                      ))}
                    </Stack>
                    {priority.linkedPlanAssignments.length > 0 ? (
                      <Text size="sm" c="dimmed">Linked plan: {priority.linkedPlanAssignments.join(", ")}</Text>
                    ) : null}
                    {priority.linkedSupport.length > 0 ? (
                      <Text size="sm" c="dimmed">Linked support: {priority.linkedSupport.join(", ")}</Text>
                    ) : null}
                  </Stack>
                </Paper>
              ))}
            </Stack>
          </SectionCard>

          <SectionCard title="Mental Wellbeing Track" subheader="This assessment includes baseline or follow-up mental-skills, recovery, readiness, and support-signal context.">
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
                <Text size="sm">
                  <strong>Guided practice modules:</strong> {recommendationSummary.mentalWellbeing.goalModules.join(", ")}
                </Text>
              ) : null}
              {recommendationSummary.mentalWellbeing.flaggedSignals.length > 0 ? (
                <Group gap="xs">
                  {recommendationSummary.mentalWellbeing.flaggedSignals.map((signal) => (
                    <Badge key={signal} color={recommendationSummary.mentalWellbeing.riskLevel === "high" ? "red" : "orange"} variant="light">
                      {signal}
                    </Badge>
                  ))}
                </Group>
              ) : null}
            </Stack>
          </SectionCard>

          <SectionCard title={tr("recommendationsTitle")}>
            <Stack gap="sm">
              <Text size="sm" c="dimmed">
                Standards version: {recommendationSummary.standardsVersionUsed || settings?.standards.activeVersion || "v1"}{recommendationSummary.standardsVariantUsed ? ` · benchmark ${recommendationSummary.standardsVariantUsed}` : ""}
              </Text>
              {recommendationSummary.recommendations.map((recommendation) => (
                <Paper key={recommendation.id} withBorder p="sm">
                  <Stack gap={4}>
                    <Group justify="space-between">
                      <Text fw={700}>{recommendation.title}</Text>
                      <Group gap="xs">
                        <Badge variant="light" color={recommendation.severity === "high" ? "red" : recommendation.severity === "medium" ? "orange" : "teal"}>
                          {recommendation.severity}
                        </Badge>
                        <Badge variant="outline" color={recommendation.evidenceStrength === "high" ? "grape" : recommendation.evidenceStrength === "medium" ? "blue" : "gray"}>
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

          <SectionCard title={tr("familyReportTitle")}>
            <Stack gap="sm">
              <Text size="sm" c="dimmed">{tr("familyReportIntro")}</Text>
              <Paper withBorder p="sm">
                <Text fw={700}>{tr("familyHeadline")}</Text>
                <Text size="sm" c="dimmed">{familySummary.currentStateSummary}</Text>
              </Paper>
              <Paper withBorder p="sm">
                <Text fw={700}>{familySummary.progressHeadline}</Text>
                <Text size="sm" c="dimmed">{familySummary.progressSummary}</Text>
                <Text size="sm" c="dimmed" mt="xs">{familySummary.planEffectivenessSummary}</Text>
              </Paper>
              {familySummary.parentGuidance.map((guidance) => (
                <Paper key={guidance.id} withBorder p="sm">
                  <Stack gap={4}>
                    <Text fw={700}>{guidance.title}</Text>
                    <Text size="sm">{guidance.whyNow}</Text>
                    {guidance.thisWeek.map((step) => (
                      <Text key={step} size="sm" c="dimmed">• {step}</Text>
                    ))}
                    {guidance.linkedSupport.length > 0 ? (
                      <Text size="sm" c="dimmed">Linked support: {guidance.linkedSupport.join(", ")}</Text>
                    ) : null}
                    {guidance.boundaryNote ? (
                      <Text size="sm" c="orange.8">{guidance.boundaryNote}</Text>
                    ) : null}
                  </Stack>
                </Paper>
              ))}
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
            </Stack>
          </SectionCard>

          {(supportSummary.caregiverCompleted > 0 || supportSummary.activeMicroLearning > 0 || supportSummary.openReferrals > 0 || supportSummary.evidenceCount > 0) ? (
            <SectionCard title="Support follow-through">
              <SimpleGrid cols={{ base: 2, md: 4 }} spacing="md">
                <Paper withBorder p="sm">
                  <Text size="sm" c="dimmed">Caregiver tools completed</Text>
                  <Text fw={700}>{supportSummary.caregiverCompleted}</Text>
                </Paper>
                <Paper withBorder p="sm">
                  <Text size="sm" c="dimmed">Active micro-learning</Text>
                  <Text fw={700}>{supportSummary.activeMicroLearning}</Text>
                </Paper>
                <Paper withBorder p="sm">
                  <Text size="sm" c="dimmed">Open referrals</Text>
                  <Text fw={700}>{supportSummary.openReferrals}</Text>
                </Paper>
                <Paper withBorder p="sm">
                  <Text size="sm" c="dimmed">Evidence moments</Text>
                  <Text fw={700}>{supportSummary.evidenceCount}</Text>
                </Paper>
              </SimpleGrid>
              {supportSummary.recentEvidenceTitles.length > 0 ? (
                <Paper withBorder p="sm" mt="md">
                  <Text fw={700}>Recent evidence references</Text>
                  <Stack gap={4} mt="xs">
                    {supportSummary.recentEvidenceTitles.map((title) => (
                      <Text key={title} size="sm">• {title}</Text>
                    ))}
                  </Stack>
                </Paper>
              ) : null}
            </SectionCard>
          ) : null}

          <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md" mt="md">
            <RecordRadarChart title={t("rapidMovementTitle")} data={radarData.movement} domain="movement" />
            <RecordRadarChart title={t("rapidSocialTitle")} data={radarData.social} domain="social" />
            <RecordRadarChart title={t("rapidMentalTitle")} data={radarData.mental} domain="mental" />
          </SimpleGrid>
        </Stack>
      </SectionCard>

      {sections.map((section) => (
        <SectionCard key={section.key} title={ts(section.key)}>
          <Paper withBorder radius="md" style={{ overflow: "hidden" }}>
            <Table striped highlightOnHover verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>{t("tableObservation")}</Table.Th>
                  <Table.Th style={{ width: 100, textAlign: "right" }}>
                    {t("tableScore")}
                  </Table.Th>
                  <Table.Th>{t("tableNote")}</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {section.items.map((item) => {
                  const entry = record.scores[item.key];
                  return (
                    <Table.Tr key={item.key}>
                      <Table.Td fw={500}>{ts(`${item.key}.title`)}</Table.Td>
                      <Table.Td style={{ textAlign: "right" }}>
                        <Badge color="kidex" variant="light" size="lg">
                          {entry?.score ?? "—"}
                        </Badge>
                      </Table.Td>
                      <Table.Td><Text size="sm" c="dimmed">{entry?.note || "—"}</Text></Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
          </Paper>
        </SectionCard>
      ))}

      <SectionCard title={t("evidenceImages")}>
        {record.attachments.length === 0 ? (
          <Text size="sm" c="dimmed" fs="italic">
            {t("noImages")}
          </Text>
        ) : (
          <SimpleGrid cols={{ base: 2, sm: 3, md: 4, lg: 5 }} spacing="md">
            {record.attachments.map((attachment) => {
              const isPdf = attachment.mimeType === "application/pdf" || attachment.url.toLowerCase().endsWith(".pdf");
              return (
                <Paper key={attachment.id} withBorder p="xs" radius="md" style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {isPdf ? (
                    <Box style={{ height: 120, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--mantine-color-gray-0)", borderRadius: "var(--mantine-radius-md)" }}>
                       <Stack align="center" gap={4}>
                         <Text style={{ fontSize: 32 }}>📄</Text>
                         <Text size="sm" c="dimmed" style={{ textAlign: "center", paddingInline: 4 }} lineClamp={1}>{attachment.name || "PDF Report"}</Text>
                       </Stack>
                    </Box>
                  ) : (
                    <Image
                      src={attachment.thumbUrl || attachment.url}
                      alt={attachment.name || "Evidence image"}
                      width={160}
                      height={120}
                      style={{ width: "100%", height: "auto", borderRadius: "var(--mantine-radius-md)", aspectRatio: "4/3", objectFit: "cover" }}
                      unoptimized
                    />
                  )}
                  <Box>
                    <Text size="sm" c="dimmed" mb={4}>
                      {new Date(attachment.uploadedAt).toLocaleDateString()}
                    </Text>
                    <Button 
                      component="a" 
                      href={attachment.url} 
                      download={attachment.name || "report.pdf"}
                      target="_blank" 
                      rel="noreferrer" 
                      variant="light"
                      size="sm"
                      fullWidth
                    >
                      {isPdf ? tc("download") : tc("view")}
                    </Button>
                  </Box>
                </Paper>
              );
            })}
          </SimpleGrid>
        )}
      </SectionCard>

      <SectionCard title={t("professionalNotes")}>
        <Stack gap="md">
          <Box>
            <Text size="sm" fw={600} mb={4}>
              {t("generalObservation")}
            </Text>
            <Text size="sm" c="dimmed">
              {record.notes.general || "—"}
            </Text>
          </Box>
          <Box>
            <Text size="sm" fw={600} mb={4}>
              {t("adaptationNeeds")}
            </Text>
            <Text size="sm" c="dimmed">
              {record.notes.adaptations || "—"}
            </Text>
          </Box>
        </Stack>
      </SectionCard>

      <SectionCard title={t("historyLog") || "History Log"}>
        <Stack gap="xs">
          <Text size="sm">
            <strong>{t("recordedAt") || "Recorded at"}:</strong> {new Date(record.createdAt).toLocaleString(undefined, {
              hour: "2-digit",
              minute: "2-digit",
              timeZoneName: "short",
              day: "2-digit",
              month: "2-digit",
              year: "numeric"
            })}
          </Text>
          {record.updateHistory?.map((timestamp, idx) => (
            <Text key={idx} size="sm">
              <strong>{t("updatedAt") || "Updated at"}:</strong> {new Date(timestamp).toLocaleString(undefined, {
                hour: "2-digit",
                minute: "2-digit",
                timeZoneName: "short",
                day: "2-digit",
                month: "2-digit",
                year: "numeric"
              })}
            </Text>
          ))}
          {!record.updateHistory?.length && record.updatedAt !== record.createdAt && (
            <Text size="sm">
              <strong>{t("updatedAt") || "Updated at"}:</strong> {new Date(record.updatedAt).toLocaleString(undefined, {
                hour: "2-digit",
                minute: "2-digit",
                timeZoneName: "short",
                day: "2-digit",
                month: "2-digit",
                year: "numeric"
              })}
            </Text>
          )}
        </Stack>
      </SectionCard>
    </Box>
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

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Paper withBorder p="md" radius="md" style={{ flex: 1 }}>
      <Text size="sm" c="dimmed" fw={500} style={{ textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </Text>
      <Text size="xl" mt={4} fw={800} color="kidex">
        {value}
      </Text>
    </Paper>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <Group gap={4} justify="flex-end" className="print-meta-row">
      <Text size="sm" fw={700}>{label}:</Text>
      <Text size="sm">{value}</Text>
    </Group>
  );
}

function StateDomainCard({
  domain,
}: {
  domain: ReturnType<typeof buildChildStateSummary>["domains"][number];
}) {
  const color = domain.status === "below_min" ? "red" : domain.status === "developing" ? "orange" : domain.status === "ready" ? "teal" : "gray";

  return (
    <Paper withBorder p="md" radius="md">
      <Stack gap={6}>
        <Group justify="space-between" align="center">
          <Text fw={700}>{domain.label}</Text>
          <Badge variant="light" color={color}>{domain.conductorLabel}</Badge>
        </Group>
        <Text size="sm" c="dimmed">Parent wording: {domain.parentLabel}</Text>
        <Text fw={700}>{typeof domain.average === "number" ? formatScore(domain.average) : "—"}</Text>
      </Stack>
    </Paper>
  );
}

function RecordRadarChart({
  title,
  data,
  domain,
  animate = true
}: {
  title: string;
  data: Array<{ label: string; value: number }>;
  domain: AssessmentDomain;
  animate?: boolean;
}) {
  const theme = useMantineTheme();
  const domainColor = getDomainMainColor(domain);
  return (
    <Paper withBorder p="sm">
      <Text size="sm" fw={700} mb="xs" c="dimmed" style={{ textTransform: "uppercase" }}>
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
            <Radar 
              dataKey="value" 
              stroke={domainColor} 
              fill={domainColor} 
              fillOpacity={0.25} 
              isAnimationActive={animate}
            />
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

function buildRadarData(sectionKey: string, record: AssessmentRecord, translateSchema: (key: string) => string) {
  const section = rapidSections.find((item) => item.key === sectionKey);
  if (!section) return [];

  return section.items.map((item) => {
    const score = record.scores[item.key]?.score;
    return {
      label: translateSchema(`${item.key}.title`),
      value: typeof score === "number" ? score : 0
    };
  });
}
