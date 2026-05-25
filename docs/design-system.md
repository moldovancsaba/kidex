# KIDEX Design System Adapter

Design/UI/UX SSOT: `/Users/Shared/Projects/GENERAL_DESIGN_SYSTEM`
Aligned SSOT version/date: `2.4.3 / 2026-05-25`
Local status: `governed`
Portfolio archetype: Mantine-rooted (governed)

`/Users/Shared/Projects/GENERAL_DESIGN_SYSTEM` is the single source of truth for design, UI, and UX. This file is intentionally a local adapter only. If this file conflicts with the shared SSOT, the shared SSOT wins.

KIDEX is now **GDS-only in authority and contract governance**. It is **not yet GDS-package-only** because the public `@gds/*` package line still targets Mantine `^7.9.0` while KIDEX runs Mantine `8.3.x`.

## Local Adapter

- UI foundation: Mantine-only product primitives with a local `components/gds-local/*` compatibility layer for shared-contract parity
- Mantine-only primitive policy: enforced; no new non-Mantine product primitives
- Theme/provider:
  - root layout: [app/[locale]/layout.tsx](/Users/Shared/Projects/kidex/app/[locale]/layout.tsx)
  - [theme/mantine-theme.ts](/Users/Shared/Projects/kidex/theme/mantine-theme.ts)
  - [components/theme/ThemeRegistry.tsx](/Users/Shared/Projects/kidex/components/theme/ThemeRegistry.tsx)
  - [components/theme/ThemeModeContext.tsx](/Users/Shared/Projects/kidex/components/theme/ThemeModeContext.tsx)
- Root provider: `MantineProvider`, `ModalsProvider`, root `Notifications` per [TEMPLATES/providers.tsx.template](/Users/Shared/Projects/GENERAL_DESIGN_SYSTEM/TEMPLATES/providers.tsx.template)
- Pattern contracts (local paths):
  - Compatibility boundary:
    - [components/gds-local/core/index.ts](/Users/Shared/Projects/kidex/components/gds-local/core/index.ts)
    - [components/gds-local/admin/index.ts](/Users/Shared/Projects/kidex/components/gds-local/admin/index.ts)
  - Shell: [components/layout/DashboardShell.tsx](/Users/Shared/Projects/kidex/components/layout/DashboardShell.tsx) via local admin `AppShell`
  - Page header: [components/gds-local/admin/PageHeader.tsx](/Users/Shared/Projects/kidex/components/gds-local/admin/PageHeader.tsx)
  - Responsive data view: [components/gds-local/admin/ResponsiveDataView.tsx](/Users/Shared/Projects/kidex/components/gds-local/admin/ResponsiveDataView.tsx)
  - Editor scaffold: [components/gds-local/admin/EditorScaffold.tsx](/Users/Shared/Projects/kidex/components/gds-local/admin/EditorScaffold.tsx)
  - Form section: [components/gds-local/admin/FormSection.tsx](/Users/Shared/Projects/kidex/components/gds-local/admin/FormSection.tsx)
  - Metric card: [components/gds-local/core/MetricCard.tsx](/Users/Shared/Projects/kidex/components/gds-local/core/MetricCard.tsx)
  - Data toolbar: [components/gds-local/core/DataToolbar.tsx](/Users/Shared/Projects/kidex/components/gds-local/core/DataToolbar.tsx)
  - Product card: [components/gds-local/core/ProductCard.tsx](/Users/Shared/Projects/kidex/components/gds-local/core/ProductCard.tsx)
  - Filter drawer: [components/gds-local/core/FilterDrawer.tsx](/Users/Shared/Projects/kidex/components/gds-local/core/FilterDrawer.tsx)
  - State blocks: [components/gds-local/core/StateBlock.tsx](/Users/Shared/Projects/kidex/components/gds-local/core/StateBlock.tsx)
  - Layout/content: [components/gds-local/core/PageContainer.tsx](/Users/Shared/Projects/kidex/components/gds-local/core/PageContainer.tsx), [components/gds-local/core/SectionCard.tsx](/Users/Shared/Projects/kidex/components/gds-local/core/SectionCard.tsx), [components/gds-local/core/SearchableSelect.tsx](/Users/Shared/Projects/kidex/components/gds-local/core/SearchableSelect.tsx)
