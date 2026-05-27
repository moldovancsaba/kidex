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
- local draft persistence and explicit resume/discard recovery for interrupted assessments
- shell-level child quick switch with recent items, latest-record jumps, and follow-up shortcuts
- dedicated follow-up action center with blocker-aware reassessment triage
- reassessment cadence, next-review due dates, and overdue follow-up visibility
- anonymous culture/trust pulse launches with protected aggregation
- culture-index dashboard analytics across role and scope views

For the fuller current product description, use:

- [README.md](/Users/Shared/Projects/kidex/README.md)
- [docs/product-overview.md](/Users/Shared/Projects/kidex/docs/product-overview.md)
- [docs/api.md](/Users/Shared/Projects/kidex/docs/api.md)
- [docs/design-system.md](/Users/Shared/Projects/kidex/docs/design-system.md)

Design/UI/UX SSOT:

- [sovereignsquad/general-design-system README](https://github.com/sovereignsquad/general-design-system/blob/main/README.md) (aligned version `2.6.1 / 2026-05-26`)

KIDEX local design docs are adapters only. The shared design-system repository above is the authority for design, UI, UX, pattern service, navigation, responsive rules, component contracts, governance, and the Mantine-only product primitive policy. Local status is **direct package adoption with thin adapters** — see [docs/design-system.md](/Users/Shared/Projects/kidex/docs/design-system.md), [docs/gds-compliance-checklist.md](/Users/Shared/Projects/kidex/docs/gds-compliance-checklist.md), [docs/gds-pr-review-checklist.md](/Users/Shared/Projects/kidex/docs/gds-pr-review-checklist.md), and [gds-adoption.json](/Users/Shared/Projects/kidex/gds-adoption.json).

## UI / GDS track

Delivered GDS migration track:

- [#50](https://github.com/moldovancsaba/kidex/issues/50) `Done`
- [#51](https://github.com/moldovancsaba/kidex/issues/51) `Done`
- [#52](https://github.com/moldovancsaba/kidex/issues/52) `Done`
- [#53](https://github.com/moldovancsaba/kidex/issues/53) `Done`
- [#54](https://github.com/moldovancsaba/kidex/issues/54) `Done`
- [#55](https://github.com/moldovancsaba/kidex/issues/55) `Done`
- [#56](https://github.com/moldovancsaba/kidex/issues/56) `Done`
- [#57](https://github.com/moldovancsaba/kidex/issues/57) `Done`
- [#58](https://github.com/moldovancsaba/kidex/issues/58) `Done`
- [#59](https://github.com/moldovancsaba/kidex/issues/59) `Done`
- [#60](https://github.com/moldovancsaba/kidex/issues/60) `Done`

Current GDS runtime facts:

- package line: `@doneisbetter/gds-theme`, `@doneisbetter/gds-core`, `@doneisbetter/gds-admin`
- canonical install source: npm
- verified consumer baseline: Next `15.5.18`, React `19.2.0`, Mantine `8.3.6`
- KIDEX now consumes the published package line directly and keeps only reviewed thin adapters

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

- `#63` dedicated follow-up action center with blocker-aware reassessment triage
- repo compliance wiring remains active through the direct `@doneisbetter/*` GDS package line

Main implementation files for the latest UI slice:

- [app/[locale]/dashboard/follow-up/page.tsx](/Users/Shared/Projects/kidex/app/%5Blocale%5D/dashboard/follow-up/page.tsx)
- [components/layout/DashboardShell.tsx](/Users/Shared/Projects/kidex/components/layout/DashboardShell.tsx)
- [components/dashboard/MainDashboard.tsx](/Users/Shared/Projects/kidex/components/dashboard/MainDashboard.tsx)
- [lib/follow-up-queue.ts](/Users/Shared/Projects/kidex/lib/follow-up-queue.ts)
- [docs/product-overview.md](/Users/Shared/Projects/kidex/docs/product-overview.md)

Verification passed for that slice:

- `npm test`
- `npm run lint`
- `npm run build`
- `npm run typecheck`

## Git State

Latest pushed commit on `origin/main` before the current local work:

- `e06a799` `Add global child quick switch`

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
- `#54` — `Done`
- `#55` — `Done`
- `#61` — `Done`
- `#62` — `Done`
- `#63` — `Done`
- `#64` — `Todo (NEXT)`

## Recommended Next Work

Current next execution order:

1. [#64](https://github.com/moldovancsaba/kidex/issues/64)
2. [#65](https://github.com/moldovancsaba/kidex/issues/65)

For UI work, continue using:

- [docs/design-system.md](/Users/Shared/Projects/kidex/docs/design-system.md) (governed adapter)
- [docs/gds-pr-review-checklist.md](/Users/Shared/Projects/kidex/docs/gds-pr-review-checklist.md)
- [General Design System releases](https://github.com/sovereignsquad/general-design-system/releases)

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
