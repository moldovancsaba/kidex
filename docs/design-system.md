# KIDEX Design System Adapter

SSOT: [sovereignsquad/general-design-system](https://github.com/sovereignsquad/general-design-system)  
Aligned package/runtime line: `2.6.4 / 2026-05-29`  
Local status: `direct umbrella package adoption with exceptions only`

This file is a local adapter only. If it conflicts with the shared GDS repository, the shared repository wins.

## Current adoption state

KIDEX now consumes the published GDS package line from npm:

- `@doneisbetter/gds`
- `@doneisbetter/gds-theme`
- `@doneisbetter/gds-core`
- `@doneisbetter/gds-admin`
- `@doneisbetter/gds-eslint-config`
- `@doneisbetter/gds-compliance`

The app is GDS-governed and GDS-runtime-backed. The former `components/gds-local/core` adapter layer has been removed. Remaining divergence is tracked only as approved exception surfaces in [gds-adoption.json](../gds-adoption.json).

## Runtime contract

- Root provider: [app/providers.tsx](/Users/Shared/Projects/kidex/app/providers.tsx)
- Root layout: [app/[locale]/layout.tsx](/Users/Shared/Projects/kidex/app/%5Blocale%5D/layout.tsx)
- Theme extension: [theme/mantine-theme.ts](/Users/Shared/Projects/kidex/theme/mantine-theme.ts)

Current runtime usage follows the canonical GDS umbrella split:

- server-safe imports:
  - `@doneisbetter/gds/server`
- interactive imports:
  - `@doneisbetter/gds/client`

The granular `@doneisbetter/gds-*` packages remain the underlying published lanes, but KIDEX runtime code now treats the umbrella package as the canonical import surface.

## Canonical surfaces in KIDEX

- Shell: [components/layout/DashboardShell.tsx](/Users/Shared/Projects/kidex/components/layout/DashboardShell.tsx) via `DiscoveryShell`, `SidebarNav`, and `SidebarNavItem` from `@doneisbetter/gds/client`
- Registry lists: [app/[locale]/dashboard/children/page.tsx](/Users/Shared/Projects/kidex/app/%5Blocale%5D/dashboard/children/page.tsx) and [app/[locale]/dashboard/records/page.tsx](/Users/Shared/Projects/kidex/app/%5Blocale%5D/dashboard/records/page.tsx) via `ResponsiveDataView`
- Page headers: direct `AdminPageHeader` usage from `@doneisbetter/gds`
- Assessment workflow scaffold: [components/forms/KidexAssessmentApp.tsx](/Users/Shared/Projects/kidex/components/forms/KidexAssessmentApp.tsx) via direct `EditorScaffold` and `FormSection` imports from `@doneisbetter/gds`
- Shared primitives:
  - direct `DataToolbar`
  - direct `FilterDrawer`
  - direct `MetricCard`
  - direct `ProductCard`
  - direct `SectionPanel`
  - direct `StateBlock`

## Adapter status

KIDEX no longer keeps a shared local primitive adapter layer for metric, product-card, section-panel, or state-block contracts. Any remaining non-GDS behavior must now be:

- a documented approved exception surface in [gds-adoption.json](../gds-adoption.json), or
- a product-authored composition built directly from GDS primitives

## Approved exception surfaces

- Current KIDEX exceptions:
  - Recharts rendering: GDS governs chrome/layout, mobile priority, and state handling, not the chart engine
  - PDF and document export rendering
  - searchable selection behavior in the assessment and settings flows until the upstream searchable-selection contract is finalized
- Product-authored but still GDS-compliant surfaces:
  - child-state summaries
  - recommendation evidence blocks
  - progress and plan-effectiveness interpretation
  - follow-up queue cards and conductor triage flows
  - consent/governance panels and report-delivery notices
  These are not exceptions when built from GDS primitives.
- Additional non-standard categories allowed by the shared SSOT if KIDEX needs them later:
  - map engines
  - sanctioned embeds
  - hardware-adjacent capture surfaces
  - playback/kiosk surfaces
  Those remain narrow exception surfaces and must be recorded in [gds-adoption.json](../gds-adoption.json) before implementation.

## Enforcement

- shared lint rules come from `@doneisbetter/gds-eslint-config`
- manifest and drift checks come from `@doneisbetter/gds-compliance`
- repo manifest: [gds-adoption.json](../gds-adoption.json)

Canonical commands:

```bash
npm run gds:manifest
npm run gds:compliance
```

## Shared reading order

1. [README.md](https://github.com/sovereignsquad/general-design-system/blob/main/README.md)
2. [COMPATIBILITY_AND_RELEASES.md](https://github.com/sovereignsquad/general-design-system/blob/main/COMPATIBILITY_AND_RELEASES.md)
3. [COMPONENTS_AND_PATTERNS.md](https://github.com/sovereignsquad/general-design-system/blob/main/COMPONENTS_AND_PATTERNS.md)
4. [FOUNDATION.md](https://github.com/sovereignsquad/general-design-system/blob/main/FOUNDATION.md)
5. [THEME_GOVERNANCE.md](https://github.com/sovereignsquad/general-design-system/blob/main/THEME_GOVERNANCE.md)
6. [GOVERNANCE_AND_ADOPTION.md](https://github.com/sovereignsquad/general-design-system/blob/main/GOVERNANCE_AND_ADOPTION.md)
7. [ADOPTION_AND_MIGRATION_PLAYBOOK.md](https://github.com/sovereignsquad/general-design-system/blob/main/ADOPTION_AND_MIGRATION_PLAYBOOK.md)
8. [COMPLIANCE_TOOLKIT.md](https://github.com/sovereignsquad/general-design-system/blob/main/COMPLIANCE_TOOLKIT.md)
9. [DEPRECATIONS_AND_MIGRATIONS.md](https://github.com/sovereignsquad/general-design-system/blob/main/DEPRECATIONS_AND_MIGRATIONS.md)
10. [VERIFIED_CONSUMER_INSTALL_PROOF.md](https://github.com/sovereignsquad/general-design-system/blob/main/VERIFIED_CONSUMER_INSTALL_PROOF.md)
