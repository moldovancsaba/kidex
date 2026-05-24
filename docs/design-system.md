# KIDEX Design System Adapter

Design/UI/UX SSOT: `/Users/Shared/Projects/GENERAL_DESIGN_SYSTEM`
Aligned SSOT version/date: `2.2.0 / 2026-05-23`
Local status: `migrating`
Portfolio archetype: Mantine-rooted drift cleanup (see shared portfolio matrix)

`/Users/Shared/Projects/GENERAL_DESIGN_SYSTEM` is the single source of truth for design, UI, and UX. This file is intentionally a local adapter only. If this file conflicts with the shared SSOT, the shared SSOT wins.

## Local Adapter

- Current UI foundation: Mantine-driven product UI with some remaining local composition, parallel token usage, and support CSS
- Target UI foundation: strict Mantine-only product primitive system with thin KIDEX wrappers only where repeated defaults matter
- Mantine-only primitive policy: required target state; no new non-Mantine product primitives are allowed
- Theme/provider:
  - root layout entry: [app/[locale]/layout.tsx](/Users/Shared/Projects/kidex/app/[locale]/layout.tsx)
  - [theme/mantine-theme.ts](/Users/Shared/Projects/kidex/theme/mantine-theme.ts)
  - [components/theme/ThemeRegistry.tsx](/Users/Shared/Projects/kidex/components/theme/ThemeRegistry.tsx)
  - [components/theme/ThemeModeContext.tsx](/Users/Shared/Projects/kidex/components/theme/ThemeModeContext.tsx)
- Root provider/theme implementation note:
  - `NextIntlClientProvider` wraps `ThemeRegistry` in [app/[locale]/layout.tsx](/Users/Shared/Projects/kidex/app/[locale]/layout.tsx)
  - `ThemeRegistry` provides `MantineProvider`, `ModalsProvider`, and root `Notifications` aligned to [TEMPLATES/providers.tsx.template](/Users/Shared/Projects/GENERAL_DESIGN_SYSTEM/TEMPLATES/providers.tsx.template)
  - locale-aware RTL and color mode are applied in `ThemeRegistry` via `ThemeModeProvider` and `getKidexMantineTheme`
- Wrapper/components and shell layer:
  - [components/layout/DashboardShell.tsx](/Users/Shared/Projects/kidex/components/layout/DashboardShell.tsx)
  - [components/ui/PageContainer.tsx](/Users/Shared/Projects/kidex/components/ui/PageContainer.tsx)
  - [components/ui/PageHeader.tsx](/Users/Shared/Projects/kidex/components/ui/PageHeader.tsx)
  - [components/ui/SectionCard.tsx](/Users/Shared/Projects/kidex/components/ui/SectionCard.tsx)
  - [components/ui/SearchableSelect.tsx](/Users/Shared/Projects/kidex/components/ui/SearchableSelect.tsx)
- Primitive policy:
  - direct Mantine primitives are the default for ordinary controls
  - thin local wrappers currently exist for page/header/card/select composition only
  - no new non-Mantine product primitives are allowed
- Styling bridge or legacy layer:
  - [app/globals.css](/Users/Shared/Projects/kidex/app/globals.css) — reset, print, and narrow shared utilities only (target state)
  - [theme/brand-colors.ts](/Users/Shared/Projects/kidex/theme/brand-colors.ts) — canonical palette; theme-internal only (imported by `mantine-theme.ts`)
- UI validation commands:
  - `npm test`
  - `npm run lint`
  - `npm run build`
  - `npm run typecheck`
- Shared npm packages (`@gds/core`, `@gds/theme`, `@gds/admin`): not adopted; GDS packages currently target Mantine 7 while KIDEX uses Mantine 8. Continue local adapters and templates until package versions align.

## Pattern Contract Inventory

Required by [GOVERNANCE_AND_ADOPTION.md](/Users/Shared/Projects/GENERAL_DESIGN_SYSTEM/GOVERNANCE_AND_ADOPTION.md). Local paths implement shared contracts; they may not redefine behavior.

| Pattern family | Local path | Maturity | Notes |
|----------------|------------|----------|-------|
| Conductor app shell | [components/layout/DashboardShell.tsx](/Users/Shared/Projects/kidex/components/layout/DashboardShell.tsx) | active | Mobile footer for primary routes; drawer for secondary/settings + logout; theme tokens via `useMantineTheme` |
| Page header | [components/ui/PageHeader.tsx](/Users/Shared/Projects/kidex/components/ui/PageHeader.tsx) | pilot | Used across dashboard routes; detail-page action rows still drift |
| Product card (child registry) | [app/[locale]/dashboard/children/page.tsx](/Users/Shared/Projects/kidex/app/[locale]/dashboard/children/page.tsx) | active | One primary action + overflow menu; badge density still improvable |
| Metric / dashboard blocks | [components/ui/MetricCard.tsx](/Users/Shared/Projects/kidex/components/ui/MetricCard.tsx), [components/dashboard/MainDashboard.tsx](/Users/Shared/Projects/kidex/components/dashboard/MainDashboard.tsx) | active | Operational-first mobile order; shared `MetricCard` |
| Data toolbar / responsive data view | [components/ui/DataToolbar.tsx](/Users/Shared/Projects/kidex/components/ui/DataToolbar.tsx) | pilot | Children and records lists; mobile table fallback still open |
| State blocks (empty/loading/error) | [components/ui/LoadingState.tsx](/Users/Shared/Projects/kidex/components/ui/LoadingState.tsx) | pilot | Loading standardized; empty/error still per-route |
| Section / grouped content | [components/ui/SectionCard.tsx](/Users/Shared/Projects/kidex/components/ui/SectionCard.tsx) | pilot | Standard grouped content container |
| Page layout width | [components/ui/PageContainer.tsx](/Users/Shared/Projects/kidex/components/ui/PageContainer.tsx) | active | Content width and padding |
| Searchable select | [components/ui/SearchableSelect.tsx](/Users/Shared/Projects/kidex/components/ui/SearchableSelect.tsx) | active | Reusable searchable select wrapper |

