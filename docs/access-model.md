# KIDEX Access Model

This document defines the current runtime authorization and visibility model implemented in KIDEX.

## Runtime roles

Implemented roles:

- `admin`
- `conductor`
- `observer`

Reserved future roles are documented in [role-taxonomy.md](./role-taxonomy.md) but are not accepted by the runtime today.

## Permission matrix

| Capability | `admin` | `conductor` | `observer` |
| --- | --- | --- | --- |
| Read users, children, assessments, settings | yes | yes | yes |
| Create or update children and assessments | yes | yes, institution-scoped | no |
| Delete or restore children and assessments | yes | yes, institution-scoped | no |
| Create or update development plans | yes | yes, institution-scoped | no |
| Create or update support workspace | yes | yes, institution-scoped | no |
| Create governed communications | yes | yes, institution-scoped | no |
| Upload media | yes | yes, institution-scoped | no |
| Create or update users | yes | yes, institution-scoped and without admin escalation | no |
| Delete users | yes | no | no |
| Send invites | yes | no | no |
| Update global settings and standards | yes | no | no |
| Review audit and governance exports | yes | no | no |

## Institution boundaries

- Every user is normalized to at least one institution membership.
- Bootstrap data defaults to the `default` institution until the admin configures real institutions.
- Non-admin users can only read or mutate resources that overlap with their institution memberships.

## Resource ownership and visibility

Children and assessments currently store or derive:

- `institutionId`
- `createdByUserEmail`
- `practitionerEmails`
- `visibility`

Current visibility behavior:

- default runtime visibility is `institution`
- `restricted` is represented in the model but not yet expanded into a broader end-user workflow

Child-scoped records inherit the child boundary:

- development plans
- communications
- support workspace
- consent links
- report and export actions

## UI route gating

Dashboard navigation is permission-driven and hides sections the user cannot use.

Current protected route expectations:

- `/dashboard/assessment` requires assessment write access
- `/dashboard/children` requires child read access
- `/dashboard/records` requires assessment read access
- `/dashboard/settings` requires settings read access

UI gating is not the security boundary. API routes still enforce authorization server-side.

## Public routes

These routes remain public even when `KIDEX_ENFORCE_AUTH=true`:

- landing page
- legal pages
- SSO auth routes
- Google OAuth invite routes
- public consent-review route and API

## Consent and export governance

Consent is enforced as structured policy rather than only booleans.

Current governed consent domains:

- `mediaCapture`
- `familyReport`
- `dataSharing`
- `publicity`

Current enforcement points:

- media upload requires active media consent
- family PDF export requires active family-report consent
- professional export requires active data-sharing consent
- assessment records snapshot consent state at the time of record creation/update

## Standards and scoring governance

Only admins can mutate standards and formula configuration.

Current standards model supports:

- active version
- multiple versions
- benchmark variants
- age-band thresholds
- formula weights
- publish metadata
- source-version traceability

Standards are normalized server-side before persistence.

## Reliability and interpretation context

Assessment reliability is now represented explicitly in the model.

Per-item scoring can include:

- scorer confidence
- observed-by context
- observation note

Downstream interpretation surfaces now reflect:

- low-confidence item counts
- missing-confidence counts
- reliability cautions in state summaries
- recommendation evidence markers when low-confidence items contributed

## Audit model

Sensitive operations are audit logged, including:

- child and assessment lifecycle changes
- user access changes
- invite sending
- standards and settings changes
- communications
- support workspace saves
- media uploads
- report exports
- governance exports

## Bootstrap rules

If there are no users in the system, the first successful SSO user is bootstrapped as:

- `admin`
- `conductor`

That preserves initial setup ability plus day-to-day practitioner capability.
