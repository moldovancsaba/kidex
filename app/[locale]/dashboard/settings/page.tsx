"use client";

import { useEffect, useState } from "react";
import { Alert, Badge, Box, Button, Checkbox, Divider, Group, Loader, MultiSelect, NumberInput, Paper, Select, Stack, Table, Tabs, Text, Textarea, TextInput } from "@mantine/core";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { DEFAULT_KIDEX_SETTINGS, getSettings, type KidexSettings, saveSettings } from "@/services/settings-service";
import { getUsers, saveUser, type User } from "@/services/user-service";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionCard } from "@/components/ui/SectionCard";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import type { AuditLogEntry } from "@/repositories/audit.repository";
import { normalizeInstitutionId } from "@/lib/institutions";
import { canPerformAction } from "@/lib/permissions";
import type { SupportedRuntimeRole } from "@/lib/roles";
import type { StandardsAgeGroup, StandardsDomain } from "@/lib/standards-config";
import { computeReadinessImpactPreview, formulaWeightPercentages, summarizeVersionThresholds, validateStandardsVersion } from "@/lib/standards-governance";

interface CurrentUser {
  email: string;
  name?: string;
  roles: SupportedRuntimeRole[];
  institutionIds?: string[];
  primaryInstitutionId?: string;
  isGoogleLinked: boolean;
}

interface AssessmentSummary {
  _id?: string;
  child?: { name?: string; ageGroup?: string };
  childId?: string;
  session?: { date?: string; consentReport?: boolean };
  standardsVersionUsed?: string;
  computed: { ski: number | null };
}

const DEFAULT_INSTITUTION = "default";

function institutionOptions(settings: KidexSettings) {
  return settings.institutions
    .filter((institution) => institution.status === "active")
    .map((institution) => ({
      value: institution.id,
      label: institution.name,
    }));
}