## Pattern Service Sequence (KIDEX)

From [PATTERN_SERVICE_MODEL.md](/Users/Shared/Projects/GENERAL_DESIGN_SYSTEM/PATTERN_SERVICE_MODEL.md) and [PROJECTS/KIDEX_MANTINE_REFACTOR.md](/Users/Shared/Projects/GENERAL_DESIGN_SYSTEM/PROJECTS/KIDEX_MANTINE_REFACTOR.md):

1. Conductor app shell and mobile primary navigation — stable top-level destinations without drawer-only routine work
2. Dashboard mobile content order — overdue, due soon, start/resume survey before lower-priority analytics
3. Child registry cards — one visible primary action per card on mobile; secondary actions in menus
4. Records and child detail headers — standardized title, purpose, primary action, secondary action placement
5. Filters and tables — responsive data view and data-toolbar contract on list surfaces

Active implementation issue: [#50](https://github.com/moldovancsaba/kidex/issues/50) `KIDEX Platform P1: Mantine-only mobile shell and responsive conductor workflow refactor`

Compliance tracking: [gds-compliance-checklist.md](./gds-compliance-checklist.md) (migrating → governed)

## Local Exceptions

| Scope | Reason | User impact | Removal condition |
|-------|--------|-------------|-------------------|
| Charts and analytics surfaces | Recharts is still used for visualization rendering, but product framing, controls, layout, and state handling must remain Mantine-governed | some rendering behavior is outside Mantine, but it is not a separate UI system | keep until a chart adapter contract is standardized in the shared SSOT |
| PDF/export rendering | PDF output is not a Mantine runtime surface | export rendering follows report constraints rather than app-shell behavior | keep until export-specific contracts are formalized in the shared SSOT |
| Global CSS utility layer | a small amount of app-wide utility and print styling still exists outside Mantine styling APIs | some support styling remains outside component props | reduce over time as shell and page surfaces are refactored |
| Parallel token bridge | removed — palette consolidated in `theme/brand-colors.ts` (theme-internal) | — | completed |

## Migration Backlog

1. Standardize record and child detail page headers and action rows (Phase 4).
2. Improve survey start/resume UX (Phase 5).
3. Promote empty/error state blocks beyond `LoadingState`.
4. Audit chart series hex usage against a shared chart adapter contract.
5. Add ESLint guard for raw hex in feature UI (excluding chart adapters).

## Shared SSOT Reading Order

Read the shared design system in this order:

1. [README.md](/Users/Shared/Projects/GENERAL_DESIGN_SYSTEM/README.md)
2. [FOUNDATION.md](/Users/Shared/Projects/GENERAL_DESIGN_SYSTEM/FOUNDATION.md)
3. [COMPONENTS_AND_PATTERNS.md](/Users/Shared/Projects/GENERAL_DESIGN_SYSTEM/COMPONENTS_AND_PATTERNS.md)
4. [PATTERN_SERVICE_MODEL.md](/Users/Shared/Projects/GENERAL_DESIGN_SYSTEM/PATTERN_SERVICE_MODEL.md)
5. [GOVERNANCE_AND_ADOPTION.md](/Users/Shared/Projects/GENERAL_DESIGN_SYSTEM/GOVERNANCE_AND_ADOPTION.md)
6. [SERVICE_BACKBONE_IMPLEMENTATION_PLAN.md](/Users/Shared/Projects/GENERAL_DESIGN_SYSTEM/SERVICE_BACKBONE_IMPLEMENTATION_PLAN.md)
7. [PROJECTS/PORTFOLIO_ADOPTION_MATRIX.md](/Users/Shared/Projects/GENERAL_DESIGN_SYSTEM/PROJECTS/PORTFOLIO_ADOPTION_MATRIX.md)
8. [PROJECTS/KIDEX_MANTINE_REFACTOR.md](/Users/Shared/Projects/GENERAL_DESIGN_SYSTEM/PROJECTS/KIDEX_MANTINE_REFACTOR.md)

Shared implementation recipes used for the KIDEX refactor:

- [TEMPLATES/theme.ts.template](/Users/Shared/Projects/GENERAL_DESIGN_SYSTEM/TEMPLATES/theme.ts.template)
- [TEMPLATES/providers.tsx.template](/Users/Shared/Projects/GENERAL_DESIGN_SYSTEM/TEMPLATES/providers.tsx.template)
- [TEMPLATES/AppPageHeader.tsx.template](/Users/Shared/Projects/GENERAL_DESIGN_SYSTEM/TEMPLATES/AppPageHeader.tsx.template)
- [TEMPLATES/AppShell.tsx.template](/Users/Shared/Projects/GENERAL_DESIGN_SYSTEM/TEMPLATES/AppShell.tsx.template)
