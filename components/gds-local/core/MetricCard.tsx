"use client";

import type { ReactNode } from "react";
import { MetricCard as GdsMetricCard } from "@doneisbetter/gds/client";

export type MetricCardProps = {
  label: string;
  value: ReactNode;
  description?: ReactNode;
  trend?: {
    label: string;
    tone?: "positive" | "negative" | "neutral";
  };
  icon?: ReactNode;
  footer?: ReactNode;
  target?: number;
};

export function MetricCard({ label, value, description, trend, icon, footer, target }: MetricCardProps) {
  const derivedDescription = description ?? (typeof target === "number" ? `Target ${target}` : undefined);

  return <GdsMetricCard label={label} value={value} description={derivedDescription} trend={trend} icon={icon} footer={footer} />;
}
