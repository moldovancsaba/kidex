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

Current open GDS dependency sequence:

- [#54](https://github.com/moldovancsaba/kidex/issues/54) `Todo (NEXT)` adopt shared GDS packages after Mantine 8 compatibility release
- [#55](https://github.com/moldovancsaba/kidex/issues/55) `Backlog (SOONER)` replace local responsive shell and data-view adapters with shared GDS components

Latest public GDS note:

- GDS SSOT is now `2.4.3`
- package-consumer guidance is stronger and now includes explicit App Router consumer paths
- direct KIDEX package adoption is still blocked because the public compatibility matrix and package peer dependencies remain on Mantine `^7.9.0`

Delivered locally:

- mobile shell and operational-first dashboard
- child registry mobile filter drawer, active-filter badges, and follow-up shortcuts
- survey mobile save/setup bar and clearer selected-child resume context
- child and record detail headers with reassessment, consent, and family-report visibility
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

- `#51` child registry mobile filter drawer and triage controls
- `#52` survey mobile save bar and faster resume context
- `#53` child and record detail header normalization for mobile follow-up context

Main implementation files for the latest UI slice:

- [components/layout/DashboardShell.tsx](/Users/Shared/Projects/kidex/components/layout/DashboardShell.tsx)
- [components/ui/DetailActionBar.tsx](/Users/Shared/Projects/kidex/components/ui/DetailActionBar.tsx)
- [components/ui/MetricCard.tsx](/Users/Shared/Projects/kidex/components/ui/MetricCard.tsx)
- [components/ui/LoadingState.tsx](/Users/Shared/Projects/kidex/components/ui/LoadingState.tsx)
- [components/dashboard/MainDashboard.tsx](/Users/Shared/Projects/kidex/components/dashboard/MainDashboard.tsx)
- [app/[locale]/dashboard/children/page.tsx](/Users/Shared/Projects/kidex/app/%5Blocale%5D/dashboard/children/page.tsx)
- [app/[locale]/dashboard/children/[id]/page.tsx](/Users/Shared/Projects/kidex/app/%5Blocale%5D/dashboard/children/%5Bid%5D/page.tsx)
- [app/[locale]/dashboard/records/[id]/page.tsx](/Users/Shared/Projects/kidex/app/%5Blocale%5D/dashboard/records/%5Bid%5D/page.tsx)
- [components/forms/KidexAssessmentApp.tsx](/Users/Shared/Projects/kidex/components/forms/KidexAssessmentApp.tsx)
- [docs/design-system.md](/Users/Shared/Projects/kidex/docs/design-system.md)
- [docs/gds-compliance-checklist.md](/Users/Shared/Projects/kidex/docs/gds-compliance-checklist.md)

Verification passed for that slice:

- `npm test`
- `npm run lint`
- `npm run build`
- `npm run typecheck`

## Git State

Latest pushed commit on `origin/main`:

- `7a86ab2` `Improve mobile conductor workflow surfaces`

Branch state:

- local branch: `main`
- remote target: `origin/main`

## GitHub Board State

- `#1` — `In Progress (NOW)`
- `#50` — `Done`
- `#51` — `Done`
- `#52` — `Done`
- `#53` — `Done`
- `#54` — `Todo (NEXT)`
- `#55` — `Backlog (SOONER)`

## Recommended Next Work

Current next execution order:

1. [#54](https://github.com/moldovancsaba/kidex/issues/54)
2. [#55](https://github.com/moldovancsaba/kidex/issues/55)

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
