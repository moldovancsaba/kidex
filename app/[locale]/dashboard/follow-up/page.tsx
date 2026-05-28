"use client";

import { useEffect, useMemo, useState } from "react";
import { Alert, Badge, Button, Group, MultiSelect, Paper, Stack, Text, TextInput, useMantineTheme } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { AdminPageHeader as PageHeader, ResponsiveDataView, type ResponsiveDataViewFilterChip } from "@doneisbetter/gds/client";
import type { DataTableColumn } from "@doneisbetter/gds/client";
import { DataToolbar, FilterDrawer, LoadingState, ProductCard, SectionCard } from "@/components/gds-local/core";
import { buildFollowUpQueue, type FollowUpQueueItem } from "@/lib/follow-up-queue";
import type { ChildProfile } from "@/repositories/child.repository";
import { canPerformAction } from "@/lib/permissions";
import type { SupportedRuntimeRole } from "@/lib/roles";
import { formatScore } from "@/lib/utils";

type FollowUpRow = FollowUpQueueItem & Record<string, unknown>;

const FOLLOW_UP_STATUS_OPTIONS = [
  { value: "overdue", label: "Overdue" },
  { value: "due_soon", label: "Due soon" },
  { value: "missing", label: "Date missing" },
];

const FOLLOW_UP_BLOCKER_OPTIONS = [
  { value: "consent_expired", label: "Consent expired" },
  { value: "consent_future", label: "Consent not active yet" },
  { value: "no_latest_record", label: "No latest record linked" },
];

