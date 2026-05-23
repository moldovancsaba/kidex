"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Alert, Badge, Box, Button, Group, Loader, Paper, Stack, Table, Text, useMantineTheme } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { useTranslations } from "next-intl";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { LongitudinalChart } from "@/components/analytics/LongitudinalChart";
import { SymmetryChart } from "@/components/analytics/SymmetryChart";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionCard } from "@/components/ui/SectionCard";
import { rapidSections } from "@/lib/kidex-schema";
import { getDomainMainColor, type AssessmentDomain } from "@/lib/domain-colors";
import { buildDashboardAnalytics } from "@/lib/dashboard-analytics";
import type { CultureAnalyticsSummary } from "@/lib/culture-surveys";
import { buildFollowUpQueue } from "@/lib/follow-up-queue";
import type { ChildProfile } from "@/repositories/child.repository";
import type { AssessmentRecord } from "@/types/assessment";
import type { User } from "@/services/user-service";
import type { KidexSettings } from "@/services/settings-service";
import { formatScore } from "@/lib/utils";

type DashboardData = {
  users: User[];
  assessments: AssessmentRecord[];
  children: ChildProfile[];
  settings: KidexSettings | null;
  cultureAnalytics: CultureAnalyticsSummary | null;
};

const DASHBOARD_CHART_CONFIG = {
  dayWindow: 30,
  chartHeight: 220,
  lineMargin: { top: 10, right: 8, left: -20, bottom: 8 },
  tickFontSize: 12,
  lineStrokeWidth: 2.5,
  dotRadius: 4,
  activeDotRadius: 5,
  tooltipRadius: 8,
  pieCx: "35%" as const,
  pieCy: "50%" as const,
  pieOuterRadius: 72,
  pieInnerRadius: 34,
} as const;
const CHART_FONT_FAMILY = 'var(--font-noto-sans), "Noto Sans", Helvetica, Arial, sans-serif';

function dayLabel(date: Date) {
  return new Intl.DateTimeFormat(undefined, { month: "2-digit", day: "2-digit" }).format(date);
}

