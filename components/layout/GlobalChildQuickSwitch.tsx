"use client";

import {
  Badge,
  Box,
  Button,
  Divider,
  Group,
  Modal,
  Paper,
  ScrollArea,
  Stack,
  Text,
  TextInput,
  UnstyledButton,
} from "@mantine/core";
import { useHotkeys, useMediaQuery } from "@mantine/hooks";
import { IconArrowRight, IconChecklist, IconClockHour4, IconFileDescription, IconSearch, IconUser } from "@tabler/icons-react";
import { startTransition, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { StateBlock } from "@doneisbetter/gds/client";
import { useRouter } from "@/i18n/navigation";
import {
  CHILD_QUICK_SWITCH_RECENTS_KEY,
  rankChildQuickSwitchResults,
  rememberQuickSwitchRecentChild,
  type ChildQuickSwitchResult,
  type ChildQuickSwitchTarget,
} from "@/lib/child-quick-switch";
import { canPerformAction } from "@/lib/permissions";
import type { ChildProfile } from "@/repositories/child.repository";
import type { SupportedRuntimeRole } from "@/lib/roles";

interface GlobalChildQuickSwitchProps {
  roles: SupportedRuntimeRole[];
}

type LoadState = "idle" | "loading" | "ready" | "error";

function shortcutLabel() {
  if (typeof navigator === "undefined") return "Ctrl+K";
  return navigator.userAgent.includes("Mac") ? "Cmd+K" : "Ctrl+K";
}

function initialRecentChildIds() {
  if (typeof window === "undefined") return [] as string[];

  try {
    const raw = window.localStorage.getItem(CHILD_QUICK_SWITCH_RECENTS_KEY);
    const parsed = JSON.parse(raw || "[]") as unknown;
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : [];
  } catch {
    return [] as string[];
  }
}

export function GlobalChildQuickSwitch({ roles }: GlobalChildQuickSwitchProps) {
  const t = useTranslations("Dashboard");
  const tc = useTranslations("Common");
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const canWriteAssessments = canPerformAction(roles, "assessments.write");
  const [opened, setOpened] = useState(false);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [error, setError] = useState("");
  const [recentChildIds, setRecentChildIds] = useState<string[]>(initialRecentChildIds);
  const mobile = useMediaQuery("(max-width: 48em)");

  const loadChildren = useCallback(() => {
    if (loadState === "loading") return;

    setLoadState("loading");
    setError("");

    fetch("/api/children?metrics=true")
      .then(async (response) => {
        if (!response.ok) {
          throw new Error((await response.json().catch(() => null))?.error || "SEARCH_LOAD_FAILED");
        }

        return response.json() as Promise<ChildProfile[]>;
      })
      .then((data) => {
        startTransition(() => {
          setChildren(Array.isArray(data) ? data : []);
          setLoadState("ready");
        });
      })
      .catch((loadError) => {
        setLoadState("error");
        setError(loadError instanceof Error ? loadError.message : "SEARCH_LOAD_FAILED");
      });
  }, [loadState]);

  const openQuickSwitch = useCallback(() => {
    if (loadState === "idle") {
      loadChildren();
    }
    setOpened(true);
  }, [loadChildren, loadState]);

  useHotkeys([
    [
      "mod+K",
      (event) => {
        event.preventDefault();
        openQuickSwitch();
      },
    ],
  ]);

  useEffect(() => {
    if (!opened) return;
    const timeout = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 40);
    return () => window.clearTimeout(timeout);
  }, [opened]);

  const results = useMemo(
    () =>
      rankChildQuickSwitchResults(children, deferredQuery, {
        canWriteAssessments,
        recentChildIds,
      }),
    [canWriteAssessments, children, deferredQuery, recentChildIds],
  );

  const recentResults = useMemo(() => {
    if (recentChildIds.length === 0) return [] as ChildQuickSwitchResult[];
    const byId = new Map(results.map((result) => [result.child._id || "", result]));
    return recentChildIds.map((id) => byId.get(id)).filter((result): result is ChildQuickSwitchResult => Boolean(result));
  }, [recentChildIds, results]);

  const topResults = deferredQuery ? results.slice(0, 8) : results.slice(0, 6);

  const storeRecentChild = (childId?: string) => {
    if (!childId || typeof window === "undefined") return;
    const next = rememberQuickSwitchRecentChild(recentChildIds, childId);
    setRecentChildIds(next);
    window.localStorage.setItem(CHILD_QUICK_SWITCH_RECENTS_KEY, JSON.stringify(next));
  };

  const navigateToTarget = (target: ChildQuickSwitchTarget, childId?: string) => {
    if (childId) storeRecentChild(childId);
    setOpened(false);
    setQuery("");
    router.push(target.href);
  };

  const renderResult = (result: ChildQuickSwitchResult) => (
    <Paper key={result.child._id || result.child.kidexId || result.child.name} withBorder p="sm" radius="md">
      <Stack gap="xs">
        <Group justify="space-between" align="flex-start" wrap="nowrap">
          <UnstyledButton onClick={() => navigateToTarget(result.primaryTarget, result.child._id)} style={{ flex: 1, textAlign: "left" }}>
            <Stack gap={4}>
              <Group gap="xs">
                <Text fw={700}>{result.child.name}</Text>
                {result.recent ? <Badge variant="light">{t("quickSwitchRecentBadge")}</Badge> : null}
                {result.followUpStatus === "overdue" ? <Badge color="red" variant="light">{t("quickSwitchOverdueBadge")}</Badge> : null}
                {result.followUpStatus === "due_soon" ? <Badge color="yellow" variant="light">{t("quickSwitchDueSoonBadge")}</Badge> : null}
              </Group>
              {result.subtitle ? (
                <Text size="sm" c="dimmed">
                  {result.subtitle}
                </Text>
              ) : null}
              {result.child.kidexId ? (
                <Text size="sm" c="dimmed">
                  {t("quickSwitchKidexId", { value: result.child.kidexId })}
                </Text>
              ) : null}
            </Stack>
          </UnstyledButton>
          <Button
            variant="subtle"
            size="compact-sm"
            rightSection={<IconArrowRight size={14} />}
            onClick={() => navigateToTarget(result.primaryTarget, result.child._id)}
          >
            {result.primaryTarget.kind === "record"
              ? t("quickSwitchOpenRecord")
              : result.primaryTarget.kind === "follow_up"
                ? t("quickSwitchOpenFollowUp")
                : t("quickSwitchOpenChild")}
          </Button>
        </Group>

        <Group gap="xs" wrap="wrap">
          <Button
            variant="default"
            size="sm"
            leftSection={<IconUser size={14} />}
            onClick={() => navigateToTarget({ kind: "child", href: `/dashboard/children/${result.child._id}` }, result.child._id)}
          >
            {t("quickSwitchOpenChild")}
          </Button>
          {result.child.latestRecordId ? (
            <Button
              variant="default"
              size="sm"
              leftSection={<IconFileDescription size={14} />}
              onClick={() => navigateToTarget({ kind: "record", href: `/dashboard/records/${result.child.latestRecordId}` }, result.child._id)}
            >
              {t("quickSwitchOpenRecord")}
            </Button>
          ) : null}
          {result.followUpStatus !== "none" ? (
            <Button
              variant="default"
              size="sm"
              leftSection={<IconClockHour4 size={14} />}
              onClick={() => navigateToTarget({ kind: "follow_up", href: `/dashboard/children/${result.child._id}` }, result.child._id)}
            >
              {t("quickSwitchOpenFollowUp")}
            </Button>
          ) : null}
          {canWriteAssessments ? (
            <Button
              variant="default"
              size="sm"
              leftSection={<IconChecklist size={14} />}
              onClick={() => navigateToTarget({ kind: "survey", href: `/dashboard/assessment?childId=${result.child._id}` }, result.child._id)}
            >
              {t("quickSwitchStartSurvey")}
            </Button>
          ) : null}
        </Group>
      </Stack>
    </Paper>
  );

  return (
    <>
      <Button variant="default" leftSection={<IconSearch size={16} />} onClick={openQuickSwitch}>
        {t("quickSwitchOpen")}
      </Button>

      <Modal
        opened={opened}
        onClose={() => {
          setOpened(false);
          setQuery("");
        }}
        title={t("quickSwitchTitle")}
        size="lg"
        fullScreen={mobile}
      >
        <Stack gap="md">
          <TextInput
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
            placeholder={t("quickSwitchPlaceholder")}
            leftSection={<IconSearch size={16} />}
            rightSection={<Text size="sm" c="dimmed">{shortcutLabel()}</Text>}
            aria-label={t("quickSwitchAriaLabel")}
          />

          {loadState === "loading" ? <StateBlock variant="loading" title={tc("loading")} compact /> : null}

          {loadState === "error" ? (
            <StateBlock
              variant="error"
              title={t("quickSwitchLoadErrorTitle")}
              description={t("quickSwitchLoadErrorDescription")}
              action={
                <Button variant="default" onClick={loadChildren}>
                  {t("quickSwitchRetry")}
                </Button>
              }
              compact
            />
          ) : null}

          {loadState === "ready" && children.length === 0 ? (
            <StateBlock
              variant="empty"
              title={t("quickSwitchNoChildrenTitle")}
              description={t("quickSwitchNoChildrenDescription")}
              compact
            />
          ) : null}

          {loadState === "ready" && children.length > 0 ? (
            <ScrollArea.Autosize mah={mobile ? "calc(100vh - 240px)" : 480}>
              <Stack gap="md">
                {!deferredQuery && recentResults.length > 0 ? (
                  <Stack gap="xs">
                    <Group justify="space-between">
                      <Text fw={700}>{t("quickSwitchRecentTitle")}</Text>
                      <Button
                        variant="subtle"
                        size="compact-sm"
                        onClick={() => {
                          setRecentChildIds([]);
                          if (typeof window !== "undefined") {
                            window.localStorage.removeItem(CHILD_QUICK_SWITCH_RECENTS_KEY);
                          }
                        }}
                      >
                        {t("quickSwitchClearRecent")}
                      </Button>
                    </Group>
                    {recentResults.map(renderResult)}
                    <Divider />
                  </Stack>
                ) : null}

                {topResults.length > 0 ? (
                  <Stack gap="xs">
                    <Text fw={700}>{deferredQuery ? t("quickSwitchResultsTitle") : t("quickSwitchSuggestedTitle")}</Text>
                    {topResults.map(renderResult)}
                  </Stack>
                ) : null}

                {deferredQuery && topResults.length === 0 ? (
                  <StateBlock
                    variant="empty"
                    title={t("quickSwitchNoResultsTitle")}
                    description={t("quickSwitchNoResultsDescription", { query: deferredQuery })}
                    compact
                  />
                ) : null}
              </Stack>
            </ScrollArea.Autosize>
          ) : null}

          {error ? (
            <Box>
              <Text size="sm" c="dimmed">
                {error}
              </Text>
            </Box>
          ) : null}
        </Stack>
      </Modal>
    </>
  );
}
