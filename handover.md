# KIDEX Handover

This document captures the current working state of the KIDEX product and the immediate follow-up actions that were left pending at the end of the latest implementation pass.

## Current Product State

KIDEX is now a conductor-facing child assessment and development-intelligence platform that supports:

- centralized child profiles with caregiver links, accessibility profile, institution ownership, and consent policy
- rapid and full assessment workflows with scorer confidence, observer attribution, and evidence attachments
- weighted physical, social, and mental scoring with standards-version-aware interpretation
- child-state summaries for conductors and parent-safe explanation
- parent improvement guidance linked to measured support areas
- development plans, caregiver tools, coach guidance, micro-learning, referrals, and evidence journaling
- family-safe and professional PDF reports
- governed communications, audit trail, governance export, and role-based access control
- progress comparison and plan-effectiveness explanation
- next-session focus recommendations for conductors
- reassessment cadence, next-review due dates, and overdue follow-up visibility
- anonymous culture/trust pulse launches with protected aggregation
- culture-index dashboard analytics across role and scope views

For the fuller current product description, use:

- [README.md](/Users/Shared/Projects/kidex/README.md)
- [docs/product-overview.md](/Users/Shared/Projects/kidex/docs/product-overview.md)
- [docs/api.md](/Users/Shared/Projects/kidex/docs/api.md)
- [docs/design-system.md](/Users/Shared/Projects/kidex/docs/design-system.md)

Design/UI/UX SSOT:

- [/Users/Shared/Projects/GENERAL_DESIGN_SYSTEM/README.md](/Users/Shared/Projects/GENERAL_DESIGN_SYSTEM/README.md) (aligned version `2.4.3 / 2026-05-25`)

KIDEX local design docs are adapters only. The shared design-system repository above is the authority for design, UI, UX, pattern service, navigation, responsive rules, component contracts, governance, and the Mantine-only product primitive policy. Local status is **governed** — see [docs/design-system.md](/Users/Shared/Projects/kidex/docs/design-system.md), [docs/gds-compliance-checklist.md](/Users/Shared/Projects/kidex/docs/gds-compliance-checklist.md), and [docs/gds-pr-review-checklist.md](/Users/Shared/Projects/kidex/docs/gds-pr-review-checklist.md).

## UI / GDS track

Delivered local Mantine workflow slices:

