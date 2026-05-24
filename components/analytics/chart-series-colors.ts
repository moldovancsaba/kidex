export const CHART_SERIES_COLORS = {
  primary: "var(--mantine-color-kidex-6)",
  success: "var(--mantine-color-teal-6)",
  warning: "var(--mantine-color-yellow-6)",
  error: "var(--mantine-color-red-6)",
  info: "var(--mantine-color-blue-6)",
  accent: "var(--mantine-color-orange-6)",
  violet: "var(--mantine-color-violet-6)",
  cyan: "var(--mantine-color-cyan-6)",
  grid: "var(--mantine-color-gray-4)",
  text: "var(--mantine-color-text)",
  dimmed: "var(--mantine-color-gray-6)",
} as const;

export const CHART_ORIENTATION_COLORS = [
  CHART_SERIES_COLORS.info,
  CHART_SERIES_COLORS.accent,
  CHART_SERIES_COLORS.violet,
  CHART_SERIES_COLORS.cyan,
] as const;

export const CHART_RISK_COLORS = {
  high: CHART_SERIES_COLORS.error,
  medium: CHART_SERIES_COLORS.warning,
  low: CHART_SERIES_COLORS.info,
} as const;

export const CHART_READINESS_STACK_COLORS = {
  ready: CHART_SERIES_COLORS.success,
  developing: CHART_SERIES_COLORS.warning,
  watch: CHART_SERIES_COLORS.error,
} as const;

export const CHART_BENCHMARK_STACK_COLORS = {
  meetingTarget: "var(--mantine-color-green-7)",
  onTrack: CHART_SERIES_COLORS.info,
  belowMinimum: "var(--mantine-color-red-7)",
} as const;
