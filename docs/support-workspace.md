# KIDEX Support Workspace

This document describes the current child-scoped support workflow now implemented in KIDEX.

## Purpose

KIDEX is no longer only an assessment and reporting tool. Each child can now carry a **support workspace** that turns recommendations into practical follow-through for:

- caregivers
- coaches and conductors
- short mental-growth practice
- referral follow-up
- evidence-backed reflection

The support workspace is child-centered and sits beside assessments, plans, consent, communication, and reports.

## Current model

The runtime model lives in [lib/support-workspace.ts](/Users/Shared/Projects/kidex/lib/support-workspace.ts).

Each workspace contains:

- `caregiverTools`
  - concise education resources
  - family-support prompts
  - optional pledge / commitment acknowledgements
  - completion status and notes
- `coachTools`
  - role-specific guidance cards
  - just-in-time coaching prompts
  - completion status and notes
- `microLearning`
  - short child-scoped lesson sequences
  - simple completion and reflection tracking
  - lightweight streak calculation
- `referrals`
  - concern type
  - urgency
  - parent-safe explanation
  - resource type, locality, and contact
  - status, follow-up date, and resolution notes
- `evidenceJournal`
  - structured development moments
  - domain tags and skill tags
  - optional attachment references
  - links back to assessment or plan context

## How it is created

If no persisted workspace exists yet, the child history page derives a default workspace from:

- the latest recommendation summary
- the latest assessment
- the current development plan
- child context such as age band and caregiver presence

That default state can then be edited and saved through the support API.

## Current product surfaces

### Child history

[app/[locale]/dashboard/children/[id]/page.tsx](/Users/Shared/Projects/kidex/app/%5Blocale%5D/dashboard/children/%5Bid%5D/page.tsx) is the main operational surface.

It currently supports:

- caregiver education and partnership tracking
- coach guidance tracking
- micro-learning lesson completion and reflections
- referral entry and follow-up updates
- multimedia evidence moment capture

### Record detail

[app/[locale]/dashboard/records/[id]/page.tsx](/Users/Shared/Projects/kidex/app/%5Blocale%5D/dashboard/records/%5Bid%5D/page.tsx) shows a compact support follow-through summary so record review does not lose downstream context.

### Family report

Family-safe reporting now pulls selected support context through:

- [lib/family-report.ts](/Users/Shared/Projects/kidex/lib/family-report.ts)
- [lib/pdf-service.ts](/Users/Shared/Projects/kidex/lib/pdf-service.ts)

Current family-facing additions include:

- open support follow-up notes
- recent evidence moments
- support language that stays non-diagnostic

## Boundaries

The current slice is intentionally bounded:

- it does **not** implement a separate LMS
- it does **not** provide public caregiver self-service editing for the support workspace
- it does **not** turn completion metrics into outcome claims
- it does **not** imply clinical endorsement from referral-directory presence alone

## Audit and governance

Support-workspace saves write `support.upsert` audit events.

The workspace stays inside the existing child permission model:

- read requires child read access
- write requires child write access
- reports still respect consent and export governance

## Related systems

- [docs/access-model.md](./access-model.md)
- [docs/api.md](./api.md)
