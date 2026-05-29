"use client";

import { Line, LineChart, ResponsiveContainer } from "recharts";
import { Box, Text } from "@mantine/core";

interface SparklineChartProps {
  data: number[];
  width?: number | string;
  height?: number;
  color?: string;
}

export function SparklineChart({ 
  data, 
  width = 80, 
  height = 30, 
  color = "var(--mantine-color-kidex-6)" 
}: SparklineChartProps) {
  if (data.length === 0) {
    return (
      <Text size="sm" c="dimmed" span>
        —
      </Text>
    );
  }

  const chartData = data.map((v, i) => ({ v, i }));
  const latest = data[data.length - 1];

  return (
    <Box
      style={{ width, height, display: "inline-block", verticalAlign: "middle" }}
      role="img"
      aria-label={`Trend sparkline with ${data.length} points. Latest value ${latest}.`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <Line
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={2}
            dot={false}
            activeDot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
}