- [#50](https://github.com/moldovancsaba/kidex/issues/50) `Done`
- [#51](https://github.com/moldovancsaba/kidex/issues/51) `Done`
- [#52](https://github.com/moldovancsaba/kidex/issues/52) `Done`
- [#53](https://github.com/moldovancsaba/kidex/issues/53) `Done`

Delivered local pre-adoption canonicalization track:

- [#56](https://github.com/moldovancsaba/kidex/issues/56) `Done`
- [#57](https://github.com/moldovancsaba/kidex/issues/57) `Done`
- [#58](https://github.com/moldovancsaba/kidex/issues/58) `Done`
- [#59](https://github.com/moldovancsaba/kidex/issues/59) `Done`
- [#60](https://github.com/moldovancsaba/kidex/issues/60) `Done`

Current open GDS dependency sequence:

- [#54](https://github.com/moldovancsaba/kidex/issues/54) `Roadmap (LATER)` adopt shared GDS packages after Mantine 8 compatibility release
- [#55](https://github.com/moldovancsaba/kidex/issues/55) `Roadmap (LATER)` replace local responsive shell and data-view adapters with shared GDS components

Upstream GDS unblock map:

- Runtime / package line:
  - `general-design-system#98` distribution and install contract
  - `general-design-system#101` App Router server-safe entrypoints
  - `general-design-system#102` canonical bootstrap contract
  - `general-design-system#119` Mantine 8 / React 19 / Next 15 compatibility line
- Shared surfaces needed before `#55` can execute honestly:
  - `general-design-system#121` authenticated AppShell parity
  - `general-design-system#122` PageHeader action-contract parity
  - `general-design-system#123` ResponsiveDataView registry parity
  - `general-design-system#124` FilterDrawer hardening
  - `general-design-system#125` EditorScaffold parity
  - `general-design-system#129` section panel primitive
  - `general-design-system#130` searchable selection contract decision

Latest public GDS note:

- GDS SSOT is now `2.4.3`
- package-consumer guidance is stronger and now includes explicit App Router consumer paths
- direct KIDEX package adoption is still blocked because the public compatibility matrix and package peer dependencies remain on Mantine `^7.9.0`

Delivered locally:

- mobile shell and operational-first dashboard
- child registry mobile filter drawer, active-filter badges, follow-up shortcuts, and local `ResponsiveDataView` / `ProductCard` parity
- survey mobile save/setup bar, clearer selected-child resume context, and local `EditorScaffold` / `FormSection` parity
- child and record detail headers with reassessment, consent, family-report visibility, and unified `PageHeader` action contract
- local `gds-local` compatibility boundary for admin/core contracts
- shared state/metric contracts, theme consolidation, and ESLint token guards

## Current Versions

Current resolved local versions at the time of this handover:

- App version: `0.5.0`
- Node.js: `22.x`
- Next.js: `15.5.15`
- React: `19.2.5`
- TypeScript: `5.9.3`
- MongoDB driver: `6.21.0`
- Mantine Core: `8.3.6`
- Recharts: `3.8.1`
- next-intl: `4.9.2`

## Latest Delivered Slice

The latest completed code delivery on `origin/main` covered:

- `#56` local GDS compatibility layer and contract mirroring
- `#57` authenticated shell and page-header parity
- `#58` registry workflows parity
- `#59` assessment editor scaffold parity
- `#60` shared primitive and exception-surface normalization

Main implementation files for the latest UI slice:

- [components/gds-local/core/index.ts](/Users/Shared/Projects/kidex/components/gds-local/core/index.ts)
- [components/gds-local/admin/index.ts](/Users/Shared/Projects/kidex/components/gds-local/admin/index.ts)
- [components/layout/DashboardShell.tsx](/Users/Shared/Projects/kidex/components/layout/DashboardShell.tsx)
- [components/dashboard/MainDashboard.tsx](/Users/Shared/Projects/kidex/components/dashboard/MainDashboard.tsx)
- [app/[locale]/dashboard/children/page.tsx](/Users/Shared/Projects/kidex/app/%5Blocale%5D/dashboard/children/page.tsx)
- [app/[locale]/dashboard/children/[id]/page.tsx](/Users/Shared/Projects/kidex/app/%5Blocale%5D/dashboard/children/%5Bid%5D/page.tsx)
- [app/[locale]/dashboard/records/[id]/page.tsx](/Users/Shared/Projects/kidex/app/%5Blocale%5D/dashboard/records/%5Bid%5D/page.tsx)
- [app/[locale]/dashboard/records/page.tsx](/Users/Shared/Projects/kidex/app/%5Blocale%5D/dashboard/records/page.tsx)
- [components/forms/KidexAssessmentApp.tsx](/Users/Shared/Projects/kidex/components/forms/KidexAssessmentApp.tsx)
- [docs/design-system.md](/Users/Shared/Projects/kidex/docs/design-system.md)
- [docs/gds-compliance-checklist.md](/Users/Shared/Projects/kidex/docs/gds-compliance-checklist.md)

Verification passed for that slice:

- `npm test`
- `npm run lint`
- `npm run build`
- `npm run typecheck`

## Git State

Latest pushed commit on `origin/main` before the current local work:

- `536c3a5` `Align KIDEX to GDS 2.4.3`

Branch state:

- local branch: `main`
- remote target: `origin/main`

## GitHub Board State

- `#1` — `In Progress (NOW)`
- `#50` — `Done`
- `#51` — `Done`
- `#52` — `Done`
- `#53` — `Done`
- `#56` — `Done` after current sync
- `#57` — `Done` after current sync
- `#58` — `Done` after current sync
- `#59` — `Done` after current sync
- `#60` — `Done` after current sync
- `#54` — `Roadmap (LATER)`
- `#55` — `Roadmap (LATER)`

## Recommended Next Work

Current next execution order:

1. [#54](https://github.com/moldovancsaba/kidex/issues/54)
2. [#55](https://github.com/moldovancsaba/kidex/issues/55)

Practical dependency interpretation:

1. Wait for upstream runtime/package unblock: `#98`, `#101`, `#102`, `#119`
2. Move to shared surface adoption only when upstream parity issues are released: `#121`, `#122`, `#123`, `#124`, `#125`, `#129`, `#130`

For UI work, continue using:

- [docs/design-system.md](/Users/Shared/Projects/kidex/docs/design-system.md) (governed adapter)
- [docs/gds-pr-review-checklist.md](/Users/Shared/Projects/kidex/docs/gds-pr-review-checklist.md)
- [/Users/Shared/Projects/GENERAL_DESIGN_SYSTEM/PROJECTS/PORTFOLIO_ADOPTION_MATRIX.md](/Users/Shared/Projects/GENERAL_DESIGN_SYSTEM/PROJECTS/PORTFOLIO_ADOPTION_MATRIX.md)

## Environment Notes

Core runtime variables:

- `MONGODB_URI`
- `MONGODB_DB`
- `IMGBB_API_KEY`
- `AUTH_SECRET`
- `KIDEX_ENFORCE_AUTH`

Platform SSO:

- `SSO_CLIENT_ID`
- `SSO_CLIENT_SECRET`
- `SSO_BASE_URL`
- `SSO_REDIRECT_URI`

Optional Gmail invite delivery:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`
