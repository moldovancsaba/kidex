import { CHART_SERIES_COLORS } from "@/components/analytics/chart-series-colors";

export const ANALYTICS_CONFIG = {
  chartHeight: 240,
  gaugeHeight: 180,
  tickFontSize: 12,
  lineStrokeWidth: 2.5,
  dotRadius: 4,
  activeDotRadius: 6,
  tooltipRadius: 8,
  radarOuterRadius: 75,
  fontFamily: 'var(--font-noto-sans), "Noto Sans", Helvetica, Arial, sans-serif',
  margins: { top: 10, right: 10, left: -20, bottom: 5 },
  colors: {
    primary: CHART_SERIES_COLORS.primary,
    grid: CHART_SERIES_COLORS.grid,
    text: CHART_SERIES_COLORS.text,
    dimmed: CHART_SERIES_COLORS.dimmed,
    success: CHART_SERIES_COLORS.success,
    warning: CHART_SERIES_COLORS.warning,
    error: CHART_SERIES_COLORS.error,
  },
} as const;
