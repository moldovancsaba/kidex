"use client";

import { Line, LineChart, ResponsiveContainer } from "recharts";
import { Box } from "@mantine/core";

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
  const chartData = data.map((v, i) => ({ v, i }));

  return (
    <Box style={{ width, height, display: "inline-block", verticalAlign: "middle" }}>
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
