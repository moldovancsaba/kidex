# KIDEX Design System Adapter

Design/UI/UX SSOT: `/Users/Shared/Projects/GENERAL_DESIGN_SYSTEM`
Aligned SSOT version/date: `2.3.0 / 2026-05-24`
Local status: `governed`
Portfolio archetype: Mantine-rooted (governed)

`/Users/Shared/Projects/GENERAL_DESIGN_SYSTEM` is the single source of truth for design, UI, and UX. This file is intentionally a local adapter only. If this file conflicts with the shared SSOT, the shared SSOT wins.

## Local Adapter

- UI foundation: Mantine-only product primitives with thin KIDEX wrappers for repeated composition
- Mantine-only primitive policy: enforced; no new non-Mantine product primitives
- Theme/provider:
  - root layout: [app/[locale]/layout.tsx](/Users/Shared/Projects/kidex/app/[locale]/layout.tsx)
  - [theme/mantine-theme.ts](/Users/Shared/Projects/kidex/theme/mantine-theme.ts)
  - [components/theme/ThemeRegistry.tsx](/Users/Shared/Projects/kidex/components/theme/ThemeRegistry.tsx)
  - [components/theme/ThemeModeContext.tsx](/Users/Shared/Projects/kidex/components/theme/ThemeModeContext.tsx)
- Root provider: `MantineProvider`, `ModalsProvider`, root `Notifications` per [TEMPLATES/providers.tsx.template](/Users/Shared/Projects/GENERAL_DESIGN_SYSTEM/TEMPLATES/providers.tsx.template)
- Pattern contracts (local paths):
  - Shell: [components/layout/DashboardShell.tsx](/Users/Shared/Projects/kidex/components/layout/DashboardShell.tsx)
  - Page header: [components/ui/PageHeader.tsx](/Users/Shared/Projects/kidex/components/ui/PageHeader.tsx)
  - Detail actions: [components/ui/DetailActionBar.tsx](/Users/Shared/Projects/kidex/components/ui/DetailActionBar.tsx)
  - Metric card: [components/ui/MetricCard.tsx](/Users/Shared/Projects/kidex/components/ui/MetricCard.tsx)
  - Data toolbar: [components/ui/DataToolbar.tsx](/Users/Shared/Projects/kidex/components/ui/DataToolbar.tsx)
  - States: [LoadingState](/Users/Shared/Projects/kidex/components/ui/LoadingState.tsx), [EmptyState](/Users/Shared/Projects/kidex/components/ui/EmptyState.tsx), [ErrorState](/Users/Shared/Projects/kidex/components/ui/ErrorState.tsx)
  - Layout/content: [PageContainer](/Users/Shared/Projects/kidex/components/ui/PageContainer.tsx), [SectionCard](/Users/Shared/Projects/kidex/components/ui/SectionCard.tsx), [SearchableSelect](/Users/Shared/Projects/kidex/components/ui/SearchableSelect.tsx)
- Token authority: [theme/brand-colors.ts](/Users/Shared/Projects/kidex/theme/brand-colors.ts) (theme-internal); chart series via [components/analytics/chart-series-colors.ts](/Users/Shared/Projects/kidex/components/analytics/chart-series-colors.ts)
- Support CSS: [app/globals.css](/Users/Shared/Projects/kidex/app/globals.css) (reset, print, chart fonts, narrow utilities)
- Validation: `npm test`, `npm run lint`, `npm run build`, `npm run typecheck`
- Compliance: [gds-compliance-checklist.md](./gds-compliance-checklist.md), PR review: [gds-pr-review-checklist.md](./gds-pr-review-checklist.md)
- Shared package consumption:
  - GDS package line: `@gds/theme`, `@gds/core`, `@gds/admin` at `2.3.0`
  - KIDEX runtime line: Mantine `8.3.x`, React `19`, Next `15`
  - Direct package adoption: blocked until the shared package compatibility matrix includes Mantine `8.x`
  - Current use mode: SSOT contracts and behavior rules are authoritative now; package imports remain deferred

## Pattern Contract Inventory

| Pattern family | Local path | Maturity |
|----------------|------------|----------|
| Conductor app shell | `components/layout/DashboardShell.tsx` | active |
| Page header + detail actions | `PageHeader.tsx`, `DetailActionBar.tsx` | active |
| Product card (child registry) | `dashboard/children/page.tsx` | active |
| Metric / dashboard blocks | `MetricCard.tsx`, `MainDashboard.tsx` | active |
| Data toolbar / list view | `DataToolbar.tsx`, children & records pages | active |
| State blocks | `LoadingState`, `EmptyState`, `ErrorState` | active |
| Section / page layout | `SectionCard`, `PageContainer`, `SearchableSelect` | active |

## Local Exceptions

| Scope | Notes |
|-------|--------|
| Recharts | Chart rendering only; Mantine owns chrome and layout |
| PDF/export | Non-runtime report output |
| Global CSS | Reset, print, Recharts fonts, narrow utilities |
| `@gds/*` packages | Deferred until the shared release line supports Mantine 8 / current KIDEX stack |

## Shared SSOT Reading Order

1. [README.md](/Users/Shared/Projects/GENERAL_DESIGN_SYSTEM/README.md)
2. [FOUNDATION.md](/Users/Shared/Projects/GENERAL_DESIGN_SYSTEM/FOUNDATION.md)
3. [COMPONENTS_AND_PATTERNS.md](/Users/Shared/Projects/GENERAL_DESIGN_SYSTEM/COMPONENTS_AND_PATTERNS.md)
4. [PATTERN_SERVICE_MODEL.md](/Users/Shared/Projects/GENERAL_DESIGN_SYSTEM/PATTERN_SERVICE_MODEL.md)
5. [GOVERNANCE_AND_ADOPTION.md](/Users/Shared/Projects/GENERAL_DESIGN_SYSTEM/GOVERNANCE_AND_ADOPTION.md)
6. [SERVICE_BACKBONE_IMPLEMENTATION_PLAN.md](/Users/Shared/Projects/GENERAL_DESIGN_SYSTEM/SERVICE_BACKBONE_IMPLEMENTATION_PLAN.md)
7. [COMPATIBILITY_AND_RELEASES.md](/Users/Shared/Projects/GENERAL_DESIGN_SYSTEM/COMPATIBILITY_AND_RELEASES.md)
8. [THEME_GOVERNANCE.md](/Users/Shared/Projects/GENERAL_DESIGN_SYSTEM/THEME_GOVERNANCE.md)
9. [EXCEPTION_SURFACES.md](/Users/Shared/Projects/GENERAL_DESIGN_SYSTEM/EXCEPTION_SURFACES.md)
10. [PROJECTS/PORTFOLIO_ADOPTION_MATRIX.md](/Users/Shared/Projects/GENERAL_DESIGN_SYSTEM/PROJECTS/PORTFOLIO_ADOPTION_MATRIX.md)
11. [PROJECTS/KIDEX_MANTINE_REFACTOR.md](/Users/Shared/Projects/GENERAL_DESIGN_SYSTEM/PROJECTS/KIDEX_MANTINE_REFACTOR.md)

KIDEX refactor plan: [#50](https://github.com/moldovancsaba/kidex/issues/50)
