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

For the fuller current product description, use:

- [README.md](/Users/Shared/Projects/kidex/README.md)
- [docs/product-overview.md](/Users/Shared/Projects/kidex/docs/product-overview.md)
- [docs/api.md](/Users/Shared/Projects/kidex/docs/api.md)

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

The latest completed feature delivery covered:

- `#46` progress comparison and plan-effectiveness explanation
- `#47` next-session focus recommendations for conductors

Main implementation files:

- [lib/progress-comparison.ts](/Users/Shared/Projects/kidex/lib/progress-comparison.ts)
- [lib/session-focus.ts](/Users/Shared/Projects/kidex/lib/session-focus.ts)
- [app/[locale]/dashboard/children/[id]/page.tsx](/Users/Shared/Projects/kidex/app/%5Blocale%5D/dashboard/children/%5Bid%5D/page.tsx)
- [app/[locale]/dashboard/records/[id]/page.tsx](/Users/Shared/Projects/kidex/app/%5Blocale%5D/dashboard/records/%5Bid%5D/page.tsx)
- [lib/family-report.ts](/Users/Shared/Projects/kidex/lib/family-report.ts)
- [lib/pdf-service.ts](/Users/Shared/Projects/kidex/lib/pdf-service.ts)

Verification passed for that slice:

- `npm test`
- `npm run lint`
- `npm run build`
- `npm run typecheck`

## Git State

Latest pushed commit for the delivered `#46` and `#47` work:

- `daa626b` `Add progress comparison and session focus guidance`

Branch state at handover:

- local branch: `main`
- remote target: `origin/main`

## Deferred GitHub Board Sync

### What is already updated

The GitHub issue bodies and issue open/closed state were updated successfully through the REST API:

- [#1](https://github.com/moldovancsaba/kidex/issues/1) epic body updated
- [#46](https://github.com/moldovancsaba/kidex/issues/46) updated and closed
- [#47](https://github.com/moldovancsaba/kidex/issues/47) updated and closed

### What is still pending

The GitHub Project board cards could not be moved because `gh project ...` depends on GitHub GraphQL, and GraphQL rate limiting blocked the mutation path.

Cards that still need board-column verification and likely update:

- `#46` should be `Done`
- `#47` should be `Done`
- `#1` should remain `In Progress (NOW)`
- `#25` should remain `IDEABANK (SOMEDAY)`
- `#26` should remain `IDEABANK (SOMEDAY)`

### Blocking error seen

`gh project ...` returned:

```text
GraphQL: API rate limit already exceeded for user ID 2206999.
```

### Commands to run later

Once the GraphQL limit clears, use these commands from `/Users/Shared/Projects/kidex`:

```bash
gh project item-list 9 --owner @me --limit 200 --format json | jq '.items[] | select(.content.number==1 or .content.number==25 or .content.number==26 or .content.number==46 or .content.number==47) | {number:.content.number,id:.id,status:.status}'
```

If `#46` is not already `Done`:

```bash
gh project item-edit --id PVTI_lAHOACGtF84BV9kyzgskFNI --project-id PVT_kwHOACGtF84BV9ky --field-id PVTSSF_lAHOACGtF84BV9kyzhRVec4 --single-select-option-id 98236657
```

If `#47` is not already `Done`:

```bash
gh project item-edit --id PVTI_lAHOACGtF84BV9kyzgskFQ0 --project-id PVT_kwHOACGtF84BV9ky --field-id PVTSSF_lAHOACGtF84BV9kyzhRVec4 --single-select-option-id 98236657
```

Status option ids currently in use for project `9`:

- `IDEABANK (SOMEDAY)` -> `db5fbc3d`
- `Roadmap (LATER)` -> `71315ce8`
- `Backlog (SOONER)` -> `737735f8`
- `Todo (NEXT)` -> `f75ad846`
- `In Progress (NOW)` -> `47fc9ee4`
- `Review (ALMOST)` -> `d79759d3`
- `Done` -> `98236657`
- `Declined (NEVER)` -> `7557ebc9`

### Desired board state after sync

The intended live next-board state is:

- `#1` -> `In Progress (NOW)`
- `#46` -> `Done`
- `#47` -> `Done`
- `#25` -> `IDEABANK (SOMEDAY)`
- `#26` -> `IDEABANK (SOMEDAY)`

After that sync, the remaining open board work is ideabank only unless new conductor-parent issues are created.

## Recommended Next Work

Once the board sync is complete, the next product decision is not another hidden implementation task inside the current codebase. The next real decision is roadmap direction:

- either continue with the remaining ideabank items `#25` and `#26`
- or create a new conductor-parent execution sequence above them if the product goal remains direct child measurement and parent guidance

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
