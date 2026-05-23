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

KIDEX local design docs are adapters only. The shared design-system repository above is the authority for design, UI, UX, pattern service, navigation, responsive rules, component contracts, governance, and the Mantine-only product primitive policy. See [docs/design-system.md](/Users/Shared/Projects/kidex/docs/design-system.md) for the pattern contract inventory and migration backlog, and [docs/gds-compliance-checklist.md](/Users/Shared/Projects/kidex/docs/gds-compliance-checklist.md) for the migrating → governed checklist tied to [#50](https://github.com/moldovancsaba/kidex/issues/50).

## Current UI Refactor Track

The next active implementation issue is:

- [#50](https://github.com/moldovancsaba/kidex/issues/50) `KIDEX Platform P1: Mantine-only mobile shell and responsive conductor workflow refactor`

That issue is already on project `9` in `Todo (NEXT)` and is the active roadmap slice for the upcoming conductor-usability refactor.

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

- `#48` reassessment cadence and follow-up visibility
- `#49` reassessment queue and follow-up triage

Main implementation files:

- [lib/reassessment.ts](/Users/Shared/Projects/kidex/lib/reassessment.ts)
- [lib/development-plans.ts](/Users/Shared/Projects/kidex/lib/development-plans.ts)
- [repositories/development-plan.repository.ts](/Users/Shared/Projects/kidex/repositories/development-plan.repository.ts)
- [repositories/child.repository.ts](/Users/Shared/Projects/kidex/repositories/child.repository.ts)
- [app/api/children/[id]/plan/route.ts](/Users/Shared/Projects/kidex/app/api/children/%5Bid%5D/plan/route.ts)
- [app/[locale]/dashboard/children/[id]/page.tsx](/Users/Shared/Projects/kidex/app/%5Blocale%5D/dashboard/children/%5Bid%5D/page.tsx)
- [app/[locale]/dashboard/children/page.tsx](/Users/Shared/Projects/kidex/app/%5Blocale%5D/dashboard/children/page.tsx)
- [app/[locale]/dashboard/records/[id]/page.tsx](/Users/Shared/Projects/kidex/app/%5Blocale%5D/dashboard/records/%5Bid%5D/page.tsx)
- [components/dashboard/MainDashboard.tsx](/Users/Shared/Projects/kidex/components/dashboard/MainDashboard.tsx)
- [lib/family-report.ts](/Users/Shared/Projects/kidex/lib/family-report.ts)
- [lib/pdf-service.ts](/Users/Shared/Projects/kidex/lib/pdf-service.ts)

Verification passed for that slice:

- `npm test`
- `npm run lint`
- `npm run build`
- `npm run typecheck`

## Git State

Latest pushed commit on `origin/main`:

- `7d5f4f1` `Add reassessment follow-up workflow`

Local working tree currently contains shared design-system SSOT updates, KIDEX adapter documentation updates, and roadmap synchronization for the Mantine-only refactor track. These changes have not yet been committed or pushed.

Branch state at handover:

- local branch: `main`
- remote target: `origin/main`

## GitHub Board State

The project board and issue tracker are now aligned:

- `#1` -> `In Progress (NOW)`
- `#50` -> `Todo (NEXT)`

All earlier roadmap and ideabank child issues through `#49` show `Done` on project `9`.

## Recommended Next Work

The next active implementation target is:

- [#50](https://github.com/moldovancsaba/kidex/issues/50) Mantine-only mobile shell and responsive conductor workflow refactor

Execution should follow:

- [docs/design-system.md](/Users/Shared/Projects/kidex/docs/design-system.md) (local adapter, pattern inventory, backlog)
- [/Users/Shared/Projects/GENERAL_DESIGN_SYSTEM/PROJECTS/KIDEX_MANTINE_REFACTOR.md](/Users/Shared/Projects/GENERAL_DESIGN_SYSTEM/PROJECTS/KIDEX_MANTINE_REFACTOR.md)
- [/Users/Shared/Projects/GENERAL_DESIGN_SYSTEM/PATTERN_SERVICE_MODEL.md](/Users/Shared/Projects/GENERAL_DESIGN_SYSTEM/PATTERN_SERVICE_MODEL.md) (KIDEX section)

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
