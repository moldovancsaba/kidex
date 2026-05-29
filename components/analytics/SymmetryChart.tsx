"use client";

import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer, Tooltip } from "recharts";
import { Box, Paper, Text, useMantineTheme } from "@mantine/core";
import { StateBlock } from "@doneisbetter/gds/client";
import { ANALYTICS_CONFIG } from "./AnalyticsConstants";

interface SymmetryData {
  domain: string;
  value: number;
}

interface SymmetryChartProps {
  title?: string;
  data: SymmetryData[];
}

export function SymmetryChart({ title, data }: SymmetryChartProps) {
  const theme = useMantineTheme();
  const strongest = data.reduce<SymmetryData | null>((best, entry) => {
    if (!best) return entry;
    return entry.value > best.value ? entry : best;
  }, null);

  if (data.length === 0) {
    return (
      <Paper withBorder p="md" radius="md">
        <StateBlock variant="empty" title={title || "Symmetry unavailable"} description="No symmetry data is available yet." compact />
      </Paper>
    );
  }

  return (
    <Paper withBorder p="md" radius="md">
      {title && (
        <Text fw={700} size="sm" mb="md">
          {title}
        </Text>
      )}
      <Box
        style={{ width: "100%", height: ANALYTICS_CONFIG.chartHeight }}
        role="img"
        aria-label={`${title || "Symmetry chart"} with ${data.length} domains.`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius={ANALYTICS_CONFIG.radarOuterRadius} data={data}>
            <PolarGrid stroke={theme.colors.gray[4]} />
            <PolarAngleAxis
              dataKey="domain"
              tick={{ fontSize: 11, fill: ANALYTICS_CONFIG.colors.text, fontFamily: ANALYTICS_CONFIG.fontFamily, fontWeight: 600 }}
            />
            <Tooltip
              contentStyle={{
                background: "var(--mantine-color-body)",
                border: "1px solid var(--mantine-color-default-border)",
                borderRadius: ANALYTICS_CONFIG.tooltipRadius,
                fontFamily: ANALYTICS_CONFIG.fontFamily,
                fontSize: "12px"
              }}
            />
            <Radar
              name="Score"
              dataKey="value"
              stroke={ANALYTICS_CONFIG.colors.primary}
              fill={ANALYTICS_CONFIG.colors.primary}
              fillOpacity={0.4}
              dot={{ r: 4, fill: ANALYTICS_CONFIG.colors.primary }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </Box>
      {strongest ? (
        <Text size="sm" c="dimmed" mt="sm">
          Highest symmetry score: {strongest.domain} at {strongest.value.toFixed(1)}.
        </Text>
      ) : null}
    </Paper>
  );
}
