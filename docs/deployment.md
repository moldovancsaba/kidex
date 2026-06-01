# Deployment

## Repository

- GitHub repository: `moldovancsaba/kidex`
- Deployable app root: repository root

## Runtime requirements

- Node.js: `>=22 <27`
- Build command: `npm run build`
- Install command: `npm install`

## Vercel

Suggested Vercel settings:

- framework preset: Next.js
- root directory: repository root
- install command: `npm install`
- build command: `npm run build`

## Environment variables

### Required

```txt
MONGODB_URI=
MONGODB_DB=kidex
IMGBB_API_KEY=
AUTH_SECRET=
KIDEX_ENFORCE_AUTH=true
SSO_CLIENT_ID=
SSO_CLIENT_SECRET=
SSO_BASE_URL=https://sso.doneisbetter.com
SSO_REDIRECT_URI=https://your-domain.com/api/oauth/callback
```

### Optional but recommended for real invite sending

```txt
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=https://your-domain.com/api/auth/google/callback
```

Notes:

- platform login depends on the `SSO_*` variables
- Gmail invite delivery depends on the `GOOGLE_*` variables
- without Google OAuth, invite sending falls back to mock mode rather than failing the whole app

## MongoDB checklist

1. Provision a database user with read/write access.
2. Add the deployment network access needed by your environment.
3. Set `MONGODB_URI`.
4. Set `MONGODB_DB` to the desired database name, usually `kidex`.
5. Run `npm run db:setup` locally or in a trusted setup environment before first real use if bootstrap data is needed.

## Media uploads

Uploads go through `/api/uploads/imgbb`.

The browser does not receive `IMGBB_API_KEY`.

Attachment metadata persisted in the app can include:

- image URL
- thumbnail URL
- delete URL
- file name
- MIME type
- size
- upload time

Upload behavior is governed by active media consent and child/assessment context.

## Auth and public-route behavior

When `KIDEX_ENFORCE_AUTH=true`:

- dashboard pages require an authenticated session
- most API routes require the same session
- legal pages and consent-review pages remain public

Current public paths include:

- `/{locale}`
- `/{locale}/legal/gtc`
- `/{locale}/legal/privacy`
- `/{locale}/consent/[token]`
- `/api/auth/*`
- `/api/oauth/*`
- `/api/consent-review`

## Post-deploy verification

Run these checks against the deployed environment.

### Platform access

1. Verify SSO login works and the first-user bootstrap or approved-user flow behaves correctly.
2. Verify logout clears the session.
3. If Google invite delivery is configured, connect Gmail from settings and send a test invite.

### Core records

1. Create a child profile with caregivers, consent policy, and accessibility data.
2. Create a rapid assessment and verify:
   - per-item confidence can be set
   - low-confidence rows require an observation note
   - computed scoring returns domain averages and SKI
   - `mentalWellbeing` and consent snapshot data are persisted
3. Update the same assessment and verify `updateHistory` changes.

### Interpretation

1. Open the child history page and verify:
   - current state summary renders
   - reliability context renders
   - parent improvement guidance renders
   - development plan, communications, and support workspace sections load
2. Open the record detail page and verify the same interpretation stack appears there.

### Consent and exports

1. Verify media upload is blocked when media consent is inactive.
2. Verify family PDF export is blocked when family-report consent is inactive.
3. Verify professional export is blocked when data-sharing consent is inactive.
4. Generate both report types when consent is active.

### Governance

1. Open settings and verify:
   - users load
   - institutions load
   - standards versions and variants load
   - audit list loads
   - restore bin loads
2. Generate a governance export bundle and confirm the action is audit logged.

## Local verification before production deploy

```bash
npm test
npm run lint
npm run build
npm run typecheck
```

In this repository, `npm run typecheck` is most reliable after a successful build because `.next/types` is regenerated during the build process.
