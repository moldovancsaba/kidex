"use client";

import { useEffect, useState, use } from "react";
import { Alert, Box, Button, Loader, Paper, Slider, Stack, Text, Title } from "@mantine/core";

type SurveyQuestion = {
  key: string;
  label: string;
  prompt: string;
};

type SurveyPayload = {
  id?: string;
  title: string;
  scopeLabel: string;
  targetRole: string;
  status: string;
  closesAt?: string;
  minResponses: number;
  questions: SurveyQuestion[];
};

export default function CultureVoicePage({
  params,
}: {
  params: Promise<{ locale: string; token: string }>;
}) {
  const { token } = use(params);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [survey, setSurvey] = useState<SurveyPayload | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});

  useEffect(() => {
    fetch(`/api/culture-voice?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("load_failed");
        return await res.json();
      })
      .then((data) => {
        const nextSurvey = data.survey as SurveyPayload;
        setSurvey(nextSurvey);
        setAnswers(Object.fromEntries((nextSurvey.questions || []).map((question) => [question.key, 3])));
      })
      .catch(() => setError("This anonymous survey link is invalid or no longer available."))
      .finally(() => setLoading(false));
  }, [token]);

  async function submit() {
    setSaving(true);
    setError("");
    const response = await fetch("/api/culture-voice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, answers }),
    }).catch(() => null);
    setSaving(false);
    if (!response?.ok) {
      setError("The survey could not be submitted. Please try again later.");
      return;
    }
    setSubmitted(true);
  }

  if (loading) {
    return (
      <Box style={{ display: "flex", justifyContent: "center", paddingBlock: "3rem" }}>
        <Loader aria-label="Loading survey" />
      </Box>
    );
  }

  if (!survey) {
    return (
      <Box maw={760} mx="auto" py="xl" px="md">
        <Alert color="red">{error || "Survey not available."}</Alert>
      </Box>
    );
  }

  if (submitted) {
    return (
      <Box maw={760} mx="auto" py="xl" px="md">
        <Paper withBorder p="xl" radius="lg">
          <Stack gap="md">
            <Title order={2}>Thank you</Title>
            <Text>Your anonymous response has been recorded.</Text>
            <Text c="dimmed">
              Results are only shown in aggregate after the minimum response threshold is met.
            </Text>
          </Stack>
        </Paper>
      </Box>
    );
  }

  return (
    <Box maw={760} mx="auto" py="xl" px="md">
      <Stack gap="lg">
        <Paper withBorder p="xl" radius="lg">
          <Stack gap="sm">
            <Title order={2}>{survey.title}</Title>
            <Text c="dimmed">
              {survey.scopeLabel} · {survey.targetRole}
            </Text>
            <Text c="dimmed">
              This survey is anonymous. Individual responses are not shown back unless the launch meets the minimum response threshold of {survey.minResponses}.
            </Text>
            {survey.closesAt ? (
              <Text size="sm" c="dimmed">Closes: {new Date(survey.closesAt).toLocaleDateString()}</Text>
            ) : null}
            {error ? <Alert color="red">{error}</Alert> : null}
          </Stack>
        </Paper>

        {survey.questions.map((question) => (
          <Paper key={question.key} withBorder p="lg" radius="md">
            <Stack gap="md">
              <Text fw={700}>{question.label}</Text>
              <Text size="sm" c="dimmed">{question.prompt}</Text>
              <Slider
                min={1}
                max={5}
                step={1}
                marks={[
                  { value: 1, label: "1" },
                  { value: 3, label: "3" },
                  { value: 5, label: "5" },
                ]}
                value={answers[question.key] ?? 3}
                onChange={(value) => setAnswers((current) => ({ ...current, [question.key]: value }))}
              />
              <Text size="sm" c="dimmed">
                1 = strongly disagree / very weak, 5 = strongly agree / very strong
              </Text>
            </Stack>
          </Paper>
        ))}

        <Button color="kidex" onClick={() => void submit()} loading={saving}>
          Submit anonymous survey
        </Button>
      </Stack>
    </Box>
  );
}
