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
- mobile filter-drawer triage, active-filter badges, and quick follow-up shortcuts
- shell-level quick switch for jumping to child detail, latest record, or follow-up context
- dedicated follow-up action center for reassessment triage and blocked-item review

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
- mobile sticky save/setup actions
- clearer selected-child resume context
- queued assessment sync recovery when final save cannot reach the server

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
- detail-page header status for follow-up, consent risk, and family-report availability

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
- queue-based reassessment action center for overdue, due-soon, missing-date, and blocked follow-up work
- weak-network-safe plan and follow-up-note buffering with retry/discard recovery

Primary surface:

- `/{locale}/dashboard/children/[id]`
- `/{locale}/dashboard/follow-up`

### 5. Reporting layer

KIDEX supports two report families:

- professional report / map export
- family-safe report

These reports use the same evidence base but different language and emphasis.
They now also expose explicit delivery state:

- blocked when consent or scope prevents export
- queued and generating while the export is in progress
- success after delivery completes
- retryable or terminal failure when export generation fails

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

### 7. Weak-network protection

KIDEX now fails soft under unstable connectivity for selected write-critical workflows.

- assessment submission stays recoverable through local draft persistence plus queued submission retry
- development plan saves can remain pending locally until the server is reachable again
- governed follow-up notes can queue locally and retry automatically
- the authenticated shell exposes a pending-sync banner with retry visibility
- conflict and retryable failure states are explicit instead of silently dropping work

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
- export lifecycle notices with retry and block-state explanation
- support workspace
- mobile-first child and record detail orientation

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

## Assessment draft safety

The assessment workflow now protects interrupted survey work with local draft persistence.

- Drafts autosave locally after meaningful changes.
- Resume/discard decisions are explicit when a recoverable draft exists.
- Drafts are version-guarded and stale drafts are flagged before reuse.
- Final assessment save clears the matching local draft so draft state is not confused with submitted data.

## Global child quick switch

The authenticated shell now provides a global child search and quick-switch flow.

- It uses the existing permission-safe child registry metrics feed.
- Results are ranked by child identity match, recency, and follow-up urgency.
- Conductors can jump directly to child detail, latest record, follow-up context, or a new survey for the selected child.
- Recent child shortcuts are stored locally in the browser for faster repeat navigation.

## Source documents

- Design/UI/UX SSOT: [sovereignsquad/general-design-system README](https://github.com/sovereignsquad/general-design-system/blob/main/README.md)
- [API Reference](./api.md)
- [Access Model](./access-model.md)
- [Support Workspace](./support-workspace.md)
- [Design System Adapter](./design-system.md)
- [Deployment](./deployment.md)
