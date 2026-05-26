# KIDEX Design System Adapter

SSOT: [sovereignsquad/general-design-system](https://github.com/sovereignsquad/general-design-system)  
Aligned package/runtime line: `2.6.1 / 2026-05-26`  
Local status: `direct package adoption with thin adapters`

This file is a local adapter only. If it conflicts with the shared GDS repository, the shared repository wins.

## Current adoption state

KIDEX now consumes the published GDS package line from npm:

- `@doneisbetter/gds-theme`
- `@doneisbetter/gds-core`
- `@doneisbetter/gds-admin`
- `@doneisbetter/gds-eslint-config`
- `@doneisbetter/gds-compliance`

The app is GDS-governed and GDS-runtime-backed. Remaining local UI wrappers are thin adapters only, documented in [gds-adoption.json](../gds-adoption.json).

## Runtime contract

- Root provider: [app/providers.tsx](/Users/Shared/Projects/kidex/app/providers.tsx)
- Root layout: [app/[locale]/layout.tsx](/Users/Shared/Projects/kidex/app/%5Blocale%5D/layout.tsx)
- Theme extension: [theme/mantine-theme.ts](/Users/Shared/Projects/kidex/theme/mantine-theme.ts)

Current package usage follows the GDS server/client split:

- server-safe theme and message imports:
  - `@doneisbetter/gds-theme/server`
  - `@doneisbetter/gds-core/server`
  - `@doneisbetter/gds-admin/server`
- interactive imports:
  - `@doneisbetter/gds-theme/client`
  - `@doneisbetter/gds-core/client`
  - `@doneisbetter/gds-admin/client`

## Canonical surfaces in KIDEX

- Shell: [components/layout/DashboardShell.tsx](/Users/Shared/Projects/kidex/components/layout/DashboardShell.tsx) via `@doneisbetter/gds-admin/client`
- Registry lists: [app/[locale]/dashboard/children/page.tsx](/Users/Shared/Projects/kidex/app/%5Blocale%5D/dashboard/children/page.tsx) and [app/[locale]/dashboard/records/page.tsx](/Users/Shared/Projects/kidex/app/%5Blocale%5D/dashboard/records/page.tsx) via `ResponsiveDataView`
- Page headers: `PageHeader` from `@doneisbetter/gds-admin`
- Assessment workflow scaffold: [components/forms/KidexAssessmentApp.tsx](/Users/Shared/Projects/kidex/components/forms/KidexAssessmentApp.tsx) via `EditorScaffold` and `FormSection`
- Shared primitives:
  - `MetricCard`
  - `DataToolbar`
  - `FilterDrawer`
  - `ProductCard`
  - `SectionPanel`
  - `StateBlock`

## Approved thin adapters

Thin adapters remain in [components/gds-local](/Users/Shared/Projects/kidex/components/gds-local) only where KIDEX still needs:

- legacy prop-shape preservation during migration
- temporary contract bridging for `SearchableSelect`
- local composition helpers for state-block family usage

These adapters are governed by [gds-adoption.json](../gds-adoption.json) and checked by `gds-compliance`.

## Approved exception surfaces

- Recharts rendering: GDS governs chrome/layout, not the chart engine
- PDF and document export rendering
- `SearchableSelect` until the upstream searchable-selection contract is finalized

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
