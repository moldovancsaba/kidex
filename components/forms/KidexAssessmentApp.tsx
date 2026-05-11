"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Anchor,
  Badge,
  Box,
  Button,
  Checkbox,
  Group,
  Modal,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Textarea
} from "@mantine/core";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { sectionsForMode } from "@/lib/kidex-schema";
import { computeAssessment } from "@/lib/scoring";
import { calculateAgeGroup } from "@/lib/utils/age";
import { getStandardForAgeGroup } from "@/lib/standards";
import { formatScore } from "@/lib/utils";

import { PageHeader } from "@/components/ui/PageHeader";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { SectionCard } from "@/components/ui/SectionCard";
import { getSettings, saveSettings } from "@/services/settings-service";
import { getConductors, getObservers } from "@/services/user-service";
import type { AssessmentPayload, AssessmentRecord, EvidenceAttachment, ScoreEntry } from "@/types/assessment";
import type { ChildProfile } from "@/repositories/child.repository";

const DRAFT_STORAGE_KEY = "kidex-draft";

const emptyAssessment: AssessmentPayload = {
  childId: "",
  mode: "rapid",
  child: {
    name: "",
    birthDate: "",
    ageGroup: "",
    dominantHand: "",
    dominantEye: "",
    dominantFoot: "",
    knownTraits: "",
    parentSignals: ""
  },
  session: {
    date: new Date().toISOString().slice(0, 10),
    location: "",
    conductor: "",
    observers: "",
    groupSize: "6-8",
    context: "event",
    consentPhoto: false,
    consentReport: false
  },
  scores: {},
  notes: {
    general: "",
    movement: "",
    social: "",
    mental: "",
    adaptations: "",
    referral: ""
  },
  attachments: []
};

type SaveState = "idle" | "saving" | "saved" | "error";

function cloneAssessment(source: AssessmentPayload): AssessmentPayload {
  return JSON.parse(JSON.stringify(source)) as AssessmentPayload;
}

function scoreValue(entry?: ScoreEntry) {
  return typeof entry?.score === "number" ? entry.score : "";
}

function loadDraftAssessment(): AssessmentPayload {
  if (typeof window === "undefined") {
    return cloneAssessment(emptyAssessment);
  }

  const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
  if (!raw) {
    return cloneAssessment(emptyAssessment);
  }

  try {
    return { ...cloneAssessment(emptyAssessment), ...JSON.parse(raw) };
  } catch {
    return cloneAssessment(emptyAssessment);
  }
}

async function parseApiError(response: Response): Promise<string | null> {
  const body = (await response.json().catch(() => null)) as { error?: string } | null;
  return body?.error || null;
}

