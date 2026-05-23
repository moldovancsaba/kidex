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
  - [theme/tokens.ts](/Users/Shared/Projects/kidex/theme/tokens.ts) — legacy bridge; feature code should prefer `theme/mantine-theme.ts` and Mantine theme tokens
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
| Conductor app shell | [components/layout/DashboardShell.tsx](/Users/Shared/Projects/kidex/components/layout/DashboardShell.tsx) | pilot | Mobile footer nav for primary destinations exists; drawer still used for secondary nav; shell still uses parallel `KIDEX_COLORS` |
| Page header | [components/ui/PageHeader.tsx](/Users/Shared/Projects/kidex/components/ui/PageHeader.tsx) | pilot | Used across dashboard routes; action-row consistency still drifts by page |
| Product card (child registry) | [app/[locale]/dashboard/children/page.tsx](/Users/Shared/Projects/kidex/app/[locale]/dashboard/children/page.tsx) | planned | Too many simultaneous actions on mobile; needs one-primary-action contract |
| Metric / dashboard blocks | [components/dashboard/MainDashboard.tsx](/Users/Shared/Projects/kidex/components/dashboard/MainDashboard.tsx) | planned | Mobile order should be operational-first (overdue, due soon, start/resume) before analytics |
| Data toolbar / responsive data view | children and records list surfaces | backlog | Filters and tables need shared toolbar and mobile fallback contract |
| State blocks (empty/loading/error) | scattered per route | backlog | Promote repeated states into thin wrappers or explicit Mantine patterns |
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
| Parallel token bridge (`theme/tokens.ts`) | historical KIDEX color/layout constants used before full theme consolidation | some feature and shell code still import `KIDEX_COLORS` directly | remove as surfaces migrate to Mantine theme tokens only |

## Migration Backlog

1. Complete conductor mobile shell: mobile-first primary navigation, drawer/overflow for secondary destinations only, migrate shell styling off `KIDEX_COLORS` to theme tokens.
2. Reorder dashboard mobile sections per operational-first contract ([MainDashboard.tsx](/Users/Shared/Projects/kidex/components/dashboard/MainDashboard.tsx)).
3. Normalize child registry cards to one primary action per card ([children/page.tsx](/Users/Shared/Projects/kidex/app/[locale]/dashboard/children/page.tsx)).
4. Standardize record and child detail page headers and action rows.
5. Audit filters and tables against the responsive data view contract.
6. Reduce `globals.css` and direct `KIDEX_COLORS` usage in feature code; keep documented narrow exceptions only.
7. Add enforcement: import boundaries, forbidden raw color values in feature UI, and pattern-drift checks per shared governance.

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