- Token authority: [theme/brand-colors.ts](/Users/Shared/Projects/kidex/theme/brand-colors.ts) (theme-internal); chart series via [components/analytics/chart-series-colors.ts](/Users/Shared/Projects/kidex/components/analytics/chart-series-colors.ts)
- Support CSS: [app/globals.css](/Users/Shared/Projects/kidex/app/globals.css) (reset, print, chart fonts, narrow utilities)
- Validation: `npm test`, `npm run lint`, `npm run build`, `npm run typecheck`
- Compliance: [gds-compliance-checklist.md](./gds-compliance-checklist.md), PR review: [gds-pr-review-checklist.md](./gds-pr-review-checklist.md)
- Shared package consumption:
  - GDS package line: `@gds/theme`, `@gds/core`, `@gds/admin` at `2.4.3`
  - KIDEX runtime line: Mantine `8.3.x`, React `19`, Next `15`
  - Direct package adoption: still blocked because the public compatibility matrix and package peer dependencies continue to target Mantine `^7.9.0`
  - Current use mode: SSOT contracts and behavior rules are authoritative now; package imports remain deferred until the shared release line supports Mantine `8.x`

## Pattern Contract Inventory

| Pattern family | Local path | Maturity |
|----------------|------------|----------|
| Conductor app shell | `components/layout/DashboardShell.tsx` via local admin `AppShell` | active |
| Page header | `components/gds-local/admin/PageHeader.tsx` | active |
| Product card (child/record registries) | `components/gds-local/core/ProductCard.tsx` | active |
| Metric / dashboard blocks | `components/gds-local/core/MetricCard.tsx`, `MainDashboard.tsx` | active |
| Data toolbar / list view | `components/gds-local/core/DataToolbar.tsx`, `components/gds-local/admin/ResponsiveDataView.tsx` | active |
| State blocks | `components/gds-local/core/StateBlock.tsx` | active |
| Section / page layout | `SectionCard`, `PageContainer`, `SearchableSelect` via `components/gds-local/core/*` | active |
| Long-form workflow | `components/gds-local/admin/EditorScaffold.tsx`, `FormSection.tsx` | active |

## Local Exceptions

| Scope | Notes |
|-------|--------|
| Recharts | Chart rendering only; Mantine owns chrome and layout |
| PDF/export | Non-runtime report output |
| Global CSS | Reset, print, Recharts fonts, narrow utilities |
| `@gds/*` packages | Deferred until the shared release line supports Mantine 8 / current KIDEX stack; GDS `2.4.3` remains Mantine 7-targeted |

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

Current KIDEX GDS issue sequence:

- Delivered local Mantine workflow slices: [#50](https://github.com/moldovancsaba/kidex/issues/50), [#51](https://github.com/moldovancsaba/kidex/issues/51), [#52](https://github.com/moldovancsaba/kidex/issues/52), [#53](https://github.com/moldovancsaba/kidex/issues/53)
- Delivered local pre-adoption canonicalization slices: [#56](https://github.com/moldovancsaba/kidex/issues/56), [#57](https://github.com/moldovancsaba/kidex/issues/57), [#58](https://github.com/moldovancsaba/kidex/issues/58), [#59](https://github.com/moldovancsaba/kidex/issues/59), [#60](https://github.com/moldovancsaba/kidex/issues/60)
- Current external dependency: [#54](https://github.com/moldovancsaba/kidex/issues/54)
- Post-adoption convergence slice: [#55](https://github.com/moldovancsaba/kidex/issues/55)
