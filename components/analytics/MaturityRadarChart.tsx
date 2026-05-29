"use client";

import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Box, Paper, Text, useMantineTheme } from "@mantine/core";
import { StateBlock } from "@doneisbetter/gds/client";
import { ANALYTICS_CONFIG } from "./AnalyticsConstants";

interface RadarPoint {
  subject: string;
  A: number;
  B?: number;
  fullMark: number;
}

interface MaturityRadarChartProps {
  title?: string;
  data: RadarPoint[];
  labels?: {
    A: string;
    B?: string;
  };
}

export function MaturityRadarChart({ 
  title, 
  data,
  labels = { A: "Current" }
}: MaturityRadarChartProps) {
  const theme = useMantineTheme();
  const strongest = data.reduce<RadarPoint | null>((best, entry) => {
    if (!best) return entry;
    return entry.A > best.A ? entry : best;
  }, null);

  if (data.length === 0) {
    return (
      <Paper withBorder p="md" radius="md">
        <StateBlock variant="empty" title={title || "Profile unavailable"} description="No radar profile data is available yet." compact />
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
        aria-label={`${title || "Radar profile"} chart with ${data.length} dimensions.`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius={ANALYTICS_CONFIG.radarOuterRadius} data={data}>
            <PolarGrid stroke={theme.colors.gray[4]} />
            <PolarAngleAxis
              dataKey="subject"
              tick={{ fontSize: 10, fill: ANALYTICS_CONFIG.colors.text, fontFamily: ANALYTICS_CONFIG.fontFamily }}
            />
            <PolarRadiusAxis
              angle={30}
              domain={[0, 6]}
              tick={{ fontSize: 8, fill: theme.colors.gray[6] }}
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
            {labels.B && (
              <Legend 
                verticalAlign="bottom" 
                align="center" 
                iconType="circle"
                wrapperStyle={{ 
                  paddingTop: "10px", 
                  fontSize: "10px", 
                  fontFamily: ANALYTICS_CONFIG.fontFamily 
                }} 
              />
            )}
            <Radar
              name={labels.A}
              dataKey="A"
              stroke={ANALYTICS_CONFIG.colors.primary}
              fill={ANALYTICS_CONFIG.colors.primary}
              fillOpacity={0.6}
            />
            {labels.B && (
              <Radar
                name={labels.B}
                dataKey="B"
                stroke={theme.colors.gray[6]}
                fill={theme.colors.gray[6]}
                fillOpacity={0.3}
              />
            )}
          </RadarChart>
        </ResponsiveContainer>
      </Box>
      {strongest ? (
        <Text size="sm" c="dimmed" mt="sm">
          Strongest current dimension: {strongest.subject} at {strongest.A.toFixed(1)}.
        </Text>
      ) : null}
    </Paper>
  );
}
