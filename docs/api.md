# KIDEX API Reference

Base path: Next.js App Router endpoints under `/api/*`.

This document is intentionally high-signal. It describes the current route surface, auth expectations, and operational behavior without duplicating every implementation detail.

## Authentication and request model

KIDEX supports two auth systems:

- platform SSO login:
  - `/api/auth/login`
  - `/api/oauth/callback`
- Gmail invite authorization:
  - `/api/auth/google/login`
  - `/api/auth/google/callback`

When `KIDEX_ENFORCE_AUTH=true`:

- protected dashboard pages require a valid `kidex_session` cookie
- protected API routes require the same session
- middleware forwards session role data through request headers for server-side authorization

When `KIDEX_ENFORCE_AUTH=false`, auth enforcement is bypassed for local/bootstrap operation.

Current runtime roles:

- `admin`
- `conductor`
- `observer`

See [access-model.md](./access-model.md) and [role-taxonomy.md](./role-taxonomy.md).

## Response conventions

Typical error response:

```json
{
  "error": "message",
  "code": "VALIDATION_ERROR"
}
```

Common error codes:

- `VALIDATION_ERROR`
- `AUTH_REQUIRED`
- `FORBIDDEN`
- `NOT_FOUND`
- `UNKNOWN_ERROR`

Validation is centralized in [`lib/validations.ts`](../lib/validations.ts).

## Route inventory

### Health

- `GET /api/health`
  - Returns basic service diagnostics.

### Platform auth

- `GET /api/auth/login`
  - Starts the platform SSO login flow.
- `GET /api/oauth/callback`
  - Completes the platform SSO flow, resolves or bootstraps the local user, and creates a session.
- `POST /api/auth/logout`
  - Clears the current session.
- `GET /api/auth/me`
  - Returns the current session user plus effective role/access context.

### Google / Gmail auth

- `GET /api/auth/google/login`
  - Starts Google OAuth for Gmail invite sending.
- `GET /api/auth/google/callback`
  - Stores Google tokens for the signed-in local user.

### Assessments

- `GET /api/assessments`
  - Lists visible assessments.
  - Roles: `admin`, `conductor`, `observer`
- `POST /api/assessments`
  - Creates an assessment and syncs child identity/context.
  - Roles: `admin`, `conductor`
- `GET /api/assessments/:id`
  - Returns one assessment record.
  - Roles: `admin`, `conductor`, `observer`
- `PATCH /api/assessments/:id`
  - Updates an assessment, keeps change history, and resyncs linked child context where applicable.
  - Roles: `admin`, `conductor`
- `DELETE /api/assessments/:id`
  - Soft-deletes an assessment.
  - Roles: `admin`, `conductor`
- `POST /api/assessments/:id`
  - Restores a deleted assessment.
  - Roles: `admin`, `conductor`

### Children

- `GET /api/children`
  - Lists visible child profiles.
  - `?metrics=true` returns child registry metrics that also power the shell quick-switch workflow.
  - Can backfill from historical assessments if needed.
  - Roles: `admin`, `conductor`, `observer`
- `POST /api/children`
  - Creates a child profile.
  - Roles: `admin`, `conductor`
- `GET /api/children/:id`
  - Returns one child profile.
  - Roles: `admin`, `conductor`, `observer`
- `PATCH /api/children/:id`
  - Updates child profile fields, consent, caregivers, accessibility profile, and related identity context.
  - Roles: `admin`, `conductor`
- `DELETE /api/children/:id`
  - Soft-deletes a child record.
  - Roles: `admin`, `conductor`
- `POST /api/children/:id/restore`
  - Restores a deleted child record.
  - Roles: `admin`, `conductor`
- `GET /api/children/:id/history`
  - Returns the child plus linked chronological assessment history.
  - Roles: `admin`, `conductor`, `observer`

### Child plans, support, communications, consent review

- `GET /api/children/:id/plan`
  - Returns the child’s latest development plan, including reassessment cadence and next due date when available.
  - Roles: `admin`, `conductor`, `observer`
- `POST /api/children/:id/plan`
  - Creates or updates the development plan, including `reviewCadenceDays`, `nextAssessmentDueDate`, and `reassessmentNotes`.
  - Roles: `admin`, `conductor`

- `GET /api/children/:id/support`
  - Returns the child support workspace.
  - Roles: `admin`, `conductor`, `observer`
- `POST /api/children/:id/support`
  - Creates or updates caregiver tools, coach tools, micro-learning, referrals, and evidence journal data.
  - Roles: `admin`, `conductor`

- `GET /api/children/:id/communications`
  - Returns governed communication history for the child.
  - Roles: `admin`, `conductor`, `observer`
- `POST /api/children/:id/communications`
  - Creates a governed communication entry.
  - Roles: `admin`, `conductor`

- `POST /api/children/:id/consent-link`
  - Generates a caregiver-specific public consent-review link.
  - Roles: `admin`, `conductor`
- `GET /api/consent-review`
  - Public token-driven consent review read path.
- `POST /api/consent-review`
  - Public token-driven consent review update path.

### Users and invites

- `GET /api/users`
  - Returns visible user data with runtime roles and institution scope.
  - Roles: `admin`, `conductor`, `observer`
- `POST /api/users`
  - Upserts users.
  - Non-admin writes remain institution-scoped.
  - Reserved roles are rejected.
  - Roles: `admin`, `conductor`

