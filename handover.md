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

- [/Users/Shared/Projects/GENERAL_DESIGN_SYSTEM/README.md](/Users/Shared/Projects/GENERAL_DESIGN_SYSTEM/README.md) (aligned version `2.2.0 / 2026-05-23`)

KIDEX local design docs are adapters only. The shared design-system repository above is the authority for design, UI, UX, pattern service, navigation, responsive rules, component contracts, governance, and the Mantine-only product primitive policy. Local status is **governed** — see [docs/design-system.md](/Users/Shared/Projects/kidex/docs/design-system.md), [docs/gds-compliance-checklist.md](/Users/Shared/Projects/kidex/docs/gds-compliance-checklist.md), and [docs/gds-pr-review-checklist.md](/Users/Shared/Projects/kidex/docs/gds-pr-review-checklist.md).

## UI / GDS track (closed)

- [#50](https://github.com/moldovancsaba/kidex/issues/50) `KIDEX Platform P1: Mantine-only mobile shell and responsive conductor workflow refactor` — **closed** (GDS 2.2.0 governed on `main`, commit `5a73d51`)

Delivered: mobile shell, operational-first dashboard, child registry cards, detail `DetailActionBar`, survey resume UX, shared state/metric contracts, theme consolidation, ESLint token guards.

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

- `#50` GDS 2.2.0 governance and Mantine conductor UX refactor (closed)
- Prior: `#48` reassessment cadence, `#49` reassessment queue

Main implementation files for `#50`:

- [components/layout/DashboardShell.tsx](/Users/Shared/Projects/kidex/components/layout/DashboardShell.tsx)
- [components/ui/DetailActionBar.tsx](/Users/Shared/Projects/kidex/components/ui/DetailActionBar.tsx)
- [components/ui/MetricCard.tsx](/Users/Shared/Projects/kidex/components/ui/MetricCard.tsx)
- [components/ui/LoadingState.tsx](/Users/Shared/Projects/kidex/components/ui/LoadingState.tsx)
- [components/dashboard/MainDashboard.tsx](/Users/Shared/Projects/kidex/components/dashboard/MainDashboard.tsx)
- [app/[locale]/dashboard/children/page.tsx](/Users/Shared/Projects/kidex/app/%5Blocale%5D/dashboard/children/page.tsx)
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

- `5a73d51` `Complete GDS governance: detail headers, survey UX, and governed status`

Branch state:

- local branch: `main`
- remote target: `origin/main`

## GitHub Board State

- `#50` — closed (GDS / conductor UX)
- `#1` — check project `9` for current `In Progress (NOW)` item

Roadmap issues through `#50` on the Mantine/GDS track are complete.

## Recommended Next Work

Pick the next open product issue from the GitHub board (project `9`). For UI work, continue using:

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
