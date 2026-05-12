# KIDEX Access Model

This document defines the current runtime authorization model after the first RBAC implementation pass.

## Permission matrix

| Action group | `admin` | `conductor` | `observer` |
| --- | --- | --- | --- |
| Read users, children, assessments, settings | yes | yes | yes |
| Create or update users | yes | yes, institution-scoped | no |
| Delete users | yes | no | no |
| Create or update children and assessments | yes | yes, institution-scoped | no |
| Delete or restore children and assessments | yes | yes, institution-scoped | no |
| Upload media | yes | yes | no |
| Create or update plans, communications, and support workspace | yes | yes, institution-scoped | no |
| Update global settings and scoring standards | yes | no | no |
| Send invites | yes | no | no |

## Institution boundaries

- Every user is normalized into at least one institution membership.
- Existing and bootstrap data default to the `default` institution until richer institution setup is introduced.
- Non-admin users can only view or mutate users, children, and assessments that belong to at least one of their institutions.

## Resource ownership

- Children and assessments now store:
  - `institutionId`
  - `createdByUserEmail`
  - `practitionerEmails`
  - `visibility`
- Child-scoped plans, communications, consent links, and support workspace records inherit the same child access boundary instead of defining parallel ownership rules.
- The current runtime defaults visibility to `institution`.
- The model is ready for later introduction of `restricted` visibility without changing the route contract again.

## Standards governance

- Standards settings are normalized server-side before persistence.
- The active version must resolve to a real version.
- Benchmark thresholds are clamped into valid numeric ranges and `min` cannot exceed `target`.
- Version metadata now supports `createdBy`, `createdAt`, `publishedBy`, `publishedAt`, `status`, `notes`, and `sourceVersion`.

## UI visibility and route gating

- Dashboard navigation is permission-driven and only shows sections the current role can actually reach.
- Direct dashboard route access is gated client-side against the canonical permission model:
  - `/dashboard/assessment` requires `assessments.write`
  - `/dashboard/records` requires `assessments.read`
  - `/dashboard/children` requires `children.read`
  - `/dashboard/settings` requires `settings.read`
- The UI gate is not the security boundary. API routes still enforce the real permission checks server-side.
- Read-only roles can still view records, children, and settings where permitted, but edit, delete, restore, invite, upload, and standards-management actions remain hidden or disabled unless their permission allows them.
- The child history surface now contains additional operational sections for:
  - development plans
  - governed communications
  - support workspace
  These still respect the same child read/write permission boundary rather than introducing separate role rules.

## Support workspace and wellbeing workflows

- Assessments now include a structured `mentalWellbeing` block used for:
  - baseline vs follow-up mental-skills comparisons
  - mood / stress / readiness check-ins
  - sleep / fatigue / soreness recovery interpretation
  - concern-signal escalation prompts
- The child support workspace adds:
  - caregiver education and pledge tracking
  - coach guidance tracking
  - micro-learning reflections
  - referral workflow entries
  - evidence-journal entries
- These workflows inherit child access rules:
  - readers can inspect the data when they can read the child
  - only writers can mutate the data

## Audit and governance

- Sensitive mutations are written to the persistent audit log, including:
  - child create, update, delete, and restore
  - assessment create, update, delete, and restore
  - user access changes and deletions
  - invite sends
  - settings updates
  - evidence media uploads
  - PDF report exports
  - support workspace saves
- Media upload is governed server-side:
  - the upload route checks stored child or assessment photo consent when a target record is provided
  - otherwise it requires explicit consent assertion from the current assessment workflow
- Audit review is exposed in dashboard settings for admin users only.