- `POST /api/invite`
  - Sends or mock-sends a localized invite email.
  - Uses stored Gmail tokens when available; otherwise falls back to mock delivery.
  - Roles: `admin`

### Settings and standards governance

- `GET /api/settings`
  - Returns the global settings document.
  - Includes:
    - conductors
    - observers
    - locations
    - institutions
    - company profile
    - email templates
    - communication policy
    - standards configuration
  - Roles: `admin`, `conductor`, `observer`

- `POST /api/settings`
  - Persists settings and standards governance changes.
  - Roles: `admin`

### Audit and governance export

- `GET /api/audit`
  - Returns recent audit events.
  - Roles: `admin`
- `POST /api/audit`
  - Writes client-side export telemetry events such as PDF and governance/data export results.
  - Supports:
    - `kind: "pdf" | "data"`
    - PDF audience and consent-block outcomes
    - governance export `scope` such as `governance`, `children`, `assessments`, or `audit`
  - Roles: any authenticated user with read access to the exported record

- `GET /api/governance/export`
  - Returns auditable JSON export bundles for governance review.
  - Roles: `admin`

### Uploads

- `POST /api/uploads/imgbb`
  - Uploads media server-side to ImgBB.
  - Enforces active media consent when child or assessment context is present.
  - Roles: `admin`, `conductor`

## Assessment payload highlights

Assessments currently include:

- child identity snapshot
- session metadata
- `scores` with:
  - `score`
  - `note`
  - `observer`
  - `confidence`
- `mentalWellbeing`
  - phase
  - child / observer / caregiver perspective ratings
  - mood / stress / readiness / sleep / fatigue / soreness check-ins
  - guided modules
  - concern signals
- attachment metadata
- `quality`
  - `score`
  - `state`: `ready`, `review_needed`, or `insufficient`
  - `reasons` with severity, code, message key, and display message
  - `computedAt`

Computed assessment output includes:

- `movementAverage`
- `socialAverage`
- `mentalAverage`
- `ski`
- `mentalWellbeing.mentalSkillsAverage`
- `mentalWellbeing.checkInAverage`
- `mentalWellbeing.recoveryAverage`
- `mentalWellbeing.disagreementIndex`
- `mentalWellbeing.riskLevel`
- `mentalWellbeing.flaggedSignals`
- `completion.done`
- `completion.total`

## Current reporting and interpretation behavior

Professional and family reports are derived from the same evidence base, with different audience language.

The current downstream interpretation stack includes:

- standards-version-aware recommendations
- benchmark variant awareness
- child-state summary
- progress comparison and plan-effectiveness explanation
- parent improvement guidance
- next-session conductor focus priorities
- reassessment cadence and follow-up status
- confidence / reliability context
- assessment-quality readiness state and review reasons

## Export delivery behavior

Current report and governance export flows share an explicit lifecycle model:

- `idle`
- `blocked`
- `queued`
- `generating`
- `success`
- `failed_retryable`
- `failed_terminal`

This lifecycle is surfaced in:

- child-detail professional and family report export actions
- record-detail professional and family report export actions
- governance export actions in settings

Blocked states are used when policy prevents export, such as missing active `familyReport` or `dataSharing` consent. Family report export also blocks when the assessment quality state is `insufficient`; professional export remains available so conductors can review and correct the record.

## Weak-network buffering behavior

The first buffered local-sync increment keeps the existing APIs as the source of truth and does not introduce new server endpoints.

Buffered write paths currently include:

- assessment save requests
- `POST /api/children/:id/plan`
- `POST /api/children/:id/communications`

Client behavior:

- transient network or retryable server failures queue the write locally
- queued writes retry automatically when the browser is online again
- the UI exposes pending, retrying, retryable-failure, and conflict states
- manual retry and discard remain explicit for buffered items

Server behavior remains unchanged:

- the existing endpoints are still authoritative
- validation, permission checks, and audit behavior continue to run on the eventual synced request
- development-plan and support-workspace linkage

## Draft persistence behavior

The assessment editor now uses local draft persistence for interruption safety.

- Drafts are stored locally in the browser and scoped to conductor plus assessment context.
- Recoverable drafts require an explicit resume or discard decision.
- Drafts are cleared after successful final assessment save.
- There is no live server draft API yet. If server persistence is added later, it should follow the planned contract:
  - `GET /api/children/:id/assessment-draft`
  - `PUT /api/children/:id/assessment-draft`
  - `DELETE /api/children/:id/assessment-draft`
- culture and trust pulse aggregation

## Culture survey routes

- `GET /api/culture-surveys`
  - authenticated
  - returns launch list plus aggregate culture analytics
- `POST /api/culture-surveys`
  - authenticated admin/settings-writer flow
  - creates a launch or closes an active launch
- `GET /api/culture-voice?token=...`
  - public
  - resolves anonymous survey metadata from the signed token
- `POST /api/culture-voice`
  - public
  - submits one anonymous response into the launch

## Audit-covered operations

The persistent audit log currently records sensitive activity including:

- child create, update, delete, restore
- assessment create, update, delete, restore
- user access changes and deletions
- invite sends
- settings and standards updates
- support workspace saves
- governed communications
- media uploads
- report exports
- governance exports