export default function FollowUpActionCenterPage() {
  const t = useTranslations("Dashboard");
  const tc = useTranslations("Common");
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [roles, setRoles] = useState<SupportedRuntimeRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedBlockers, setSelectedBlockers] = useState<string[]>([]);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const theme = useMantineTheme();
  const mobileLayout = useMediaQuery(`(max-width: ${theme.breakpoints.sm})`);

  useEffect(() => {
    let active = true;

    void Promise.all([
      fetch("/api/children?metrics=true").then((res) => res.json()).catch(() => []),
      fetch("/api/auth/me").then((res) => res.json()).catch(() => null),
    ])
      .then(([childrenData, meData]) => {
        if (!active) return;
        setChildren(Array.isArray(childrenData) ? childrenData : []);
        setRoles(meData?.user?.roles || []);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const canWriteAssessments = canPerformAction(roles, "assessments.write");
  const queue = useMemo(() => buildFollowUpQueue(children), [children]);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return queue.filter((item) => {
      const matchesQuery =
        !normalizedQuery ||
        item.childName.toLowerCase().includes(normalizedQuery) ||
        item.ageGroup.toLowerCase().includes(normalizedQuery) ||
        item.reasonLabel.toLowerCase().includes(normalizedQuery);

      if (!matchesQuery) return false;
      if (selectedStatuses.length > 0 && !selectedStatuses.includes(item.status)) return false;
      if (selectedBlockers.length > 0 && !item.blockerCodes.some((code) => selectedBlockers.includes(code))) return false;
      return true;
    });
  }, [query, queue, selectedBlockers, selectedStatuses]);

  const filteredRows = filtered as FollowUpRow[];
  const activeFilters = useMemo<ResponsiveDataViewFilterChip[]>(
    () => [
      ...selectedStatuses.map((value) => ({
        label: value.replace("_", " "),
        onRemove: () => setSelectedStatuses((current) => current.filter((item) => item !== value)),
      })),
      ...selectedBlockers.map((value) => ({
        label: value.replaceAll("_", " "),
        onRemove: () => setSelectedBlockers((current) => current.filter((item) => item !== value)),
      })),
    ],
    [selectedBlockers, selectedStatuses],
  );

  const resetFilters = () => {
    setSelectedStatuses([]);
    setSelectedBlockers([]);
  };

  const columns = useMemo<DataTableColumn<FollowUpRow>[]>(
    () => [
      { key: "child", label: t("children"), render: (item) => item.childName },
      { key: "reason", label: t("followUpReason"), render: (item) => item.reasonLabel },
      {
        key: "dueDate",
        label: t("followUpDueDate"),
        render: (item) => (item.dueDate ? new Date(item.dueDate).toLocaleDateString() : t("followUpMissingDate")),
      },
      {
        key: "blockers",
        label: t("followUpBlockers"),
        render: (item) => (item.hasBlockers ? item.blockerCodes.join(", ").replaceAll("_", " ") : "—"),
      },
      {
        key: "actions",
        label: tc("actions"),
        render: (item) => (
          <Group gap="sm" wrap="nowrap">
            {item.primaryTargetHref ? (
              <Button component={Link} href={item.primaryTargetHref} variant="default" size="sm">
                {t("followUpPrimaryAction")}
              </Button>
            ) : null}
            {item.recordTargetHref ? (
              <Button component={Link} href={item.recordTargetHref} color="kidex" variant="light" size="sm">
                {t("openRecord")}
              </Button>
            ) : null}
          </Group>
        ),
      },
    ],
    [t, tc],
  );

  const filterPanel = (
    <Paper withBorder p="md">
      <Stack gap="md">
        <MultiSelect
          label={t("followUpStatus")}
          placeholder={tc("all")}
          data={FOLLOW_UP_STATUS_OPTIONS}
          value={selectedStatuses}
          onChange={setSelectedStatuses}
          clearable
        />
        <MultiSelect
          label={t("followUpBlockers")}
          placeholder={tc("all")}
          data={FOLLOW_UP_BLOCKER_OPTIONS}
          value={selectedBlockers}
          onChange={setSelectedBlockers}
          clearable
        />
        <Group justify="space-between" align="center">
          <Text size="sm" c="dimmed">
            {t("followUpActionCenterHint")}
          </Text>
          <Button variant="subtle" size="sm" onClick={resetFilters}>
            {tc("resetFilters")}
          </Button>
        </Group>
      </Stack>
    </Paper>
  );

  if (loading) {
    return <LoadingState label={tc("loading")} minHeight="12rem" />;
  }

  return (
    <Stack gap="md">
      <PageHeader
        title={t("followUpCenter")}
        description={t("followUpCenterDescription")}
        primaryAction={
          <Button variant="default" onClick={() => window.location.reload()}>
            {t("followUpRefresh")}
          </Button>
        }
      />

      <SectionCard>
        <Stack gap="md">
          <DataToolbar
            searchSlot={
              <TextInput
                aria-label={t("followUpSearch")}
                placeholder={t("followUpSearchPlaceholder")}
                value={query}
                onChange={(event) => setQuery(event.currentTarget.value)}
              />
            }
            createAction={
              <Button
                variant="light"
                color="gray"
                onClick={() => (mobileLayout ? setMobileFiltersOpen(true) : setShowFilters((current) => !current))}
              >
                {t("followUpFilters")}
              </Button>
            }
            filterSlot={!mobileLayout && showFilters ? filterPanel : null}
            activeFilters={activeFilters}
          />

          {queue.length === 0 ? (
            <Alert color="teal">{t("followUpEmpty")}</Alert>
          ) : null}

          <ResponsiveDataView<FollowUpRow>
            data={filteredRows}
            columns={columns}
            emptyTitle={t("followUpEmpty")}
            emptyDescription={t("followUpEmptyDescription")}
            activeFilters={activeFilters}
            toolbar={null}
            mobileFilters={
              activeFilters.length > 0 ? (
                <Button size="sm" variant="subtle" onClick={resetFilters}>
                  {tc("resetFilters")}
                </Button>
              ) : null
            }
            filterDrawer={
              <FilterDrawer
                opened={mobileFiltersOpen}
                onClose={() => setMobileFiltersOpen(false)}
                title={t("followUpFilters")}
                position="bottom"
                size="85%"
                primaryAction={<Button color="kidex" onClick={() => setMobileFiltersOpen(false)}>{tc("view")}</Button>}
              >
                {filterPanel}
              </FilterDrawer>
            }
            renderCard={(item) => (
              <ProductCard
                title={item.childName}
                description={`${item.reasonLabel} · ${item.dueDate ? new Date(item.dueDate).toLocaleDateString() : t("followUpMissingDate")}`}
                onClick={() => item.primaryTargetHref ? (window.location.href = item.primaryTargetHref) : undefined}
                status={
                  <Badge color={item.status === "overdue" ? "red" : item.status === "due_soon" ? "yellow" : "grape"} variant="filled" size="sm">
                    {item.status === "overdue" ? "Overdue" : item.status === "due_soon" ? "Due soon" : "Missing date"}
                  </Badge>
                }
                metadata={[
                  { label: t("followUpAgeGroup"), value: item.ageGroup || "—" },
                  { label: "SKI", value: typeof item.latestSki === "number" ? formatScore(item.latestSki) : "—" },
                  { label: t("followUpBlockers"), value: item.hasBlockers ? item.blockerCodes.join(", ").replaceAll("_", " ") : "—" },
                ]}
                footer={
                  <Stack gap="xs">
                    <Text size="sm">{item.summary}</Text>
                    <Text size="sm" c="dimmed">{item.action}</Text>
                    {item.blockerSummary ? <Text size="sm" c="red">{item.blockerSummary}</Text> : null}
                  </Stack>
                }
                primaryAction={
                  item.primaryTargetHref ? (
                    <Button component={Link} href={item.primaryTargetHref} color="kidex" size="sm" onClick={(event) => event.stopPropagation()}>
                      {t("followUpPrimaryAction")}
                    </Button>
                  ) : null
                }
                secondaryActions={[
                  ...(item.recordTargetHref
                    ? [{ label: t("openRecord"), href: item.recordTargetHref }]
                    : []),
                  ...(canWriteAssessments && item.surveyTargetHref
                    ? [{ label: t("quickSwitchStartSurvey"), href: item.surveyTargetHref }]
                    : []),
                ]}
              />
            )}
            getRowKey={(item) => item.childId || item.childName}
          />
        </Stack>
      </SectionCard>
    </Stack>
  );
}
