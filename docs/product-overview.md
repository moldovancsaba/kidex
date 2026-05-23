# KIDEX Product Overview

## Purpose

KIDEX helps conductors:

1. measure a child consistently
2. interpret current physical, mental, and social state
3. explain that state to parents in safe language
4. recommend realistic next steps
5. reassess and show change over time

The product is not only a survey recorder. It is a measurement, interpretation, reporting, and follow-through system.

## Core product loop

### 1. Child registry and context

Practitioners work from centralized child profiles that include:

- identity and age-band context
- caregiver links
- accessibility profile
- consent policy
- institution ownership and visibility

Primary surface:

- `/{locale}/dashboard/children`

### 2. Assessment workflow

The assessment flow supports:

- rapid and full modes
- per-item observation notes
- explicit scorer confidence
- observer attribution
- physical, mental, and social scoring
- mental wellbeing baseline or follow-up capture
- evidence attachments

Primary surface:

- `/{locale}/dashboard/assessment`

### 3. Interpretation layer

Saved assessments produce:

- domain averages
- SKI score
- standards-version-aware recommendations
- child-state summary
- progress comparison and plan-effectiveness interpretation
- confidence and reliability context
- parent improvement guidance
- next-session conductor focus priorities
- reassessment status and follow-up timing

Primary surfaces:

- `/{locale}/dashboard/records/[id]`
- `/{locale}/dashboard/children/[id]`

### 4. Follow-through layer

Each child can carry operational follow-through data:

- development plan
- reassessment cadence and next-review due date
- governed communication history
- caregiver tools
- coach tools
- micro-learning
- referrals
- evidence journal

Primary surface:

- `/{locale}/dashboard/children/[id]`

### 5. Reporting layer

KIDEX supports two report families:

- professional report / map export
- family-safe report

These reports use the same evidence base but different language and emphasis.

### 6. Governance and operations

The settings and governance stack includes:

- user and institution management
- standards version and variant governance
- communication policy
- audit review
- restore workflows
- governance export bundles
- legal/company profile management
- anonymous culture-survey launch and review

Primary surface:

- `/{locale}/dashboard/settings`

## Current implemented modules

### Assessment and scoring

- weighted scoring model
- benchmark variants by age band and pathway
- standards version manager
- recommendation engine
- scorer confidence context

### Child and family support

- family-linked caregivers
- consent review links
- parent improvement guidance
- reassessment cadence and due-soon / overdue follow-up visibility
- family-safe reporting
- support workspace

### Safety and oversight

- role-based access control
- institution scoping
- media/report/data-sharing consent enforcement
- governed communications
- audit logging
- governance exports

### Analytics

- readiness, benchmark, and longitudinal charts
- progress-comparison summaries
- reassessment queue and follow-up triage
- watchlists and risk indicators
- support follow-through indicators
- anonymous culture-index and role-comparison analytics

## Public versus protected surfaces

Public:

- landing page
- legal pages
- consent review page
- culture-survey response page
- SSO and Google OAuth callback routes

Protected:

- all dashboard routes
- most `/api/*` routes when `KIDEX_ENFORCE_AUTH=true`

## Current role model

Implemented runtime roles:

- `admin`
- `conductor`
- `observer`

See [access-model.md](./access-model.md) and [role-taxonomy.md](./role-taxonomy.md) for the detailed rules.

## What KIDEX is not

KIDEX does not currently implement:

- direct child-facing messaging
- clinical diagnosis
- therapy claims
- public caregiver self-service editing across the full child record
- a standalone LMS or parent-content platform

## Source documents

- Design/UI/UX SSOT: [/Users/Shared/Projects/GENERAL_DESIGN_SYSTEM/README.md](/Users/Shared/Projects/GENERAL_DESIGN_SYSTEM/README.md)
- [API Reference](./api.md)
- [Access Model](./access-model.md)
- [Support Workspace](./support-workspace.md)
- [Design System Adapter](./design-system.md)
- [Deployment](./deployment.md)