export default function SettingsPage() {
  const t = useTranslations("Dashboard");
  const tc = useTranslations("Common");
  const tl = useTranslations("Legal");
  const params = useParams();
  const locale = params.locale as string;

  const [settings, setSettings] = useState<KidexSettings>(DEFAULT_KIDEX_SETTINGS);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [locationDraft, setLocationDraft] = useState("");
  const [userDraft, setUserDraft] = useState("");
  const [userNameDraft, setUserNameDraft] = useState("");
  const [institutionNameDraft, setInstitutionNameDraft] = useState("");
  const [institutionIdDraft, setInstitutionIdDraft] = useState("");
  const [me, setMe] = useState<CurrentUser | null>(null);
  const [deletedChildren, setDeletedChildren] = useState<Array<{ _id?: string; name: string; updatedAt?: string }>>([]);
  const [deletedAssessments, setDeletedAssessments] = useState<Array<{ _id?: string; child?: { name?: string }; session?: { date?: string }; updatedAt?: string }>>([]);
  const [newStandardsVersion, setNewStandardsVersion] = useState("");
  const [versionNotesDraft, setVersionNotesDraft] = useState("");
  const [selectedStandardsVersion, setSelectedStandardsVersion] = useState(DEFAULT_KIDEX_SETTINGS.standards.activeVersion);
  const [impactPreview, setImpactPreview] = useState<{ readyToDeveloping: number; developingToReady: number; total: number } | null>(null);
  const [allAssessments, setAllAssessments] = useState<AssessmentSummary[]>([]);
  const [governanceMetrics, setGovernanceMetrics] = useState<{ deletedChildren: number; deletedAssessments: number; missingConsentReport: number; missingChildLink: number }>({ deletedChildren: 0, deletedAssessments: 0, missingConsentReport: 0, missingChildLink: 0 });
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);

  useEffect(() => {
    void (async () => {
      try {
        const [sData, uData, meRes] = await Promise.all([
          getSettings(),
          getUsers(),
          fetch("/api/auth/me").then((r) => r.json()).catch(() => null),
        ]);
        setSettings(sData);
        setSelectedStandardsVersion(sData.standards.activeVersion);
        setVersionNotesDraft(sData.standards.versions[sData.standards.activeVersion]?.meta?.notes || "");
        setUsers(uData);
        if (meRes?.user) setMe(meRes.user);
        if (meRes?.user?.roles?.includes("admin")) {
          const auditRes = await fetch("/api/audit?limit=25").then((res) => res.json()).catch(() => ({ logs: [] }));
          setAuditLogs(Array.isArray(auditRes?.logs) ? auditRes.logs : []);
        }

        const [dcRes, daRes, activeAssessmentsRes] = await Promise.all([
          fetch("/api/children?deleted=true").then((r) => r.json()).catch(() => []),
          fetch("/api/assessments?deleted=true").then((r) => r.json()).catch(() => ({ assessments: [] })),
          fetch("/api/assessments").then((r) => r.json()).catch(() => ({ assessments: [] })),
        ]);

        const activeAssessments = Array.isArray(activeAssessmentsRes?.assessments) ? activeAssessmentsRes.assessments : [];
        setAllAssessments(activeAssessments);
        setDeletedChildren(Array.isArray(dcRes) ? dcRes : []);
        setDeletedAssessments(Array.isArray(daRes?.assessments) ? daRes.assessments : []);
        setGovernanceMetrics({
          deletedChildren: Array.isArray(dcRes) ? dcRes.length : 0,
          deletedAssessments: Array.isArray(daRes?.assessments) ? daRes.assessments.length : 0,
          missingConsentReport: activeAssessments.filter((assessment: AssessmentSummary) => !assessment.session?.consentReport).length,
          missingChildLink: activeAssessments.filter((assessment: AssessmentSummary) => !assessment.childId).length,
        });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const roles = me?.roles || [];
  const isAdmin = roles.includes("admin");
  const canWriteUsers = canPerformAction(roles, "users.write");
  const canDeleteUsers = canPerformAction(roles, "users.delete");
  const canSendInvites = canPerformAction(roles, "invites.send");
  const canWriteSettings = canPerformAction(roles, "settings.write");
  const canRestoreRecords = canPerformAction(roles, "children.restore");
  const defaultInstitutionIds = me?.institutionIds?.length ? me.institutionIds : [DEFAULT_INSTITUTION];
  const defaultPrimaryInstitutionId = me?.primaryInstitutionId || defaultInstitutionIds[0] || DEFAULT_INSTITUTION;
  const selectedVersionName = settings.standards.versions[selectedStandardsVersion]
    ? selectedStandardsVersion
    : settings.standards.activeVersion;
  const selectedVersion = settings.standards.versions[selectedVersionName];
  const selectedVersionMeta = selectedVersion?.meta || { status: "draft" as const, notes: "" };
  const selectedVersionIssues = selectedVersion ? validateStandardsVersion(selectedVersion) : [];
  const blockingVersionIssues = selectedVersionIssues.filter((issue) => issue.severity === "error");
  const selectedVersionSummary = selectedVersion ? summarizeVersionThresholds(selectedVersion) : null;
  const selectedFormulaPercentages = formulaWeightPercentages(selectedVersion?.formula);

  async function handleSaveSettings() {
    if (!canWriteSettings) return;
    setSaving(true);
    const ok = await saveSettings(settings);
    setMessage(ok ? tc("success") : tc("error"));
    setSaving(false);
  }

  async function restoreChild(id?: string) {
    if (!id || !canRestoreRecords) return;
    const res = await fetch(`/api/children/${id}/restore`, { method: "POST" }).catch(() => null);
    if (!res?.ok) return setMessage(tc("error"));
    setDeletedChildren((prev) => prev.filter((x) => x._id !== id));
    setMessage(tc("success"));
  }

  async function restoreAssessment(id?: string) {
    if (!id || !canRestoreRecords) return;
    const res = await fetch(`/api/assessments/${id}`, { method: "POST" }).catch(() => null);
    if (!res?.ok) return setMessage(tc("error"));
    setDeletedAssessments((prev) => prev.filter((x) => x._id !== id));
    setMessage(tc("success"));
  }

  async function toggleRole(user: User, role: SupportedRuntimeRole) {
    if (!canWriteUsers) return;
    if (!isAdmin && role === "admin") return;
    const nextRoles = user.roles.includes(role) ? user.roles.filter((r) => r !== role) : [...user.roles, role];
    const updatedUser = { ...user, roles: nextRoles };
    const previousUsers = users;
    setUsers((prev) => prev.map((entry) => (entry.email === user.email ? updatedUser : entry)));
    const ok = await saveUser(updatedUser);
    if (!ok) {
      setUsers(previousUsers);
      setMessage(tc("error"));
      return;
    }
    setMessage(tc("success"));
  }

  function updateUserInstitutions(userEmail: string, institutionIds: string[]) {
    const nextInstitutionIds = institutionIds.length > 0 ? institutionIds : [DEFAULT_INSTITUTION];
    setUsers((prev) => prev.map((user) => (
      user.email === userEmail
        ? {
            ...user,
            institutionIds: nextInstitutionIds,
            primaryInstitutionId: nextInstitutionIds.includes(user.primaryInstitutionId || "") ? user.primaryInstitutionId : nextInstitutionIds[0],
          }
        : user
    )));
  }

  function updateUserPrimaryInstitution(userEmail: string, primaryInstitutionId: string | null) {
    if (!primaryInstitutionId) return;
    setUsers((prev) => prev.map((user) => (
      user.email === userEmail && (user.institutionIds || []).includes(primaryInstitutionId)
        ? { ...user, primaryInstitutionId }
        : user
    )));
  }

  function addNewUser() {
    if (!canWriteUsers) return;
    const email = userDraft.trim().toLowerCase();
    if (!email) return;

    const newUser: User = {
      email,
      name: userNameDraft.trim() || undefined,
      roles: [],
      institutionIds: defaultInstitutionIds,
      primaryInstitutionId: defaultPrimaryInstitutionId,
    };

    setUsers((prev) => [...prev, newUser]);
    setUserDraft("");
    setUserNameDraft("");

    void saveUser(newUser).then((ok) => {
      if (!ok) {
        setUsers((prev) => prev.filter((user) => user.email !== email));
        setMessage(tc("error"));
        return;
      }

      if (!canSendInvites) {
        setMessage(tc("success"));
        return;
      }

      void fetch("/api/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, locale }),
      }).then(async (res) => {
        const data = await res.json();
        if (data.error) {
          setMessage(`Error: ${data.error}`);
        } else if (data.message) {
          setMessage(data.message);
        } else {
          setMessage(tc("success"));
        }
      });
    });
  }

  function addInstitution() {
    if (!canWriteSettings) return;
    const nextId = normalizeInstitutionId(institutionIdDraft || institutionNameDraft);
    const nextName = institutionNameDraft.trim();
    if (!nextId || !nextName) return;
    if (settings.institutions.some((institution) => institution.id === nextId)) return;
    setSettings((prev) => ({
      ...prev,
      institutions: [
        ...prev.institutions,
        { id: nextId, name: nextName, status: "active" as const },
      ],
    }));
    setInstitutionIdDraft("");
    setInstitutionNameDraft("");
  }

  function updateInstitutionField(institutionId: string, field: "name" | "status" | "notes", value: string) {
    if (!canWriteSettings) return;
    setSettings((prev) => ({
      ...prev,
      institutions: prev.institutions.map((institution) => (
        institution.id === institutionId
          ? {
              ...institution,
              [field]: field === "status" ? (value === "archived" ? "archived" : "active") : value,
            }
          : institution
      )),
    }));
  }

  function removeInstitution(institutionId: string) {
    if (!canWriteSettings || institutionId === DEFAULT_INSTITUTION) return;
    setSettings((prev) => ({
      ...prev,
      institutions: prev.institutions.filter((institution) => institution.id !== institutionId),
    }));
    setUsers((prev) => prev.map((user) => {
      const nextInstitutionIds = (user.institutionIds || []).filter((id) => id !== institutionId);
      return {
        ...user,
        institutionIds: nextInstitutionIds.length > 0 ? nextInstitutionIds : [DEFAULT_INSTITUTION],
        primaryInstitutionId: nextInstitutionIds.includes(user.primaryInstitutionId || "") ? user.primaryInstitutionId : (nextInstitutionIds[0] || DEFAULT_INSTITUTION),
      };
    }));
  }

  function removeLocation(index: number) {
    if (!canWriteSettings) return;
    setSettings((prev) => ({
      ...prev,
      locations: prev.locations.filter((_, i) => i !== index),
    }));
  }

  function addLocation() {
    if (!canWriteSettings) return;
    const loc = locationDraft.trim();
    if (!loc) return;
    setSettings((prev) => ({
      ...prev,
      locations: prev.locations.includes(loc) ? prev.locations : [...prev.locations, loc],
    }));
    setLocationDraft("");
  }

  function updateCompanyField(field: keyof KidexSettings["company"], value: string) {
    if (!canWriteSettings) return;
    setSettings((prev) => ({
      ...prev,
      company: {
        ...prev.company,
        [field]: value,
      },
    }));
  }

  function updateEmailTemplate(localeKey: "en" | "hu" | "ar", field: "subject" | "body", value: string) {
    if (!canWriteSettings) return;
    setSettings((prev) => ({
      ...prev,
      emailTemplates: {
        ...prev.emailTemplates,
        [localeKey]: {
          ...prev.emailTemplates[localeKey],
          [field]: value,
        },
      },
    }));
  }

  function cloneActiveStandardsVersion() {
    if (!canWriteSettings) return;
    const versionName = newStandardsVersion.trim();
    if (!versionName) return;
    const sourceVersion = selectedVersionName;
    const source = settings.standards.versions[sourceVersion];
    if (!source || settings.standards.versions[versionName]) return;

    setSettings((prev) => ({
      ...prev,
      standards: {
        ...prev.standards,
        versions: {
          ...prev.standards.versions,
          [versionName]: {
            ...JSON.parse(JSON.stringify(source)),
            meta: {
              ...source.meta,
              createdAt: new Date().toISOString(),
              createdBy: me?.email,
              publishedAt: undefined,
              publishedBy: undefined,
              sourceVersion,
              status: "draft",
              notes: `Cloned from ${sourceVersion}`,
            },
          },
        },
      },
    }));
    setSelectedStandardsVersion(versionName);
    setVersionNotesDraft(`Cloned from ${sourceVersion}`);
    setImpactPreview(null);
    setNewStandardsVersion("");
  }

  function selectStandardsVersion(versionName: string | null) {
    const nextVersion = versionName && settings.standards.versions[versionName]
      ? versionName
      : settings.standards.activeVersion;
    setSelectedStandardsVersion(nextVersion);
    setVersionNotesDraft(settings.standards.versions[nextVersion]?.meta?.notes || "");
    setImpactPreview(null);
  }

  function setCurrentVersionMeta(next: { notes?: string; status?: "draft" | "published" }) {
    if (!canWriteSettings) return;
    setSettings((prev) => ({
      ...prev,
      standards: {
        ...prev.standards,
        versions: {
          ...prev.standards.versions,
          [selectedVersionName]: {
            ...prev.standards.versions[selectedVersionName],
            meta: {
              ...prev.standards.versions[selectedVersionName]?.meta,
              ...next,
            },
          },
        },
      },
    }));
  }

  function computeImpactPreview() {
    setImpactPreview(computeReadinessImpactPreview(
      settings.standards.versions[settings.standards.activeVersion],
      selectedVersion,
      allAssessments,
    ));
  }

  function updateStandardValue(
    ageGroup: StandardsAgeGroup,
    domain: StandardsDomain,
    key: "target" | "min",
    value: string,
  ) {
    if (!canWriteSettings) return;
    const parsed = Number(value);
    if (Number.isNaN(parsed)) return;
    setSettings((prev) => ({
      ...prev,
      standards: {
        ...prev.standards,
        versions: {
          ...prev.standards.versions,
          [selectedVersionName]: {
            ...prev.standards.versions[selectedVersionName],
            [ageGroup]: {
              ...prev.standards.versions[selectedVersionName][ageGroup],
              [domain]: {
                ...prev.standards.versions[selectedVersionName][ageGroup][domain],
                [key]: parsed,
              },
            },
          },
        },
      },
    }));
  }

  function updateFormulaWeight(domain: "movement" | "social" | "mental", value: string | number) {
    if (!canWriteSettings) return;
    const parsed = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(parsed)) return;
    setSettings((prev) => {
      const currentFormula = prev.standards.versions[selectedVersionName].formula || {
        domainWeights: {
          movement: 0.5,
          social: 0.3,
          mental: 0.2,
        },
        readinessMetric: "ski" as const,
        readinessThreshold: "min" as const,
        aspirationThreshold: "target" as const,
      };
      const currentWeights = currentFormula.domainWeights;
      return {
        ...prev,
        standards: {
          ...prev.standards,
          versions: {
            ...prev.standards.versions,
            [selectedVersionName]: {
              ...prev.standards.versions[selectedVersionName],
              formula: {
                ...currentFormula,
                domainWeights: {
                  movement: domain === "movement" ? Number((parsed / 100).toFixed(4)) : currentWeights.movement,
                  social: domain === "social" ? Number((parsed / 100).toFixed(4)) : currentWeights.social,
                  mental: domain === "mental" ? Number((parsed / 100).toFixed(4)) : currentWeights.mental,
                },
              },
            },
          },
        },
      };
    });
  }

  function publishSelectedVersion() {
    if (!canWriteSettings || !selectedVersion || blockingVersionIssues.length > 0 || !selectedVersionMeta.notes?.trim()) return;
    const now = new Date().toISOString();
    setSettings((prev) => ({
      ...prev,
      standards: {
        ...prev.standards,
        activeVersion: selectedVersionName,
        versions: {
          ...prev.standards.versions,
          [selectedVersionName]: {
            ...prev.standards.versions[selectedVersionName],
            meta: {
              ...prev.standards.versions[selectedVersionName].meta,
              status: "published",
              publishedAt: now,
              publishedBy: me?.email,
            },
          },
        },
      },
    }));
  }

  if (loading) {
    return (
      <Box style={{ display: "flex", justifyContent: "center", paddingBlock: "2rem" }} role="status">
        <Loader aria-label={tc("loading")} />
      </Box>
    );
  }

  return (
    <Stack gap="lg">
      <PageHeader title={t("settings")} />

      {message ? (
        <Alert color={message === tc("error") ? "red" : "kidex"} withCloseButton onClose={() => setMessage("")}>
          {message}
        </Alert>
      ) : null}

      <SectionCard title={t("userRights")}>
        <Stack gap="md">
          {!canWriteUsers ? <Text size="sm" c="dimmed">This area is read-only for your role.</Text> : null}
          <Group gap="xs" align="end" wrap="wrap">
            <TextInput
              label={tc("name")}
              placeholder="Full name"
              value={userNameDraft}
              onChange={(event) => setUserNameDraft(event.target.value)}
              style={{ minWidth: 220 }}
            />
            <TextInput
              label={t("email")}
              placeholder="user@example.com"
              value={userDraft}
              onChange={(event) => setUserDraft(event.target.value)}
              style={{ minWidth: 280 }}
            />
            <Button variant="default" onClick={addNewUser} disabled={!userDraft.trim() || !canWriteUsers}>
              {canSendInvites ? t("inviteUser") : tc("save")}
            </Button>
          </Group>

          <Paper withBorder p={0}>
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>{tc("name")}</Table.Th>
                  <Table.Th>{t("email")}</Table.Th>
                  <Table.Th>Institutions</Table.Th>
                  <Table.Th>Primary</Table.Th>
                  <Table.Th style={{ textAlign: "center" }}>{t("canConduct")}</Table.Th>
                  <Table.Th style={{ textAlign: "center" }}>{t("canObserve")}</Table.Th>
                  <Table.Th style={{ textAlign: "center" }}>Admin</Table.Th>
                  <Table.Th style={{ textAlign: "right" }}>{tc("actions")}</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {users.filter((user) => !!user.email).map((user) => (
                  <Table.Tr key={user.email}>
                    <Table.Td>
                      <TextInput
                        value={user.name || ""}
                        placeholder="Full name"
                        onChange={(event) => {
                          const name = event.currentTarget.value;
                          setUsers((prev) => prev.map((entry) => (entry.email === user.email ? { ...entry, name } : entry)));
                        }}
                      />
                    </Table.Td>
                    <Table.Td>
                      <Text fw={600}>{user.email}</Text>
                    </Table.Td>
                    <Table.Td>
                      {isAdmin ? (
                        <MultiSelect
                          data={institutionOptions(settings)}
                          value={user.institutionIds || [DEFAULT_INSTITUTION]}
                          onChange={(value) => updateUserInstitutions(user.email, value)}
                          clearable={false}
                          searchable
                        />
                      ) : (
                        <Text>{(user.institutionIds || [DEFAULT_INSTITUTION]).join(", ")}</Text>
                      )}
                    </Table.Td>
                    <Table.Td>
                      {isAdmin ? (
                        <Select
                          data={(user.institutionIds || [DEFAULT_INSTITUTION]).map((institutionId) => {
                            const match = settings.institutions.find((institution) => institution.id === institutionId);
                            return { value: institutionId, label: match?.name || institutionId };
                          })}
                          value={user.primaryInstitutionId || user.institutionIds?.[0] || DEFAULT_INSTITUTION}
                          onChange={(value) => updateUserPrimaryInstitution(user.email, value)}
                          allowDeselect={false}
                        />
                      ) : (
                        <Text>{user.primaryInstitutionId || DEFAULT_INSTITUTION}</Text>
                      )}
                    </Table.Td>
                    <Table.Td style={{ textAlign: "center" }}>
                      <Checkbox
                        checked={user.roles.includes("conductor")}
                        disabled={!canWriteUsers}
                        onChange={() => void toggleRole(user, "conductor")}
                        aria-label={`${user.email} conductor`}
                      />
                    </Table.Td>
                    <Table.Td style={{ textAlign: "center" }}>
                      <Checkbox
                        checked={user.roles.includes("observer")}
                        disabled={!canWriteUsers}
                        onChange={() => void toggleRole(user, "observer")}
                        aria-label={`${user.email} observer`}
                      />
                    </Table.Td>
                    <Table.Td style={{ textAlign: "center" }}>
                      <Checkbox
                        checked={user.roles.includes("admin")}
                        disabled={!isAdmin}
                        onChange={() => void toggleRole(user, "admin")}
                        aria-label={`${user.email} admin`}
                      />
                    </Table.Td>
                    <Table.Td style={{ textAlign: "right" }}>
                      <Button
                        variant="light"
                        size="sm"
                        disabled={!canWriteUsers}
                        onClick={async () => {
                          const latest = users.find((entry) => entry.email === user.email) || user;
                          const updatedUser: User = {
                            ...latest,
                            name: (latest.name || "").trim() || undefined,
                            institutionIds: latest.institutionIds?.length ? latest.institutionIds : defaultInstitutionIds,
                            primaryInstitutionId: latest.primaryInstitutionId || latest.institutionIds?.[0] || DEFAULT_INSTITUTION,
                          };
                          const ok = await saveUser(updatedUser);
                          setMessage(ok ? tc("success") : tc("error"));
                        }}
                        mr="xs"
                      >
                        {tc("save")}
                      </Button>
                      <Button
                        variant="light"
                        color="red"
                        size="sm"
                        disabled={!canDeleteUsers}
                        onClick={async () => {
                          const { deleteUser } = await import("@/services/user-service");
                          if (confirm(`Remove access for ${user.email}?`)) {
                            const ok = await deleteUser(user.email);
                            if (ok) {
                              setUsers((prev) => prev.filter((entry) => entry.email !== user.email));
                              setMessage(tc("success"));
                            } else {
                              setMessage(tc("error"));
                            }
                          }
                        }}
                      >
                        {tc("remove")}
                      </Button>
                    </Table.Td>
                  </Table.Tr>
                ))}
                {users.length === 0 ? (
                  <Table.Tr>
                    <Table.Td colSpan={8}>
                      <Text c="dimmed">{t("noUsers")}</Text>
                    </Table.Td>
                  </Table.Tr>
                ) : null}
              </Table.Tbody>
            </Table>
          </Paper>
        </Stack>
      </SectionCard>

      <SectionCard title="Institution Directory">
        <Stack gap="md">
          {!canWriteSettings ? <Text size="sm" c="dimmed">Institution directory is read-only for your role.</Text> : null}
          <Group gap="xs" align="end" wrap="wrap">
            <TextInput
              label="Institution name"
              value={institutionNameDraft}
              disabled={!canWriteSettings}
              onChange={(event) => setInstitutionNameDraft(event.currentTarget.value)}
              style={{ minWidth: 240 }}
            />
            <TextInput
              label="Institution ID"
              value={institutionIdDraft}
              disabled={!canWriteSettings}
              onChange={(event) => setInstitutionIdDraft(event.currentTarget.value)}
              placeholder="optional-slug"
              style={{ minWidth: 220 }}
            />
            <Button variant="default" disabled={!canWriteSettings || !institutionNameDraft.trim()} onClick={addInstitution}>
              Add institution
            </Button>
          </Group>

          <Stack gap="xs">
            {settings.institutions.map((institution) => (
              <Paper key={institution.id} withBorder p="sm">
                <Stack gap="sm">
                  <Group grow align="end">
                    <TextInput
                      label="Name"
                      value={institution.name}
                      disabled={!canWriteSettings}
                      onChange={(event) => updateInstitutionField(institution.id, "name", event.currentTarget.value)}
                    />
                    <TextInput label="ID" value={institution.id} disabled />
                    <Select
                      label="Status"
                      data={[
                        { value: "active", label: "Active" },
                        { value: "archived", label: "Archived" },
                      ]}
                      value={institution.status}
                      disabled={!canWriteSettings || institution.id === DEFAULT_INSTITUTION}
                      onChange={(value) => updateInstitutionField(institution.id, "status", value || "active")}
                    />
                  </Group>
                  <Group justify="space-between" align="end">
                    <TextInput
                      label="Notes"
                      value={institution.notes || ""}
                      disabled={!canWriteSettings}
                      onChange={(event) => updateInstitutionField(institution.id, "notes", event.currentTarget.value)}
                      style={{ flex: 1 }}
                    />
                    <Button
                      color="red"
                      variant="light"
                      disabled={!canWriteSettings || institution.id === DEFAULT_INSTITUTION}
                      onClick={() => removeInstitution(institution.id)}
                    >
                      {tc("remove")}
                    </Button>
                  </Group>
                </Stack>
              </Paper>
            ))}
          </Stack>
        </Stack>
      </SectionCard>

      <SectionCard title="Institution Scope">
        <Stack gap="xs">
          <Text size="sm">Primary institution: {defaultPrimaryInstitutionId}</Text>
          <Text size="sm">Institution memberships: {defaultInstitutionIds.join(", ")}</Text>
          {!isAdmin ? <Text size="sm" c="dimmed">Institution membership changes are currently admin-managed.</Text> : null}
        </Stack>
      </SectionCard>

      <SectionCard title={t("locations")}>
        <Stack gap="md">
          {!canWriteSettings ? <Text size="sm" c="dimmed">Location settings are read-only for your role.</Text> : null}
          <Group gap="xs" align="end" wrap="wrap">
            <Box style={{ minWidth: 280, width: 420, maxWidth: "100%" }}>
              <SearchableSelect
                label={t("addLocation")}
                value={locationDraft}
                options={settings.locations.map((name) => ({ id: name, name }))}
                onChange={setLocationDraft}
                allowAdd
              />
            </Box>
            <Button variant="default" onClick={addLocation} disabled={!locationDraft.trim() || !canWriteSettings}>
              {t("addLocation")}
            </Button>
            <Button color="kidex" onClick={() => void handleSaveSettings()} disabled={saving || !canWriteSettings}>
              {saving ? tc("saving") : tc("save")}
            </Button>
          </Group>

          {settings.locations.length === 0 ? (
            <Text c="dimmed">{t("noLocations")}</Text>
          ) : (
            <Stack gap="xs">
              {settings.locations.map((loc, index) => (
                <Paper key={`${loc}-${index}`} withBorder p="sm" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <Text>{loc}</Text>
                  <Button color="red" variant="light" size="sm" disabled={!canWriteSettings} onClick={() => removeLocation(index)}>
                    {tc("remove")}
                  </Button>
                </Paper>
              ))}
            </Stack>
          )}
        </Stack>
      </SectionCard>

      <SectionCard
        title={t("legalAndCompany")}
        action={
          <Button color="kidex" onClick={() => void handleSaveSettings()} disabled={saving || !canWriteSettings}>
            {saving ? tc("saving") : tc("save")}
          </Button>
        }
      >
        <Stack gap="md">
          <TextInput label={t("company")} disabled={!canWriteSettings} value={settings.company.name} onChange={(event) => updateCompanyField("name", event.target.value)} />
          <TextInput label={tl("idNo")} disabled={!canWriteSettings} value={settings.company.ico} onChange={(event) => updateCompanyField("ico", event.target.value)} />
          <TextInput label={tl("registered")} disabled={!canWriteSettings} value={settings.company.registered} onChange={(event) => updateCompanyField("registered", event.target.value)} />
          <TextInput label={tl("legalForm")} disabled={!canWriteSettings} value={settings.company.legalForm} onChange={(event) => updateCompanyField("legalForm", event.target.value)} />
          <TextInput label={tl("address")} disabled={!canWriteSettings} value={settings.company.address} onChange={(event) => updateCompanyField("address", event.target.value)} />
          <TextInput label={tl("shareCapital")} disabled={!canWriteSettings} value={settings.company.shareCapital} onChange={(event) => updateCompanyField("shareCapital", event.target.value)} />
          <TextInput label={tl("vatNo")} disabled={!canWriteSettings} value={settings.company.vatNo} onChange={(event) => updateCompanyField("vatNo", event.target.value)} />
          <TextInput label={tl("website")} disabled={!canWriteSettings} value={settings.company.website} onChange={(event) => updateCompanyField("website", event.target.value)} />
        </Stack>
      </SectionCard>

      <SectionCard
        title={t("emailIntegration")}
        action={
          <Button color="kidex" onClick={() => void handleSaveSettings()} disabled={saving || !canWriteSettings}>
            {saving ? tc("saving") : tc("save")}
          </Button>
        }
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">{t("gmailIntegrationDescription")}</Text>
          <Group>
            {me?.isGoogleLinked ? (
              <Alert color="teal" style={{ flex: 1 }}>
                <Group justify="space-between">
                  <Text fw={700}>{t("gmailLinked")}</Text>
                  <Button variant="white" color="teal" size="sm" onClick={() => { window.location.href = "/api/auth/google/login"; }}>
                    {t("reconnect")}
                  </Button>
                </Group>
              </Alert>
            ) : (
              <Button color="kidex" onClick={() => { window.location.href = "/api/auth/google/login"; }}>
                {t("linkGmail")}
              </Button>
            )}
          </Group>

          <Divider my="md" label={t("inviteTemplates")} labelPosition="center" />

          <Tabs defaultValue="en" color="kidex">
            <Tabs.List>
              <Tabs.Tab value="en">English</Tabs.Tab>
              <Tabs.Tab value="hu">Magyar</Tabs.Tab>
              <Tabs.Tab value="ar">العربية</Tabs.Tab>
            </Tabs.List>

            {(["en", "hu", "ar"] as const).map((lang) => (
              <Tabs.Panel key={lang} value={lang} pt="md">
                <Stack gap="md">
                  <TextInput
                    label={t("emailSubject")}
                    disabled={!canWriteSettings}
                    value={settings.emailTemplates[lang].subject}
                    onChange={(event) => updateEmailTemplate(lang, "subject", event.target.value)}
                  />
                  <Textarea
                    label={t("emailBody")}
                    description={t("placeholderHint")}
                    disabled={!canWriteSettings}
                    value={settings.emailTemplates[lang].body}
                    onChange={(event) => updateEmailTemplate(lang, "body", event.target.value)}
                    minRows={6}
                    autosize
                  />
                </Stack>
              </Tabs.Panel>
            ))}
          </Tabs>
        </Stack>
      </SectionCard>

      <SectionCard title="Standards Version Manager">
        <Stack gap="md">
          {!canWriteSettings ? <Text size="sm" c="dimmed">Standards configuration is read-only for your role.</Text> : null}
          <Group align="end" wrap="wrap">
            <Select
              label="Version to edit"
              value={selectedVersionName}
              data={Object.keys(settings.standards.versions).map((version) => ({ value: version, label: version }))}
              onChange={selectStandardsVersion}
              style={{ minWidth: 280 }}
            />
            <Select
              label={t("standardsActiveVersion")}
              value={settings.standards.activeVersion}
              data={Object.keys(settings.standards.versions).map((version) => ({ value: version, label: version }))}
              disabled={!canWriteSettings}
              onChange={selectStandardsVersion}
              style={{ minWidth: 280 }}
            />
          </Group>

          <Stack gap="xs">
            {Object.entries(settings.standards.versions).map(([versionName, version]) => (
              <Paper key={versionName} withBorder p="sm">
                <Group justify="space-between" align="flex-start" wrap="wrap">
                  <Stack gap={4}>
                    <Group gap="xs">
                      <Text fw={700}>{versionName}</Text>
                      <Badge color={version.meta?.status === "published" ? "teal" : "gray"} variant="light">
                        {version.meta?.status || "draft"}
                      </Badge>
                      {settings.standards.activeVersion === versionName ? (
                        <Badge color="kidex" variant="filled">live</Badge>
                      ) : null}
                      {selectedVersionName === versionName ? (
                        <Badge color="blue" variant="light">editing</Badge>
                      ) : null}
                    </Group>
                    <Text size="sm" c="dimmed">
                      {version.meta?.notes?.trim() || "No governance notes yet."}
                    </Text>
                    <Text size="sm" c="dimmed">
                      Created {version.meta?.createdAt ? new Date(version.meta.createdAt).toLocaleString() : "-"} by {version.meta?.createdBy || "unknown"}
                      {version.meta?.publishedAt ? ` · Published ${new Date(version.meta.publishedAt).toLocaleString()} by ${version.meta?.publishedBy || "unknown"}` : ""}
                      {version.meta?.sourceVersion ? ` · Source ${version.meta.sourceVersion}` : ""}
                    </Text>
                  </Stack>
                  <Button variant={selectedVersionName === versionName ? "filled" : "default"} onClick={() => selectStandardsVersion(versionName)}>
                    {selectedVersionName === versionName ? "Editing" : "Edit"}
                  </Button>
                </Group>
              </Paper>
            ))}
          </Stack>

          <Group align="end" wrap="wrap">
            <TextInput
              label={t("standardsNewVersionName")}
              placeholder={t("standardsVersionPlaceholder")}
              value={newStandardsVersion}
              disabled={!canWriteSettings}
              onChange={(event) => setNewStandardsVersion(event.currentTarget.value)}
            />
            <Button variant="default" onClick={cloneActiveStandardsVersion} disabled={!newStandardsVersion.trim() || !canWriteSettings}>
              {t("standardsCloneActive")}
            </Button>
          </Group>

          {selectedVersion ? (
            <Paper withBorder p="sm">
              <Stack gap="sm" mb="sm">
                <Group gap="xs" wrap="wrap">
                  <Badge color={selectedVersionMeta.status === "published" ? "teal" : "gray"} variant="light">
                    {selectedVersionMeta.status || "draft"}
                  </Badge>
                  {settings.standards.activeVersion === selectedVersionName ? (
                    <Badge color="kidex" variant="filled">Active in production</Badge>
                  ) : (
                    <Badge color="yellow" variant="light">Draft / non-live</Badge>
                  )}
                </Group>
                <TextInput
                  label="Version notes"
                  disabled={!canWriteSettings}
                  value={versionNotesDraft}
                  onChange={(event) => {
                    const value = event.currentTarget.value;
                    setVersionNotesDraft(value);
                    setCurrentVersionMeta({ notes: value });
                  }}
                />
                <Group gap="md" wrap="wrap">
                  <Text size="sm">Average target: {selectedVersionSummary?.averageTarget ?? "-"}</Text>
                  <Text size="sm">Average minimum: {selectedVersionSummary?.averageMinimum ?? "-"}</Text>
                  <Text size="sm">Formula split: M {selectedFormulaPercentages.movement}% · S {selectedFormulaPercentages.social}% · Me {selectedFormulaPercentages.mental}%</Text>
                </Group>

                {selectedVersionIssues.length > 0 ? (
                  <Alert color={blockingVersionIssues.length > 0 ? "red" : "yellow"}>
                    <Stack gap={4}>
                      {selectedVersionIssues.map((issue) => (
                        <Text key={issue.message} size="sm">
                          {issue.severity === "error" ? "Error" : "Warning"}: {issue.message}
                        </Text>
                      ))}
                    </Stack>
                  </Alert>
                ) : null}

                <Group>
                  <Button
                    variant="default"
                    onClick={publishSelectedVersion}
                    disabled={!canWriteSettings || (settings.standards.activeVersion === selectedVersionName && selectedVersionMeta.status === "published") || !selectedVersionMeta.notes?.trim() || blockingVersionIssues.length > 0}
                  >
                    Publish and activate version
                  </Button>
                  <Button variant="light" onClick={computeImpactPreview}>Preview Impact</Button>
                </Group>
                {impactPreview ? (
                  <Text size="sm" c="dimmed">
                    Impact preview ({impactPreview.total} records): {impactPreview.developingToReady} Developing→Ready, {impactPreview.readyToDeveloping} Ready→Developing.
                  </Text>
                ) : null}
              </Stack>

              <Paper withBorder p="sm" mb="sm">
                <Stack gap="sm">
                  <Text fw={700}>Scoring formula</Text>
                  <Text size="sm" c="dimmed">
                    Domain averages are calculated from the scored items inside each domain. SKI is then computed from the weighted domain averages below. Readiness uses the age-band SKI minimum and target thresholds from this version.
                  </Text>
                  <Group grow align="end">
                    <NumberInput
                      label="Movement weight (%)"
                      min={0}
                      max={100}
                      decimalScale={1}
                      value={selectedFormulaPercentages.movement}
                      disabled={!canWriteSettings || selectedVersionMeta.status === "published"}
                      onChange={(value) => updateFormulaWeight("movement", value)}
                    />
                    <NumberInput
                      label="Social weight (%)"
                      min={0}
                      max={100}
                      decimalScale={1}
                      value={selectedFormulaPercentages.social}
                      disabled={!canWriteSettings || selectedVersionMeta.status === "published"}
                      onChange={(value) => updateFormulaWeight("social", value)}
                    />
                    <NumberInput
                      label="Mental weight (%)"
                      min={0}
                      max={100}
                      decimalScale={1}
                      value={selectedFormulaPercentages.mental}
                      disabled={!canWriteSettings || selectedVersionMeta.status === "published"}
                      onChange={(value) => updateFormulaWeight("mental", value)}
                    />
                  </Group>
                </Stack>
              </Paper>

              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>{t("standardsAgeGroup")}</Table.Th>
                    <Table.Th>{t("standardsDomain")}</Table.Th>
                    <Table.Th>{t("standardsTarget")}</Table.Th>
                    <Table.Th>{t("standardsMin")}</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {(["4-6", "7-9", "10-12"] as const).flatMap((ageGroup) => (
                    (["movement", "social", "mental", "ski"] as const).map((domain) => (
                      <Table.Tr key={`${ageGroup}-${domain}`}>
                        <Table.Td>{ageGroup}</Table.Td>
                        <Table.Td>{domain}</Table.Td>
                        <Table.Td>
                          <NumberInput
                            min={0}
                            max={6}
                            decimalScale={2}
                            value={selectedVersion[ageGroup][domain].target}
                            disabled={!canWriteSettings || selectedVersionMeta.status === "published"}
                            onChange={(value) => updateStandardValue(ageGroup, domain, "target", String(value ?? ""))}
                          />
                        </Table.Td>
                        <Table.Td>
                          <NumberInput
                            min={0}
                            max={6}
                            decimalScale={2}
                            value={selectedVersion[ageGroup][domain].min}
                            disabled={!canWriteSettings || selectedVersionMeta.status === "published"}
                            onChange={(value) => updateStandardValue(ageGroup, domain, "min", String(value ?? ""))}
                          />
                        </Table.Td>
                      </Table.Tr>
                    ))
                  ))}
                </Table.Tbody>
              </Table>

              <Text size="sm" c="dimmed" mt="sm">
                Audit trail: created by {selectedVersionMeta.createdBy || "unknown"} on {selectedVersionMeta.createdAt ? new Date(selectedVersionMeta.createdAt).toLocaleString() : "-"}
                {selectedVersionMeta.publishedAt ? ` · published by ${selectedVersionMeta.publishedBy || "unknown"} on ${new Date(selectedVersionMeta.publishedAt).toLocaleString()}` : " · not published yet"}
                {selectedVersionMeta.sourceVersion ? ` · source version ${selectedVersionMeta.sourceVersion}` : ""}
              </Text>
            </Paper>
          ) : null}

          <Button color="kidex" onClick={() => void handleSaveSettings()} disabled={saving || !canWriteSettings || blockingVersionIssues.length > 0}>
            {saving ? tc("saving") : tc("save")}
          </Button>
        </Stack>
      </SectionCard>

      <SectionCard title={t("restoreBinTitle")}>
        <Stack gap="lg">
          <Box>
            <Text fw={700} mb="sm">{t("restoreDeletedChildren")}</Text>
            {deletedChildren.length === 0 ? (
              <Text c="dimmed">{t("restoreNoDeletedChildren")}</Text>
            ) : (
              <Stack gap="xs">
                {deletedChildren.map((child) => (
                  <Paper key={child._id} withBorder p="sm">
                    <Group justify="space-between">
                      <Text>{child.name}</Text>
                      <Button size="sm" variant="light" color="kidex" disabled={!canRestoreRecords} onClick={() => void restoreChild(child._id)}>
                        {t("restoreAction")}
                      </Button>
                    </Group>
                  </Paper>
                ))}
              </Stack>
            )}
          </Box>

          <Box>
            <Text fw={700} mb="sm">{t("restoreDeletedAssessments")}</Text>
            {deletedAssessments.length === 0 ? (
              <Text c="dimmed">{t("restoreNoDeletedAssessments")}</Text>
            ) : (
              <Stack gap="xs">
                {deletedAssessments.map((assessment) => (
                  <Paper key={assessment._id} withBorder p="sm">
                    <Group justify="space-between">
                      <Text>{assessment.child?.name || t("restoreUnknownChild")} · {assessment.session?.date || "-"}</Text>
                      <Button size="sm" variant="light" color="kidex" disabled={!canRestoreRecords} onClick={() => void restoreAssessment(assessment._id)}>
                        {t("restoreAction")}
                      </Button>
                    </Group>
                  </Paper>
                ))}
              </Stack>
            )}
          </Box>
        </Stack>
      </SectionCard>

      <SectionCard title="Governance Metrics">
        <Stack gap="xs">
          <Text size="sm">Deleted children: {governanceMetrics.deletedChildren}</Text>
          <Text size="sm">Deleted assessments: {governanceMetrics.deletedAssessments}</Text>
          <Text size="sm">Assessments missing report consent: {governanceMetrics.missingConsentReport}</Text>
          <Text size="sm">Assessments missing child link: {governanceMetrics.missingChildLink}</Text>
        </Stack>
      </SectionCard>

      {isAdmin ? (
        <SectionCard title="Audit Trail">
          <Stack gap="sm">
            <Text size="sm" c="dimmed">
              Recent sensitive actions across settings, users, child records, assessments, media uploads, and report exports.
            </Text>
            {auditLogs.length === 0 ? (
              <Text c="dimmed">No audit events recorded yet.</Text>
            ) : (
              <Paper withBorder p={0}>
                <Table striped highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Time</Table.Th>
                      <Table.Th>Action</Table.Th>
                      <Table.Th>Status</Table.Th>
                      <Table.Th>Actor</Table.Th>
                      <Table.Th>Target</Table.Th>
                      <Table.Th>Summary</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {auditLogs.map((log) => (
                      <Table.Tr key={log._id || `${log.createdAt}-${log.action}-${log.targetId || "none"}`}>
                        <Table.Td>{new Date(log.createdAt).toLocaleString()}</Table.Td>
                        <Table.Td>{log.action}</Table.Td>
                        <Table.Td>
                          <Badge color={log.status === "success" ? "teal" : "red"} variant="light">
                            {log.status}
                          </Badge>
                        </Table.Td>
                        <Table.Td>{log.actorEmail || "-"}</Table.Td>
                        <Table.Td>{log.targetLabel || log.targetId || "-"}</Table.Td>
                        <Table.Td>{log.summary}</Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </Paper>
            )}
          </Stack>
        </SectionCard>
      ) : null}
    </Stack>
  );
}