export function KidexAssessmentApp() {
  const t = useTranslations("Assessment");
  const tc = useTranslations("Common");
  const ts = useTranslations("Schema");
  const searchParams = useSearchParams();
  const childIdParam = searchParams.get("childId");
  const idParam = searchParams.get("id");

  const [assessment, setAssessment] = useState<AssessmentPayload>(loadDraftAssessment);
  const [recordId, setRecordId] = useState<string>("");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const initializedChildPrefill = useRef(false);

  const [conductors, setConductors] = useState<string[]>([]);
  const [observers, setObservers] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [children, setChildren] = useState<ChildProfile[]>([]);

  const sections = sectionsForMode(assessment.mode);
  const computed = useMemo(() => computeAssessment(assessment), [assessment]);
  const standard = getStandardForAgeGroup(assessment.child.ageGroup);
  const conductorOptions = useMemo(() => conductors.map((name) => ({ id: name, name })), [conductors]);
  const observerOptions = useMemo(() => observers.map((name) => ({ id: name, name })), [observers]);
  const locationOptions = useMemo(() => locations.map((name) => ({ id: name, name })), [locations]);

  useEffect(() => {
    void Promise.all([getSettings(), getConductors(), getObservers()]).then(([settingsData, conductorUsers, observerUsers]) => {
      const allConductors = Array.from(new Set(conductorUsers.map((user) => user.email)));
      const allObservers = Array.from(new Set(observerUsers.map((user) => user.email)));

      setConductors(allConductors);
      setObservers(allObservers);
      setLocations(settingsData.locations);
    });
    void fetch("/api/children").then((r) => r.json()).then((data: ChildProfile[]) => setChildren(Array.isArray(data) ? data : [])).catch(() => setChildren([]));
  }, []);

  useEffect(() => {
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(assessment));
  }, [assessment]);

  useEffect(() => {
    if (!idParam) return;
    void (async () => {
      const response = await fetch(`/api/assessments/${idParam}`).catch(() => null);
      if (!response?.ok) return;
      const data = (await response.json()) as { assessment: AssessmentRecord };
      setAssessment(data.assessment);
      setRecordId(data.assessment._id || "");
    })();
  }, [idParam]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    if (!childIdParam) return;
    if (recordId) return;
    if (initializedChildPrefill.current) return;
    initializedChildPrefill.current = true;

    void (async () => {
      const response = await fetch(`/api/children/${childIdParam}`).catch(() => null);
      if (!response?.ok) return;
      const child = (await response.json()) as {
        name: string;
        birthDate: string;
        knownTraits?: string;
        parentSignals?: string;
        dominantHand?: string;
        dominantEye?: string;
        dominantFoot?: string;
      };

      setAssessment(() => {
        const ageGroup = calculateAgeGroup(child.birthDate) || "";
        return {
          ...cloneAssessment(emptyAssessment),
          childId: childIdParam,
          child: {
            name: child.name || "",
            birthDate: child.birthDate || "",
            ageGroup,
            knownTraits: "",
            parentSignals: "",
            dominantHand: "",
            dominantEye: "",
            dominantFoot: ""
          }
        };
      });
    })();
  }, [childIdParam, recordId]);

  function update<T extends keyof AssessmentPayload>(group: T, key: keyof AssessmentPayload[T], value: unknown) {
    setAssessment((current) => {
      const next = {
        ...current,
        [group]: {
          ...(current[group] as object),
          [key]: value
        }
      };

      if (group === "child" && key === "birthDate") {
        const ageGroup = calculateAgeGroup(value as string);
        next.child.ageGroup = ageGroup || "";
      }

      return next;
    });
    setSaveState("idle");
  }

  function updateScore(key: string, patch: Partial<ScoreEntry>) {
    setAssessment((current) => ({
      ...current,
      scores: {
        ...current.scores,
        [key]: { ...(current.scores[key] || { score: "", note: "" }), ...patch }
      }
    }));
    setSaveState("idle");
  }

  async function saveAssessment() {
    setSaveState("saving");
    setMessage("");
    const url = recordId ? `/api/assessments/${recordId}` : "/api/assessments";
    const response = await fetch(url, {
      method: recordId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(assessment)
    }).catch((error: Error) => {
      setMessage(error.message);
      return null;
    });

    if (!response?.ok) {
      setSaveState("error");
      const err = response ? await parseApiError(response) : null;
      setMessage(err ?? t("saveError"));
      return;
    }

    const data = (await response.json()) as { assessment: AssessmentRecord };
    setRecordId(data.assessment._id || "");
    setSaveState("saved");
    localStorage.removeItem(DRAFT_STORAGE_KEY);

    const settings = await getSettings();
    await saveSettings({ ...settings, locations });

    setMessage(t("saved"));
  }

  function newAssessment() {
    setRecordId("");
    setAssessment((current) => {
      if (!childIdParam) {
        return cloneAssessment(emptyAssessment);
      }

      return {
        ...cloneAssessment(emptyAssessment),
        childId: current.childId || childIdParam,
        child: {
          ...cloneAssessment(emptyAssessment).child,
          name: current.child.name,
          birthDate: current.child.birthDate,
          ageGroup: current.child.ageGroup
        }
      };
    });
    setSaveState("idle");
    setMessage("");
  }

  function appendLocationIfMissing(value: string) {
    setLocations((current) => (value && !current.includes(value) ? [...current, value] : current));
  }

  async function uploadImageFile(file: File | Blob) {
    if (!assessment.session.consentPhoto) {
      setMessage(t("consentRequired"));
      return;
    }
    setUploading(true);
    setMessage("");
    const form = new FormData();
    form.set("image", file, file instanceof File ? file.name : "camera-capture.jpg");
    if (assessment.childId) form.set("childId", assessment.childId);
    if (recordId) form.set("recordId", recordId);
    form.set("consentPhoto", assessment.session.consentPhoto ? "true" : "false");
    const response = await fetch("/api/uploads/imgbb", { method: "POST", body: form }).catch((error: Error) => {
      setMessage(error.message);
      return null;
    });
    setUploading(false);
    if (!response?.ok) {
      const err = response ? await parseApiError(response) : null;
      setMessage(err ?? t("uploadFailed"));
      return;
    }
    const data = (await response.json()) as { attachment: EvidenceAttachment };
    setAssessment((current) => ({
      ...current,
      attachments: [...current.attachments, data.attachment]
    }));
    setMessage(t("uploadSuccess"));
  }

  async function uploadImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    await uploadImageFile(file);
  }

  function stopCameraStream() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  async function openCamera() {
    if (!assessment.session.consentPhoto) {
      setMessage(t("consentRequired"));
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setMessage(t("cameraUnsupported"));
      return;
    }

    if (capturedPreview) {
      URL.revokeObjectURL(capturedPreview);
    }
    setCapturedPreview(null);
    setCapturedBlob(null);
    setCameraOpen(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      setMessage(t("cameraAccessError"));
      setCameraOpen(false);
    }
  }

  function capturePhotoFrame() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) return;
      setCapturedBlob(blob);
      setCapturedPreview(URL.createObjectURL(blob));
      stopCameraStream();
    }, "image/jpeg", 0.92);
  }

  async function uploadCapturedPhoto() {
    if (!capturedBlob) return;
    await uploadImageFile(capturedBlob);
    closeCameraDialog();
  }

  function closeCameraDialog() {
    stopCameraStream();
    if (capturedPreview) {
      URL.revokeObjectURL(capturedPreview);
    }
    setCapturedPreview(null);
    setCapturedBlob(null);
    setCameraOpen(false);
  }

  function removeAttachment(id: string) {
    setAssessment((current) => ({
      ...current,
      attachments: current.attachments.filter((attachment) => attachment.id !== id)
    }));
  }

  const strengths = Object.entries(assessment.scores)
    .filter(([, entry]) => typeof entry.score === "number" && entry.score >= 5)
    .slice(0, 3);
  const needs = Object.entries(assessment.scores)
    .filter(([, entry]) => typeof entry.score === "number" && entry.score <= 2)
    .slice(0, 3);

  return (
    <Stack gap="xl">
      <PageHeader
        title={t("appTitle")}
        subtitle={t("appSubtitle")}
        actions={
          <Group gap="sm">
            <Button variant="default" onClick={newAssessment} style={{ minWidth: 112, fontWeight: 600 }}>
              {tc("new")}
            </Button>
            <Button color="kidex" onClick={() => void saveAssessment()} disabled={saveState === "saving"} style={{ minWidth: 112, fontWeight: 700 }}>
              {saveState === "saving" ? tc("saving") : recordId ? tc("update") : tc("save")}
            </Button>
          </Group>
        }
      />

      {message ? (
        <Alert
          color={saveState === "error" ? "red" : saveState === "saved" ? "kidex" : "blue"}
          withCloseButton
          onClose={() => setMessage("")}
        >
          {message}
        </Alert>
      ) : null}

      <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
        <MetricCard label={ts("movement")} value={formatScore(computed.movementAverage)} target={standard?.movement.target} />
        <MetricCard label={ts("social")} value={formatScore(computed.socialAverage)} target={standard?.social.target} />
        <MetricCard label={ts("mental")} value={formatScore(computed.mentalAverage)} target={standard?.mental.target} />
        <MetricCard label="SKI" value={formatScore(computed.ski)} target={standard?.ski.target} />
      </SimpleGrid>

      <Stack gap="xl" id="setup">
        <SectionCard title={t("setupTitle")}>
          <Stack gap="md">
            <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing="md">
              <Select
                label={t("childName")}
                placeholder="Select child"
                searchable
                value={assessment.childId || ""}
                data={children.map((child) => ({ value: child._id || "", label: `${child.name} (${child.kidexId || "-"})` })).filter((x) => x.value)}
                onChange={(value) => {
                  const child = children.find((c) => c._id === value);
                  if (!child || !value) return;
                  setAssessment((current) => ({
                    ...current,
                    childId: value,
                    child: {
                      ...current.child,
                      name: child.name || "",
                      birthDate: child.birthDate || "",
                      ageGroup: (child.ageGroup || calculateAgeGroup(child.birthDate) || "") as AssessmentPayload["child"]["ageGroup"],
                      knownTraits: child.knownTraits || "",
                      parentSignals: child.parentSignals || "",
                      dominantHand: child.dominantHand || "",
                      dominantEye: child.dominantEye || "",
                      dominantFoot: child.dominantFoot || ""
                    },
                    session: {
                      ...current.session,
                      consentPhoto: Boolean(child.consentPhoto),
                      consentReport: Boolean(child.consentReport)
                    }
                  }));
                }}
              />
              <Select
                label={t("ageGroup")}
                value={assessment.child.ageGroup || ""}
                disabled
                data={[
                  { value: "", label: t("ageGroupPending") },
                  { value: "4-6", label: "4-6" },
                  { value: "7-9", label: "7-9" },
                  { value: "10-12", label: "10-12" }
                ]}
                onChange={() => {}}
              />
              <Select
                label={t("mode")}
                value={assessment.mode}
                data={[
                  { value: "rapid", label: t("modeRapid") },
                  { value: "full", label: t("modeFull") }
                ]}
                onChange={(value) =>
                  setAssessment((current) => ({ ...current, mode: (value as AssessmentPayload["mode"]) ?? "rapid" }))
                }
              />
              <SearchableSelect 
                label={t("conductor")} 
                value={assessment.session.conductor} 
                options={conductorOptions} 
                onChange={(value) => update("session", "conductor", value)} 
              />
              <SearchableSelect
                label={t("location")}
                value={assessment.session.location}
                options={locationOptions}
                onChange={(value) => {
                  appendLocationIfMissing(value);
                  update("session", "location", value);
                }}
                allowAdd
              />
              <SearchableSelect 
                label={t("observers")} 
                value={assessment.session.observers} 
                options={observerOptions} 
                onChange={(value) => update("session", "observers", value)} 
              />
              <Select
                label={t("context")}
                value={assessment.session.context}
                data={[
                  { value: "event", label: t("contextEvent") },
                  { value: "structured", label: t("contextStructured") },
                  { value: "spontaneous", label: t("contextSpontaneous") },
                  { value: "mixed", label: t("contextMixed") }
                ]}
                onChange={(value) => update("session", "context", value ?? "event")}
              />
            </SimpleGrid>

            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
              <Textarea
                label={t("knownTraits")}
                value={assessment.child.knownTraits}
                onChange={() => {}}
                readOnly
                minRows={3}
              />
              <Textarea
                label={t("parentSignals")}
                value={assessment.child.parentSignals}
                onChange={() => {}}
                readOnly
                minRows={3}
              />
            </SimpleGrid>

            <Group gap="xl" mt="xs">
              <Checkbox 
                label={t("consentPhoto")} 
                checked={assessment.session.consentPhoto} 
                disabled
              />
              <Checkbox 
                label={t("consentReport")} 
                checked={assessment.session.consentReport} 
                disabled
              />
            </Group>
          </Stack>
        </SectionCard>

        <SectionCard title={t("evidenceImages")}>
          <Stack gap="md">
            <Text size="sm" c="dimmed">
              {t("uploadSecurityNote")}
            </Text>
            <Group gap="sm">
              <Button variant="outline" component="label" disabled={!assessment.session.consentPhoto || uploading}>
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => void uploadImage(e)}
                  disabled={!assessment.session.consentPhoto || uploading}
                />
                {uploading ? t("uploading") : t("uploadImage")}
              </Button>
              <Button variant="outline" onClick={() => void openCamera()} disabled={!assessment.session.consentPhoto || uploading}>
                {uploading ? t("uploading") : t("takePhoto")}
              </Button>
            </Group>
            {assessment.attachments.length === 0 ? (
              <Text size="sm" c="dimmed">
                {t("noImages")}
              </Text>
            ) : (
              <Stack gap="md">
                {assessment.attachments.map((attachment) => (
                  <Group key={attachment.id} gap="md" align="center" wrap="nowrap">
                    <Image
                      src={attachment.thumbUrl || attachment.url}
                      alt={attachment.name || "Image"}
                      width={160}
                      height={120}
                      style={{ width: 160, height: "auto", borderRadius: "var(--mantine-radius-md)" }}
                      unoptimized
                    />
                    <Box style={{ flex: 1, minWidth: 0 }}>
                      <Anchor href={attachment.url} target="_blank" rel="noreferrer" size="sm">
                        {attachment.name || "Image"}
                      </Anchor>
                    </Box>
                    <Button variant="subtle" color="red" size="sm" onClick={() => removeAttachment(attachment.id)}>
                      {tc("remove")}
                    </Button>
                  </Group>
                ))}
              </Stack>
            )}
          </Stack>
        </SectionCard>
      </Stack>

      <Modal opened={cameraOpen} onClose={closeCameraDialog} title={t("takePhoto")} centered size="lg">
        <Stack gap="md">
          {capturedPreview ? (
            <Image
              src={capturedPreview}
              alt={t("takePhoto")}
              width={640}
              height={480}
              style={{ width: "100%", height: "auto", border: "1px solid var(--mantine-color-default-border)", borderRadius: "var(--mantine-radius-md)" }}
            />
          ) : (
            <Box style={{ width: "100%", aspectRatio: "4/3", background: "#000", borderRadius: "var(--mantine-radius-md)", overflow: "hidden" }}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </Box>
          )}
          <Group justify="flex-end" gap="sm">
            <Button variant="default" onClick={closeCameraDialog}>{tc("cancel")}</Button>
            {capturedPreview ? (
              <>
                <Button onClick={() => void openCamera()} variant="outline">{t("retakePhoto")}</Button>
                <Button onClick={() => void uploadCapturedPhoto()} color="kidex" disabled={uploading}>
                  {uploading ? t("uploading") : t("usePhoto")}
                </Button>
              </>
            ) : (
              <Button onClick={capturePhotoFrame} color="kidex">{t("capturePhoto")}</Button>
            )}
          </Group>
        </Stack>
      </Modal>

      <div id="scoring" />
      {sections.map((section, sectionIndex) => (
        <SectionCard
          key={section.key}
          title={`${ts(section.key)} (${Math.round(section.weight * 100)}%)`}
          action={<Badge variant="light" color="kidex" size="lg">{ts(section.domain)}</Badge>}
        >
          <Stack gap="md">
            {section.items.map((item, itemIndex) => {
              const entry = assessment.scores[item.key];
              return (
                <Paper
                  key={item.key}
                  withBorder
                  p="md"
                  bg="var(--mantine-color-body)"
                >
                  <Stack gap="sm">
                    <Group justify="space-between" align="flex-start">
                      <Box style={{ flex: 1, minWidth: 0 }}>
                        <Text size="sm" c="dimmed" fw={500}>
                          {sectionIndex * 25 + itemIndex + 1}
                        </Text>
                        <Text size="md" fw={700} lh={1.3}>
                          {ts(`${item.key}.title`)}
                        </Text>
                        <Text size="sm" c="dimmed">
                          {ts(`${item.key}.prompt`)}
                        </Text>
                      </Box>
                      <Group gap={6} wrap="wrap" justify="flex-end">
                        {[1, 2, 3, 4, 5, 6].map((n) => {
                          const selected = scoreValue(entry) === n;
                          return (
                            <Button
                              key={n}
                              variant={selected ? "filled" : "default"}
                              color={selected ? "kidex" : "gray"}
                              onClick={() => updateScore(item.key, { score: selected ? "" : n })}
                              style={{
                                width: 42,
                                height: 42,
                                padding: 0,
                                fontWeight: 700
                              }}
                            >
                              {n}
                            </Button>
                          );
                        })}
                      </Group>
                    </Group>
                    <Textarea
                      value={entry?.note || ""}
                      onChange={(e) => updateScore(item.key, { note: e.target.value })}
                      placeholder={t("observationNote")}
                      minRows={2}
                      variant="default"
                      size="sm"
                    />
                  </Stack>
                </Paper>
              );
            })}
          </Stack>
        </SectionCard>
      ))}

      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="xl" id="report">
        <SectionCard title={t("professionalNotes")}>
          <Stack gap="md">
            <Textarea
              label={t("generalObservation")}
              value={assessment.notes.general}
              onChange={(e) => update("notes", "general", e.target.value)}
              minRows={4}
            />
            <Textarea
              label={t("adaptationNeeds")}
              value={assessment.notes.adaptations}
              onChange={(e) => update("notes", "adaptations", e.target.value)}
              minRows={4}
            />
            <Textarea
              label={t("referralNote")}
              value={assessment.notes.referral}
              onChange={(e) => update("notes", "referral", e.target.value)}
              minRows={4}
            />
          </Stack>
        </SectionCard>
        
        <SectionCard title={t("reportPreview")}>
          <Stack gap="lg">
            <ReportList title={t("strengths")} items={strengths.map(([key, entry]) => `${ts(`${key}.title`)} (${entry.score})`)} emptyText={t("noData")} />
            <ReportList title={t("developmentPriorities")} items={needs.map(([key, entry]) => `${ts(`${key}.title`)} (${entry.score})`)} emptyText={t("noData")} />
            <Box mt="md">
              <Text size="sm" c="dimmed">
                {t("nextStep")}:
              </Text>
              <Text size="lg" mt={4} fw={700} color="kidex">
                {computed.ski === null ? t("completeAll") : computed.ski < 3.5 ? t("stabilizing") : t("sportOrientation")}
              </Text>
            </Box>
          </Stack>
        </SectionCard>
      </SimpleGrid>

      <Paper withBorder p="lg" radius="md" mt="xl">
        <Group justify="flex-end" gap="md">
          <Button variant="default" onClick={newAssessment} style={{ minWidth: 112, fontWeight: 600 }}>
            {tc("new")}
          </Button>
          <Button color="kidex" onClick={() => void saveAssessment()} disabled={saveState === "saving"} style={{ minWidth: 150, fontWeight: 700 }}>
            {saveState === "saving" ? tc("saving") : recordId ? tc("update") : tc("save")}
          </Button>
        </Group>
      </Paper>
    </Stack>
  );
}

function MetricCard({ label, value, target }: { label: string; value: string; target?: number }) {
  return (
    <Paper withBorder p="md" radius="md" style={{ flex: 1 }}>
      <Text size="sm" c="dimmed" fw={500} style={{ textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </Text>
      <Text size="xl" mt={4} fw={800} color="kidex">
        {value}
      </Text>
      {target ? (
        <Text size="sm" c="dimmed" mt={4}>
          TARGET: {target.toFixed(1)}
        </Text>
      ) : null}
    </Paper>
  );
}

function ReportList({ title, items, emptyText }: { title: string; items: string[]; emptyText: string }) {
  return (
    <Box>
      <Text size="md" fw={700} mb="xs">
        {title}
      </Text>
      {items.length ? (
        <Stack gap={4} component="ul" style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {items.map((item, idx) => (
            <Text key={`${idx}-${item}`} component="li" size="sm" style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem" }}>
              <Box component="span" c="kidex" mt="xs" style={{ display: "inline-block", alignSelf: "flex-start" }}>•</Box>
              {item}
            </Text>
          ))}
        </Stack>
      ) : (
        <Text size="sm" c="dimmed" fs="italic">
          {emptyText}
        </Text>
      )}
    </Box>
  );
}
