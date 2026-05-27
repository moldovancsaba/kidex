# KIDEX

KIDEX is a conductor-facing child assessment and development-intelligence platform. It helps practitioners measure a child’s current physical, mental, and social state, explain that state to families in safe language, and turn the result into practical follow-through.

## Current product scope

KIDEX currently includes:

- rapid and full assessment workflows
- centralized child profiles with longitudinal assessment history
- weighted bio-psycho-social scoring with SKI calculation
- benchmarked recommendations and standards-version-aware interpretation
- child-state summaries for conductors and parent-facing communication
- parent improvement guidance linked to measured support areas
- progress comparison and plan-effectiveness explanation
- next-session conductor focus priorities
- reassessment cadence, due dates, and overdue follow-up visibility
- reassessment queue and child-registry follow-up filters
- mobile child-registry filter drawer and follow-up triage shortcuts
- mobile survey save bar and faster resume context
- assessment draft persistence and explicit resume/discard recovery
- shell-level child quick switch with recent items, latest-record jumps, and follow-up shortcuts
- dedicated follow-up action center with blocker-aware reassessment triage
- explicit export/report lifecycle states with retry, terminal-failure, and consent-block guidance across PDF and governance exports
- detail-page reassessment and consent status headers
- development plans, caregiver tools, coach guidance, and micro-learning
- family-safe and professional PDF reports
- export status notices for professional reports, family reports, and governance bundles
- consent governance for media, family reports, and data sharing
- family-linked caregivers and public consent-review links
- governed communication logs with caregiver visibility controls
- audit trail and governance export center
- institution-aware access control with `admin`, `conductor`, and `observer` roles
- dashboard analytics, watchlists, readiness trends, and support follow-through indicators
- anonymous culture and trust pulse launches with aggregated culture-index reporting
- multilingual UI in English, Hungarian, and Arabic

## Main routes

- `/{locale}`: public landing page
- `/{locale}/dashboard`: analytics dashboard
- `/{locale}/dashboard/assessment`: assessment workflow
- `/{locale}/dashboard/follow-up`: reassessment and follow-up action center
- `/{locale}/dashboard/children`: child registry
- `/{locale}/dashboard/records`: assessment registry
- `/{locale}/dashboard/settings`: settings, governance, standards, users, and restore workflows
- `/{locale}/consent/[token]`: public caregiver consent-review page
- `/{locale}/voice/[token]`: public anonymous culture-survey page
- `/{locale}/legal/gtc`
- `/{locale}/legal/privacy`

## Documentation

- [Product Overview](docs/product-overview.md)
- [API Reference](docs/api.md)
- [Access Model](docs/access-model.md)
- [Support Workspace](docs/support-workspace.md)
- [Design System Adapter](docs/design-system.md)
- [GDS Compliance Checklist](docs/gds-compliance-checklist.md)
- [GDS PR Review Checklist](docs/gds-pr-review-checklist.md)
- [Deployment](docs/deployment.md)
- [Role Taxonomy](docs/role-taxonomy.md)
- [Definition of Done](docs/dod.md)
- [Legal and Company Info](docs/legal.md)

Design/UI/UX SSOT:

- [General Design System README](https://github.com/sovereignsquad/general-design-system/blob/main/README.md) (current KIDEX alignment `2.6.1 / 2026-05-26`)

KIDEX-specific design documentation is an adapter only ([docs/design-system.md](docs/design-system.md)). The shared SSOT above is the authority for foundation rules, component and pattern contracts, pattern service, navigation, responsive behavior, governance, portfolio operations, and the Mantine-only product primitive policy.

## Runtime and package versions

Current resolved local versions:

- App version: `0.5.0`
- Node.js: `22.x`
- Next.js: `15.5.15`
- React: `19.2.5`
- React DOM: `19.2.5`
- TypeScript: `5.9.3`
- MongoDB driver: `6.21.0`
- Mantine Core: `8.3.6`
- Recharts: `3.8.1`
- next-intl: `4.9.2`

Use:

- `package.json` for declared dependency ranges
- `package-lock.json` or `npm ls --depth=0` for resolved installed versions
- `lib/app-version.ts` for the displayed app version

## Local development

```bash
cp .env.example .env.local
npm install
npm run db:setup
npm run dev
```

Recommended verification before merge:

```bash
npm test
npm run lint
npm run build
npm run typecheck
```

## Environment variables

Core runtime:

```txt
MONGODB_URI=
MONGODB_DB=kidex
IMGBB_API_KEY=
AUTH_SECRET=
KIDEX_ENFORCE_AUTH=true
```

Platform SSO login:

```txt
SSO_CLIENT_ID=
SSO_CLIENT_SECRET=
SSO_BASE_URL=https://sso.doneisbetter.com
SSO_REDIRECT_URI=https://your-domain.com/api/oauth/callback
```

Optional Gmail invite delivery:

```txt
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=https://your-domain.com/api/auth/google/callback
```

## Authentication model

KIDEX has two separate auth integrations:

- platform login uses the SSO flow under `/api/auth/login` and `/api/oauth/callback`
- Gmail invite sending uses the Google OAuth flow under `/api/auth/google/login` and `/api/auth/google/callback`

If `KIDEX_ENFORCE_AUTH=false`, route protection is bypassed for local or bootstrap scenarios. If it is `true`, dashboard pages and protected API routes require a valid session.

## Delivery and governance notes

- Images are uploaded server-side through `/api/uploads/imgbb`; only attachment metadata is stored in MongoDB.
- Assessments persist standards version and benchmark variant identifiers for reproducible historical interpretation.
- Consent state is enforced across uploads and report exports.
- Sensitive mutations and exports are written to the persistent audit log.
- Invite delivery can run in Gmail mode or mock mode depending on whether an admin has linked Google access.
