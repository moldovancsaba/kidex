# KIDEX API Reference

Base path: Next.js App Router API under `/api/*`.

## Authentication model

Role checks are controlled by `KIDEX_ENFORCE_AUTH`.

- When disabled: endpoints work without role headers.
- When enabled: endpoints that require authorization validate `x-kidex-role`.

Current active runtime roles:
- `admin`
- `conductor`
- `observer`

Reserved future roles such as `institution_admin`, `reviewer`, `guardian_viewer`, and `auditor` are intentionally not accepted by the current runtime until their permission model is implemented.

See [docs/role-taxonomy.md](./role-taxonomy.md) for the canonical role model and extension policy.
See [docs/access-model.md](./access-model.md) for the current permission matrix, institution boundaries, and standards governance rules.

## Endpoints

### Health

- `GET /api/health`
  - Returns service health diagnostics.

### Assessments

- `GET /api/assessments`
  - Returns summary list of assessments.
  - Roles: `admin`, `conductor`, `observer` (when auth enforced).

- `POST /api/assessments`
  - Creates assessment record and syncs centralized child profile.
  - Roles: `admin`, `conductor`.

- `GET /api/assessments/:id`
  - Returns one assessment record.

- `PATCH /api/assessments/:id`
  - Updates one assessment and re-syncs child profile.
  - Automatically appends the current modification timestamp to the `updateHistory` log.

- `DELETE /api/assessments/:id`
  - Deletes one assessment.

### Children

- `GET /api/children`
  - Returns centralized child profiles.
  - If empty, attempts a sync from historical assessments.
  - Roles: `admin`, `conductor`, `observer` (when auth enforced).

- `POST /api/children`
  - Creates/updates child profile by identity (`name` + `birthDate`).
  - Roles: `admin`, `conductor`.

- `GET /api/children/:id`
  - Returns one child profile.
  - Roles: `admin`, `conductor`, `observer` (when auth enforced).

- `PATCH /api/children/:id`
  - Updates child profile fields.
  - Also updates linked assessment child identity fields.
  - Roles: `admin`, `conductor`.

- `DELETE /api/children/:id`
  - Deletes child profile and associated assessment history.
  - Includes legacy fallback cleanup by immutable identity (`name` + `birthDate`) for records without `childId`.
  - Roles: `admin`, `conductor`.

- `GET /api/children/:id/history`
  - Returns child profile plus linked chronological assessment history.
  - Roles: `admin`, `conductor`, `observer` (when auth enforced).

### Users

- `GET /api/users`
  - Returns user list with roles.
  - Roles: `admin`, `conductor`, `observer` (when auth enforced).

- `POST /api/users`
  - Upserts user with the currently active runtime role set.
  - Unknown or reserved future roles are rejected from persisted role data.
  - Roles: `admin`, `conductor`.

### Settings

- `GET /api/settings`
  - Returns settings document:
    - `conductors[]`
    - `observers[]`
    - `locations[]`
    - `company` profile fields (name, ID, legal form, address, VAT, etc.)
  - Roles: `admin`, `conductor`, `observer` (when auth enforced).

- `POST /api/settings`
  - Saves settings document.
  - Roles: `admin`.

### Audit

- `GET /api/audit?limit=25`
  - Returns recent audit events for review.
  - Roles: `admin`.

- `POST /api/audit`
  - Writes PDF export audit events from the authenticated dashboard client.
  - Roles: any role with assessment read access.

### Uploads

- `POST /api/uploads/imgbb`
  - Uploads image to ImgBB server-side.
  - Enforces photo-consent governance when child or assessment context is provided.
  - Returns attachment metadata used in assessments.

## Reporting and export behavior

- **Bio-Psycho-Social Map**: Data-driven PDF generation that aggregates a child's full assessment history to provide longitudinal development trends and expert recommendations.
- **Direct PDF Download**: Export action is client-side (`jsPDF` + `jspdf-autotable`), producing professional, localized documents.
- **Audit Trail**: PDF exports are written to the persistent audit log with actor, target, format, timing, and warning/error metadata.

## Validation and error response

Validation is centralized in `lib/validations.ts`.

Error format:

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