export function MainDashboard() {
  const t = useTranslations("Dashboard");
  const tc = useTranslations("Common");
  const ts = useTranslations("Schema");
  const theme = useMantineTheme();
  const mobileLayout = useMediaQuery(`(max-width: ${theme.breakpoints.sm})`);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void Promise.all([
      fetch("/api/users").then((r) => r.json() as Promise<{ users: User[] }>),
      fetch("/api/assessments").then((r) => r.json() as Promise<{ assessments: AssessmentRecord[] }>),
      fetch("/api/children?metrics=true").then((r) => r.json() as Promise<ChildProfile[]>),
      fetch("/api/settings").then((r) => r.json() as Promise<KidexSettings>),
      fetch("/api/culture-surveys").then((r) => r.json()).catch(() => ({ analytics: null })),
    ])
      .then(([usersData, assessmentsData, childrenData, settingsData, cultureData]) => {
        setData({
          users: usersData.users ?? [],
          assessments: assessmentsData.assessments ?? [],
          children: Array.isArray(childrenData) ? childrenData : [],
          settings: settingsData ?? null,
          cultureAnalytics: cultureData?.analytics ?? null,
        });
      })
      .catch(() => setData({ users: [], assessments: [], children: [], settings: null, cultureAnalytics: null }))
      .finally(() => setLoading(false));
  }, []);

  const recordsByDay = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const days = Array.from({ length: DASHBOARD_CHART_CONFIG.dayWindow }, (_, idx) => {
      const d = new Date(now);
      d.setDate(now.getDate() - (DASHBOARD_CHART_CONFIG.dayWindow - 1 - idx));
      return { key: d.toISOString().slice(0, 10), label: dayLabel(d), count: 0 };
    });
    const indexByKey = new Map(days.map((d) => [d.key, d]));
    for (const record of data?.assessments ?? []) {
      const createdAt = new Date(record.createdAt);
      const key = new Date(createdAt.getFullYear(), createdAt.getMonth(), createdAt.getDate()).toISOString().slice(0, 10);
      const hit = indexByKey.get(key);
      if (hit) hit.count += 1;
    }
    return days;
  }, [data]);

  const dailyAverages = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const days = Array.from({ length: DASHBOARD_CHART_CONFIG.dayWindow }, (_, idx) => {
      const d = new Date(now);
      d.setDate(now.getDate() - (DASHBOARD_CHART_CONFIG.dayWindow - 1 - idx));
      return {
        key: d.toISOString().slice(0, 10),
        label: dayLabel(d),
        movement: 0,
        social: 0,
        mental: 0,
        mSum: 0,
        mCount: 0,
        sSum: 0,
        sCount: 0,
        pSum: 0,
        pCount: 0,
      };
    });

    const indexByKey = new Map(days.map((d) => [d.key, d]));

    for (const record of data?.assessments ?? []) {
      const createdAt = new Date(record.createdAt);
      const key = new Date(createdAt.getFullYear(), createdAt.getMonth(), createdAt.getDate()).toISOString().slice(0, 10);
      const hit = indexByKey.get(key);
      if (!hit) continue;
      if (record.computed.movementAverage) {
        hit.mSum += record.computed.movementAverage;
        hit.mCount += 1;
      }
      if (record.computed.socialAverage) {
        hit.sSum += record.computed.socialAverage;
        hit.sCount += 1;
      }
      if (record.computed.mentalAverage) {
        hit.pSum += record.computed.mentalAverage;
        hit.pCount += 1;
      }
    }

    return days.map((d) => ({
      ...d,
      movement: d.mCount ? Number((d.mSum / d.mCount).toFixed(2)) : 0,
      social: d.sCount ? Number((d.sSum / d.sCount).toFixed(2)) : 0,
      mental: d.pCount ? Number((d.pSum / d.pCount).toFixed(2)) : 0,
    }));
  }, [data]);

  const userRoleStats = useMemo(() => {
    const users = data?.users ?? [];
    const conductors = users.filter((u) => u.roles.includes("conductor")).length;
    const observers = users.filter((u) => u.roles.includes("observer")).length;
    return [
      { label: t("conductors"), count: conductors },
      { label: t("observers"), count: observers },
    ];
  }, [data, t]);

  const avgRecordsPerChild = useMemo(() => {
    const children = data?.children.length ?? 0;
    const records = data?.assessments.length ?? 0;
    if (children === 0) return "0.0";
    return (records / children).toFixed(1);
  }, [data]);

  const assessmentVelocity = useMemo(() => {
    if (!data?.assessments || data.assessments.length < 2) return "—";

    const byChild = new Map<string, number[]>();
    for (const assessment of data.assessments) {
      if (!assessment.childId) continue;
      if (!byChild.has(assessment.childId)) byChild.set(assessment.childId, []);
      byChild.get(assessment.childId)?.push(new Date(assessment.createdAt).getTime());
    }

    let totalDiff = 0;
    let totalGaps = 0;
    for (const times of byChild.values()) {
      if (times.length < 2) continue;
      times.sort((left, right) => left - right);
      for (let index = 1; index < times.length; index += 1) {
        totalDiff += times[index] - times[index - 1];
        totalGaps += 1;
      }
    }

    if (totalGaps === 0) return "—";
    const avgDays = totalDiff / (1000 * 60 * 60 * 24 * totalGaps);
    return `${avgDays.toFixed(0)} ${tc("days")}`;
  }, [data, tc]);

  const successRatio = useMemo(() => {
    if (!data?.assessments) return [];
    const latestByChild = new Map<string, { time: number; ski: number }>();
    for (const assessment of data.assessments) {
      const childKey = assessment.childId || `${assessment.child.name}|${assessment.child.birthDate}`;
      const time = new Date(assessment.createdAt).getTime();
      const current = latestByChild.get(childKey);
      if (!current || time > current.time) {
        latestByChild.set(childKey, { time, ski: assessment.computed.ski || 0 });
      }
    }

    let success = 0;
    let other = 0;
    for (const item of latestByChild.values()) {
      if (item.ski >= 3.5) success += 1;
      else other += 1;
    }

    if (success === 0 && other === 0) {
      return [{ name: "No data", value: 1, color: theme.colors.gray[6] }];
    }

    return [
      { name: t("ready"), value: success, color: theme.colors.kidex[6] },
      { name: t("developing"), value: other, color: theme.colors.gray[4] },
    ];
  }, [data, theme.colors.gray, theme.colors.kidex, t]);

  const locationPerformance = useMemo(() => {
    if (!data?.assessments) return [];
    const locMap = new Map<string, { sum: number; count: number }>();
    for (const assessment of data.assessments) {
      const location = assessment.session.location || "Unknown";
      if (!locMap.has(location)) locMap.set(location, { sum: 0, count: 0 });
      const stats = locMap.get(location);
      if (!stats || !assessment.computed.ski) continue;
      stats.sum += assessment.computed.ski;
      stats.count += 1;
    }

    return Array.from(locMap.entries())
      .map(([name, stats]) => ({
        name,
        value: Number((stats.sum / stats.count).toFixed(2)),
      }))
      .sort((left, right) => right.value - left.value);
  }, [data]);

  const globalBalance = useMemo(() => {
    if (!data?.assessments || data.assessments.length === 0) return [];
    let movement = 0;
    let social = 0;
    let mental = 0;
    let count = 0;
    for (const assessment of data.assessments) {
      if (assessment.computed.movementAverage !== null) {
        movement += assessment.computed.movementAverage;
        count += 1;
      }
      if (assessment.computed.socialAverage !== null) social += assessment.computed.socialAverage;
      if (assessment.computed.mentalAverage !== null) mental += assessment.computed.mentalAverage;
    }
    if (count === 0) return [];
    return [
      { domain: ts("movement"), value: Number((movement / count).toFixed(2)) },
      { domain: ts("social"), value: Number((social / count).toFixed(2)) },
      { domain: ts("mental"), value: Number((mental / count).toFixed(2)) },
    ];
  }, [data, ts]);

  const rapidDomainSummary = useMemo(() => buildRapidDomainSummary(data?.assessments ?? [], ts), [data, ts]);
  const analytics = useMemo(() => buildDashboardAnalytics({
    children: data?.children ?? [],
    assessments: data?.assessments ?? [],
    standards: data?.settings?.standards,
  }), [data]);
  const followUpQueue = useMemo(() => buildFollowUpQueue(data?.children ?? []), [data]);

  const operationalSections = (
    <>
      <SectionCard title="Reassessment Queue" subheader="Children who need follow-up attention first based on overdue, due-soon, or missing reassessment timing.">
        {followUpQueue.length === 0 ? (
          <Alert color="teal">No reassessment queue items need attention right now.</Alert>
        ) : (
          <Stack gap="sm">
            {followUpQueue.slice(0, 8).map((item) => (
              <Paper key={`${item.childId || item.childName}-${item.status}`} withBorder p="sm">
                <Group justify="space-between" align="flex-start" wrap="wrap">
                  <Stack gap={4} style={{ flex: 1, minWidth: 240 }}>
                    <Group gap="xs" wrap="wrap">
                      <Text fw={700}>{item.childName}</Text>
                      <Badge color={item.status === "overdue" ? "red" : item.status === "due_soon" ? "yellow" : "gray"} variant="light">
                        {item.status === "overdue" ? "Overdue" : item.status === "due_soon" ? "Due soon" : "Date missing"}
                      </Badge>
                      <Badge variant="outline">{item.ageGroup}</Badge>
                      {item.planStatus ? <Badge variant="light">{item.planStatus}</Badge> : null}
                    </Group>
                    <Text size="sm" c="dimmed">
                      {item.dueDate ? `Due ${new Date(item.dueDate).toLocaleDateString()}` : "No reassessment date set"}
                      {typeof item.latestSki === "number" ? ` • SKI ${formatScore(item.latestSki)}` : ""}
                    </Text>
                    <Text size="sm">{item.summary}</Text>
                    <Text size="sm" c="dimmed">{item.action}</Text>
                  </Stack>
                  <Group>
                    {item.childId ? (
                      <Button component={Link} href={`/dashboard/children/${item.childId}`} variant="default" size="sm">
                        {t("openChild")}
                      </Button>
                    ) : null}
                    {item.latestRecordId ? (
                      <Button component={Link} href={`/dashboard/records/${item.latestRecordId}`} color="kidex" variant="light" size="sm">
                        {t("openRecord")}
                      </Button>
                    ) : null}
                  </Group>
                </Group>
              </Paper>
            ))}
          </Stack>
        )}
      </SectionCard>

      <SectionCard title={t("watchlistTitle")} subheader={t("watchlistSubtitle")}>
        {analytics.watchlist.length === 0 ? (
          <Alert color="teal">{t("watchlistEmpty")}</Alert>
        ) : (
          <Stack gap="sm">
            {analytics.watchlist.map((item) => (
              <Paper key={`${item.childId || item.childName}-${item.latestRecordId || "none"}`} withBorder p="sm">
                <Group justify="space-between" align="flex-start" wrap="wrap">
                  <Stack gap={4} style={{ flex: 1, minWidth: 240 }}>
                    <Group gap="xs" wrap="wrap">
                      <Text fw={700}>{item.childName}</Text>
                      <Badge color={item.level === "high" ? "red" : item.level === "medium" ? "yellow" : "blue"} variant="light">
                        {t(`riskLevel.${item.level}`)}
                      </Badge>
                      <Badge color={item.band === "ready" ? "teal" : item.band === "developing" ? "yellow" : "red"} variant="light">
                        {t(`benchmarkBand.${item.band}`)}
                      </Badge>
                      <Badge variant="outline">{item.ageGroup}</Badge>
                    </Group>
                    <Text size="sm" c="dimmed">
                      {t("watchlistMeta", {
                        ski: formatScore(item.latestSki),
                        date: item.latestAssessmentAt ? new Date(item.latestAssessmentAt).toLocaleDateString() : "—",
                        score: item.score,
                      })}
                    </Text>
                    <Stack gap={2}>
                      {item.reasons.map((reason) => (
                        <Text key={reason} size="sm">• {reason}</Text>
                      ))}
                    </Stack>
                    <Text size="sm" c="dimmed">{item.action}</Text>
                  </Stack>
                  <Group>
                    {item.childId ? (
                      <Button component={Link} href={`/dashboard/children/${item.childId}`} variant="default" size="sm">
                        {t("openChild")}
                      </Button>
                    ) : null}
                    {item.latestRecordId ? (
                      <Button component={Link} href={`/dashboard/records/${item.latestRecordId}`} color="kidex" variant="light" size="sm">
                        {t("openRecord")}
                      </Button>
                    ) : null}
                  </Group>
                </Group>
              </Paper>
            ))}
          </Stack>
        )}
      </SectionCard>
    </>
  );

  if (loading) {
    return (
      <Box style={{ display: "flex", justifyContent: "center", paddingBlock: "2rem" }} role="status">
        <Loader aria-label={tc("loading")} />
      </Box>
    );
  }

  return (
    <Stack gap="lg">
      <PageHeader title={t("overview")} subtitle={t("overviewSubtitle")} />

      <Stack gap="md" style={{ flexDirection: "row", flexWrap: "wrap" }}>
        <MetricCard label={t("totalChildren")} value={String(data?.children.length ?? 0)} />
        <MetricCard label={t("totalRecords")} value={String(data?.assessments.length ?? 0)} />
        <MetricCard label={t("activeFollowUp")} value={String(analytics.activeChildren)} />
        <MetricCard label={t("staleFollowUp")} value={String(analytics.staleChildren)} />
        <MetricCard label={t("consentReviewNeeded")} value={String(analytics.childrenNeedingConsentReview)} />
      </Stack>
      <Text size="sm" c="dimmed">
        {t("insightAnalyticsSummary", {
          active: analytics.activeChildren,
          stale: analytics.staleChildren,
          consent: analytics.childrenNeedingConsentReview,
        })}
      </Text>

      {mobileLayout ? operationalSections : null}

      {data?.cultureAnalytics ? (
        <SectionCard title="Culture and trust pulse" subheader="Anonymous voice launches and culture-index signals across teams and institutions.">
          <Stack gap="md">
            <Stack gap="md" style={{ flexDirection: "row", flexWrap: "wrap" }}>
              <MetricCard label="Publishable launches" value={String(data.cultureAnalytics.headline.publishableLaunches)} />
              <MetricCard label="Total responses" value={String(data.cultureAnalytics.headline.totalResponses)} />
              <MetricCard label="Average culture index" value={formatScore(data.cultureAnalytics.headline.averageCultureIndex)} />
              <MetricCard label="Watch launches" value={String(data.cultureAnalytics.headline.watchCount)} />
            </Stack>
            <Stack gap="md" style={{ flexDirection: "row", flexWrap: "wrap" }}>
              <Box style={{ flex: "1 1 320px", minWidth: 0 }}>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={data.cultureAnalytics.trend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" tick={{ fontSize: 12, fontFamily: CHART_FONT_FAMILY }} />
                    <YAxis domain={[1, 5]} tick={{ fontSize: 12, fontFamily: CHART_FONT_FAMILY }} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="index" name="Culture index" stroke="var(--mantine-color-kidex-6)" strokeWidth={2.5} />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
              <Box style={{ flex: "1 1 320px", minWidth: 0 }}>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data.cultureAnalytics.roleComparison.map((entry) => ({ ...entry, role: entry.role }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="role" tick={{ fontSize: 12, fontFamily: CHART_FONT_FAMILY }} />
                    <YAxis domain={[0, 5]} tick={{ fontSize: 12, fontFamily: CHART_FONT_FAMILY }} />
                    <Tooltip />
                    <Bar dataKey="index" name="Role index" fill="var(--mantine-color-kidex-6)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </Stack>
            <Paper withBorder p={0}>
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Scope</Table.Th>
                    <Table.Th>Culture index</Table.Th>
                    <Table.Th>Launches</Table.Th>
                    <Table.Th>Latest pulse</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {data.cultureAnalytics.scorecards.length === 0 ? (
                    <Table.Tr>
                      <Table.Td colSpan={4}>
                        <Text size="sm" c="dimmed">No publishable culture launches yet.</Text>
                      </Table.Td>
                    </Table.Tr>
                  ) : data.cultureAnalytics.scorecards.map((card) => (
                    <Table.Tr key={card.scopeLabel}>
                      <Table.Td>{card.scopeLabel}</Table.Td>
                      <Table.Td>{formatScore(card.index)}</Table.Td>
                      <Table.Td>{card.launches}</Table.Td>
                      <Table.Td>{card.latestLabel}</Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Paper>
          </Stack>
        </SectionCard>
      ) : null}

      <SectionCard title={t("cohortTrajectoryTitle")} subheader={t("cohortTrajectorySubtitle")}>
        <Stack gap="md" style={{ flexDirection: "row", flexWrap: "wrap" }}>
          <Box style={{ flex: "1 1 260px" }}>
            <LongitudinalChart
              title={t("functionTrend")}
              data={analytics.monthlyTrend.map((point) => ({ date: point.label, value: point.function }))}
              color="var(--mantine-color-kidex-6)"
            />
          </Box>
          <Box style={{ flex: "1 1 260px" }}>
            <LongitudinalChart
              title={t("wellbeingTrend")}
              data={analytics.monthlyTrend.map((point) => ({ date: point.label, value: point.wellbeing }))}
              color="#FF922B"
            />
          </Box>
          <Box style={{ flex: "1 1 260px" }}>
            <LongitudinalChart
              title={t("readinessTrend")}
              data={analytics.monthlyTrend.map((point) => ({ date: point.label, value: point.readiness }))}
              color="#3BC9DB"
            />
          </Box>
        </Stack>
        <Text size="sm" c="dimmed">
          {t("insightCohortTrajectory", {
            readiness: formatScore(analytics.monthlyTrend.at(-1)?.readiness ?? 0),
            function: formatScore(analytics.monthlyTrend.at(-1)?.function ?? 0),
            wellbeing: formatScore(analytics.monthlyTrend.at(-1)?.wellbeing ?? 0),
          })}
        </Text>
      </SectionCard>

      <Stack gap="md" style={{ flexDirection: "row", flexWrap: "wrap" }}>
        <Box style={{ flex: "1 1 340px", minWidth: 0 }}>
          <ReadinessAgeBandChart data={analytics.readinessByAgeGroup} title={t("ageBandReadinessTitle")} subtitle={t("ageBandReadinessSubtitle")} />
        </Box>
        <Box style={{ flex: "1 1 340px", minWidth: 0 }}>
          <BenchmarkCoverageChart data={analytics.benchmarkCoverage} title={t("benchmarkCoverageTitle")} subtitle={t("benchmarkCoverageSubtitle")} />
        </Box>
      </Stack>

      <Stack gap="md" style={{ flexDirection: "row", flexWrap: "wrap" }}>
        <Box style={{ flex: "1 1 340px", minWidth: 0 }}>
          <OrientationMixChart data={analytics.orientationMix} title={t("orientationMixTitle")} subtitle={t("orientationMixSubtitle")} />
        </Box>
        <Box style={{ flex: "1 1 340px", minWidth: 0 }}>
          <RiskBucketChart data={analytics.riskBuckets} title={t("engagementRiskTitle")} subtitle={t("engagementRiskSubtitle")} />
        </Box>
      </Stack>

      {!mobileLayout ? operationalSections : null}

      <Stack gap="md" style={{ flexDirection: "row", flexWrap: "wrap" }}>
        <MetricCard label={t("totalUsers")} value={String(data?.users.length ?? 0)} />
        <MetricCard label={t("avgRecordsPerChild")} value={avgRecordsPerChild} />
        <MetricCard label={t("assessmentVelocity")} value={assessmentVelocity} />
        <MetricCard label="Overdue follow-ups" value={String(analytics.overdueFollowUps)} />
        <MetricCard label="Due soon" value={String(analytics.dueSoonFollowUps)} />
      </Stack>
      <Text size="sm" c="dimmed">{t("insightUsersRecords", { users: data?.users.length ?? 0, records: data?.assessments.length ?? 0, velocity: assessmentVelocity })}</Text>

      <Stack gap="md" style={{ flexDirection: "row", flexWrap: "wrap" }}>
        <Box style={{ flex: 1, minWidth: 320 }}>
          <SectionCard title={t("firstTimeSuccessTitle")} subheader={t("firstTimeSuccessSubtitle")}>
            <Box style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={successRatio} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                    {successRatio.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </Box>
            <Text size="sm" c="dimmed" mt="xs">
              {t("insightReadinessRatio", {
                ready: successRatio.find((item) => item.name === t("ready"))?.value ?? 0,
                developing: successRatio.find((item) => item.name === t("developing"))?.value ?? 0,
              })}
            </Text>
          </SectionCard>
        </Box>

        <Box style={{ flex: 1, minWidth: 320 }}>
          <SymmetryChart title={t("globalBalanceTitle")} data={globalBalance} />
          <Text size="sm" c="dimmed" mt="xs">
            {t("insightGlobalBalance", {
              movement: formatScore(globalBalance.find((item) => item.domain === ts("movement"))?.value ?? 0),
              social: formatScore(globalBalance.find((item) => item.domain === ts("social"))?.value ?? 0),
              mental: formatScore(globalBalance.find((item) => item.domain === ts("mental"))?.value ?? 0),
            })}
          </Text>
        </Box>
      </Stack>

      <SectionCard title={t("locationPerformanceTitle")} subheader={t("locationPerformanceSubtitle")}>
        <Box style={{ height: 240 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={locationPerformance} layout="vertical" margin={{ left: 40, right: 20 }}>
              <XAxis type="number" domain={[0, 6]} hide />
              <YAxis
                dataKey="name"
                type="category"
                tick={{ fontSize: 12, fill: "var(--mantine-color-text)" }}
                width={100}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: "transparent" }}
                contentStyle={{
                  background: "var(--mantine-color-body)",
                  border: "1px solid var(--mantine-color-default-border)",
                  borderRadius: DASHBOARD_CHART_CONFIG.tooltipRadius,
                }}
                labelStyle={{ color: "var(--mantine-color-text)" }}
                itemStyle={{ color: "var(--mantine-color-text)" }}
              />
              <Bar dataKey="value" fill="var(--mantine-color-kidex-6)" radius={[0, 4, 4, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </Box>
        <Text size="sm" c="dimmed">
          {t("insightLocationPerformance", {
            location: locationPerformance[0]?.name ?? "—",
            value: formatScore(locationPerformance[0]?.value ?? 0),
          })}
        </Text>
      </SectionCard>

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

      <Stack gap="md" style={{ flexDirection: "row", flexWrap: "wrap" }}>
        <Box style={{ flex: 1, minWidth: 0, display: "flex" }}>
          <SectionCard title={t("recordsChartTitle")} subheader={t("recordsChartSubtitle")} sx={{ width: "100%", height: "100%", mb: 0 }}>
            <RecordsLineChart points={recordsByDay} />
          </SectionCard>
        </Box>

        <Box style={{ flex: 1, minWidth: 0, display: "flex" }}>
          <SectionCard title={t("usersChartTitle")} subheader={t("usersChartSubtitle")} sx={{ width: "100%", height: "100%", mb: 0 }}>
            <UserRolePieChart items={userRoleStats} />
          </SectionCard>
        </Box>
      </Stack>

      <SectionCard title={t("dailyAverageTrendsTitle")} subheader={t("dailyAverageTrendsSubtitle")}>
        <Stack gap="lg">
          <DailyAverageBarChart title={ts("movement")} data={dailyAverages} dataKey="movement" domain="movement" />
          <DailyAverageBarChart title={ts("social")} data={dailyAverages} dataKey="social" domain="social" />
          <DailyAverageBarChart title={ts("mental")} data={dailyAverages} dataKey="mental" domain="mental" />
        </Stack>
        <Text size="sm" c="dimmed">
          {t("insightDailyAverages", {
            movement: formatScore(dailyAverages[dailyAverages.length - 1]?.movement ?? 0),
            social: formatScore(dailyAverages[dailyAverages.length - 1]?.social ?? 0),
            mental: formatScore(dailyAverages[dailyAverages.length - 1]?.mental ?? 0),
          })}
        </Text>
      </SectionCard>
    </Stack>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Paper withBorder p="md" style={{ flex: "1 1 180px" }}>
      <Text size="sm" c="dimmed">
        {label}
      </Text>
      <Text size="xl" fw={800}>
        {value}
      </Text>
    </Paper>
  );
}

function RecordsLineChart({ points }: { points: Array<{ key: string; label: string; count: number }> }) {
  const theme = useMantineTheme();
  const t = useTranslations("Dashboard");

  const values = points.map((point) => point.count);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const yMin = min === max ? Math.max(0, min - 1) : min;
  const yMax = min === max ? max + 1 : max;

  return (
    <Stack gap={6}>
      <Box style={{ width: "100%", height: DASHBOARD_CHART_CONFIG.chartHeight }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={DASHBOARD_CHART_CONFIG.lineMargin}>
            <CartesianGrid stroke={theme.colors.gray[4]} strokeDasharray="3 3" />
            <XAxis
              dataKey="label"
              stroke={theme.colors.gray[5]}
              tick={{ fontSize: DASHBOARD_CHART_CONFIG.tickFontSize, fill: "var(--mantine-color-text)", fontFamily: CHART_FONT_FAMILY }}
            />
            <YAxis
              domain={[yMin, yMax]}
              allowDecimals={false}
              stroke={theme.colors.gray[5]}
              tick={{ fontSize: DASHBOARD_CHART_CONFIG.tickFontSize, fill: "var(--mantine-color-text)", fontFamily: CHART_FONT_FAMILY }}
              width={28}
            />
            <Tooltip
              contentStyle={{
                background: theme.colors.dark[7],
                border: `1px solid ${theme.colors.dark[4]}`,
                borderRadius: DASHBOARD_CHART_CONFIG.tooltipRadius,
              }}
            />
            <Line
              type="monotone"
              dataKey="count"
              stroke={theme.colors.kidex[6]}
              strokeWidth={DASHBOARD_CHART_CONFIG.lineStrokeWidth}
              dot={{ r: DASHBOARD_CHART_CONFIG.dotRadius, fill: theme.colors.kidex[6] }}
              activeDot={{ r: DASHBOARD_CHART_CONFIG.activeDotRadius }}
            />
          </LineChart>
        </ResponsiveContainer>
      </Box>
      <Text size="sm" c="dimmed">
        {t("recordsChartYRange", { min: yMin, max: yMax })}
      </Text>
    </Stack>
  );
}

function UserRolePieChart({ items }: { items: Array<{ label: string; count: number }> }) {
  const theme = useMantineTheme();
  const chartData = items.map((item) => ({ name: item.label, value: item.count }));
  const colors = [theme.colors.kidex[6], theme.black];

  return (
    <Box style={{ width: "100%", height: DASHBOARD_CHART_CONFIG.chartHeight }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip
            contentStyle={{
              background: theme.colors.dark[7],
              border: `1px solid ${theme.colors.dark[4]}`,
              borderRadius: DASHBOARD_CHART_CONFIG.tooltipRadius,
            }}
          />
          <Legend verticalAlign="middle" align="right" layout="vertical" wrapperStyle={{ fontFamily: CHART_FONT_FAMILY, color: "var(--mantine-color-text)" }} />
          <Pie data={chartData} dataKey="value" nameKey="name" cx={DASHBOARD_CHART_CONFIG.pieCx} cy={DASHBOARD_CHART_CONFIG.pieCy} outerRadius={DASHBOARD_CHART_CONFIG.pieOuterRadius} innerRadius={DASHBOARD_CHART_CONFIG.pieInnerRadius}>
            {chartData.map((entry, index) => (
              <Cell key={`slice-${entry.name}`} fill={colors[index % colors.length]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </Box>
  );
}

function ReadinessAgeBandChart({
  data,
  title,
  subtitle,
}: {
  data: Array<{ ageGroup: string; watch: number; developing: number; ready: number }>;
  title: string;
  subtitle: string;
}) {
  return (
    <SectionCard title={title} subheader={subtitle} sx={{ mb: 0 }}>
      <Box style={{ width: "100%", height: 240 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="ageGroup" tick={{ fontSize: 12, fill: "var(--mantine-color-text)", fontFamily: CHART_FONT_FAMILY }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "var(--mantine-color-text)", fontFamily: CHART_FONT_FAMILY }} />
            <Tooltip />
            <Legend />
            <Bar dataKey="ready" stackId="readiness" fill="#40C057" name="Ready" radius={[4, 4, 0, 0]} />
            <Bar dataKey="developing" stackId="readiness" fill="#FAB005" name="Developing" />
            <Bar dataKey="watch" stackId="readiness" fill="#FA5252" name="Watchlist" />
          </BarChart>
        </ResponsiveContainer>
      </Box>
    </SectionCard>
  );
}

function BenchmarkCoverageChart({
  data,
  title,
  subtitle,
}: {
  data: Array<{ ageGroup: string; meetingTarget: number; onTrack: number; belowMinimum: number }>;
  title: string;
  subtitle: string;
}) {
  return (
    <SectionCard title={title} subheader={subtitle} sx={{ mb: 0 }}>
      <Box style={{ width: "100%", height: 240 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="ageGroup" tick={{ fontSize: 12, fill: "var(--mantine-color-text)", fontFamily: CHART_FONT_FAMILY }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "var(--mantine-color-text)", fontFamily: CHART_FONT_FAMILY }} />
            <Tooltip />
            <Legend />
            <Bar dataKey="meetingTarget" stackId="coverage" fill="#2F9E44" name="Meeting target" radius={[4, 4, 0, 0]} />
            <Bar dataKey="onTrack" stackId="coverage" fill="#4DABF7" name="Between min and target" />
            <Bar dataKey="belowMinimum" stackId="coverage" fill="#F03E3E" name="Below minimum" />
          </BarChart>
        </ResponsiveContainer>
      </Box>
    </SectionCard>
  );
}

function OrientationMixChart({
  data,
  title,
  subtitle,
}: {
  data: Array<{ label: string; count: number }>;
  title: string;
  subtitle: string;
}) {
  const colors = ["#4DABF7", "#FF922B", "#845EF7", "#20C997"];
  return (
    <SectionCard title={title} subheader={subtitle} sx={{ mb: 0 }}>
      <Box style={{ width: "100%", height: 240 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="count" nameKey="label" outerRadius={80} innerRadius={40}>
              {data.map((entry, index) => (
                <Cell key={entry.label} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </Box>
    </SectionCard>
  );
}

function RiskBucketChart({
  data,
  title,
  subtitle,
}: {
  data: { high: number; medium: number; low: number };
  title: string;
  subtitle: string;
}) {
  const chartData = [
    { label: "High", value: data.high, color: "#FA5252" },
    { label: "Medium", value: data.medium, color: "#FAB005" },
    { label: "Low", value: data.low, color: "#4DABF7" },
  ];

  return (
    <SectionCard title={title} subheader={subtitle} sx={{ mb: 0 }}>
      <Box style={{ width: "100%", height: 240 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 12, fill: "var(--mantine-color-text)", fontFamily: CHART_FONT_FAMILY }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "var(--mantine-color-text)", fontFamily: CHART_FONT_FAMILY }} />
            <Tooltip />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {chartData.map((entry) => (
                <Cell key={entry.label} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Box>
    </SectionCard>
  );
}

interface DailyAveragePoint {
  label: string;
  movement: number;
  social: number;
  mental: number;
}

function DailyAverageBarChart({
  title,
  data,
  dataKey,
  domain,
}: {
  title: string;
  data: DailyAveragePoint[];
  dataKey: keyof Omit<DailyAveragePoint, "label">;
  domain: AssessmentDomain;
}) {
  const theme = useMantineTheme();
  const barColor = getDomainMainColor(domain);

  return (
    <Paper withBorder p="md">
      <Stack gap="xs">
        <Text fw={700} size="sm">{title}</Text>
        <Box style={{ width: "100%", height: 140 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 10, left: -30, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.colors.gray[3]} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 9, fill: "var(--mantine-color-text)", fontFamily: CHART_FONT_FAMILY }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[0, 6]}
                tick={{ fontSize: 9, fill: "var(--mantine-color-text)", fontFamily: CHART_FONT_FAMILY }}
                axisLine={false}
                tickLine={false}
                width={30}
              />
              <Tooltip
                cursor={{ fill: "rgba(0,0,0,0.05)" }}
                contentStyle={{
                  borderRadius: "var(--mantine-radius-md)",
                  border: "1px solid var(--mantine-color-default-border)",
                  fontFamily: CHART_FONT_FAMILY,
                  fontSize: "12px",
                }}
              />
              <Bar dataKey={dataKey} radius={[3, 3, 0, 0]} barSize={12}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={barColor} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Box>
      </Stack>
    </Paper>
  );
}

function RapidRadarChart({
  title,
  data,
  domain,
}: {
  title: string;
  data: Array<{ label: string; value: number }>;
  domain: AssessmentDomain;
}) {
  const theme = useMantineTheme();
  const domainColor = getDomainMainColor(domain);

  return (
    <Paper withBorder p="sm">
      <Text fw={600} mb={6}>
        {title}
      </Text>
      <Box style={{ width: "100%", height: DASHBOARD_CHART_CONFIG.chartHeight }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data}>
            <PolarGrid stroke={theme.colors.gray[4]} />
            <PolarAngleAxis dataKey="label" tick={{ fontSize: DASHBOARD_CHART_CONFIG.tickFontSize, fill: "var(--mantine-color-text)", fontFamily: CHART_FONT_FAMILY }} />
            <PolarRadiusAxis angle={90} domain={[0, 6]} tickCount={4} tick={(props) => renderRotatedRadiusTick(props)} stroke={theme.colors.gray[6]} />
            <Tooltip
              contentStyle={{
                background: theme.colors.dark[7],
                border: `1px solid ${theme.colors.dark[4]}`,
                borderRadius: DASHBOARD_CHART_CONFIG.tooltipRadius,
              }}
            />
            <Radar dataKey="value" stroke={domainColor} fill={domainColor} fillOpacity={0.28} />
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
      fontSize={DASHBOARD_CHART_CONFIG.tickFontSize}
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
        value: count ? Number((sum / count).toFixed(2)) : 0,
      };
    });
  };

  return {
    movement: buildDomain("rapid_movement"),
    social: buildDomain("rapid_social"),
    mental: buildDomain("rapid_mental"),
  };
}
