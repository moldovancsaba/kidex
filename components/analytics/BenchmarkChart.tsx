"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Box, Paper, Text, useMantineTheme } from "@mantine/core";
import { StateBlock } from "@doneisbetter/gds/client";
import { ANALYTICS_CONFIG } from "./AnalyticsConstants";

interface BenchmarkData {
  subject: string;
  individual: number;
  average: number;
}

interface BenchmarkChartProps {
  title?: string;
  data: BenchmarkData[];
  labels?: {
    individual: string;
    average: string;
  };
}

export function BenchmarkChart({ 
  title, 
  data,
  labels = { individual: "Individual", average: "Age Group Avg" }
}: BenchmarkChartProps) {
  const theme = useMantineTheme();
  const strongestGap = data.reduce<BenchmarkData | null>((best, entry) => {
    if (!best) return entry;
    return entry.individual - entry.average > best.individual - best.average ? entry : best;
  }, null);

  if (data.length === 0) {
    return (
      <Paper withBorder p="md" radius="md">
        <StateBlock variant="empty" title={title || "Benchmark unavailable"} description="No benchmark comparison data is available yet." compact />
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
        aria-label={`${title || "Benchmark comparison"} chart with ${data.length} subjects.`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={ANALYTICS_CONFIG.margins} barGap={8}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.colors.gray[3]} />
            <XAxis
              dataKey="subject"
              tick={{ fontSize: 10, fill: ANALYTICS_CONFIG.colors.text, fontFamily: ANALYTICS_CONFIG.fontFamily }}
              axisLine={false}
              tickLine={false}
              dy={8}
            />
            <YAxis
              domain={[0, 6]}
              tick={{ fontSize: 10, fill: ANALYTICS_CONFIG.colors.text, fontFamily: ANALYTICS_CONFIG.fontFamily }}
              axisLine={false}
              tickLine={false}
              width={30}
            />
            <Tooltip
              cursor={{ fill: "var(--mantine-color-gray-1)" }}
              contentStyle={{
                background: "var(--mantine-color-body)",
                border: "1px solid var(--mantine-color-default-border)",
                borderRadius: ANALYTICS_CONFIG.tooltipRadius,
                fontFamily: ANALYTICS_CONFIG.fontFamily,
                fontSize: "12px"
              }}
            />
            <Legend 
              verticalAlign="top" 
              align="right" 
              iconType="circle"
              wrapperStyle={{ 
                paddingBottom: "20px", 
                fontSize: "10px", 
                fontFamily: ANALYTICS_CONFIG.fontFamily 
              }} 
            />
            <Bar
              name={labels.individual}
              dataKey="individual"
              fill={ANALYTICS_CONFIG.colors.primary}
              radius={[4, 4, 0, 0]}
              barSize={20}
            />
            <Bar
              name={labels.average}
              dataKey="average"
              fill={theme.colors.gray[5]}
              radius={[4, 4, 0, 0]}
              barSize={20}
            />
          </BarChart>
        </ResponsiveContainer>
      </Box>
      {strongestGap ? (
        <Text size="sm" c="dimmed" mt="sm">
          Largest positive gap: {strongestGap.subject} at {(strongestGap.individual - strongestGap.average).toFixed(1)} above average.
        </Text>
      ) : null}
    </Paper>
  );
}
