# Deployment

## GitHub

Repository: `https://github.com/moldovancsaba/kidex`

The deployable app is the repository root.

## Vercel

Create or update the Vercel project with these settings:

- Git repository: `moldovancsaba/kidex`
- Root directory: repository root
- Framework preset: Next.js
- Build command: `npm run build`
- Install command: `npm install`

Environment variables:

```txt
MONGODB_URI
MONGODB_DB
IMGBB_API_KEY
```

`IMGBB_API_KEY` has already been added to Vercel. `MONGODB_URI` must point to the MongoDB Atlas cluster and include credentials for a database user with read/write access.

## MongoDB Atlas Checklist

1. Create a database user with read/write access.
2. Add Vercel outbound access. For an early pilot, Atlas network access can be opened broadly; for production, restrict according to the deployment model available.
3. Copy the driver connection string into Vercel as `MONGODB_URI`.
4. Set `MONGODB_DB` to `kidex`.
5. Redeploy the Vercel project after changing environment variables.

## ImgBB Uploads

The app sends uploads to the server-side endpoint `/api/uploads/imgbb`.

The browser never receives `IMGBB_API_KEY`.

The assessment record stores:

- image URL
- thumbnail URL when returned by ImgBB
- delete URL when returned by ImgBB
- file name, MIME type, size, upload time

Media upload is blocked in the UI until video/photo consent is checked.

## Post-deploy checks (0.5.x)

1. Open `/dashboard/settings` and verify:
- Standards Version Manager renders active version and version table.
- Restore Bin loads deleted children and assessments.
2. Create and update one assessment, then verify:
- `standardsVersionUsed` is present on the saved record.
- `mentalWellbeing` is present on the saved record and computed values are returned.
3. Soft-delete one child and one assessment, verify:
- They disappear from default lists.
- They appear in deleted views and can be restored.
4. Verify localized chart outcome sentences appear on:
- `/dashboard`
- `/dashboard/children/[id]`
- `/dashboard/records/[id]`
5. Open `/dashboard/children/[id]` and verify:
- the support workspace renders caregiver tools, coach tools, micro-learning, referrals, and evidence journal sections
- support workspace can be saved and reloaded
6. Export a family report and verify:
- family-safe report generation succeeds
- support follow-up and recent evidence moments appear when the workspace has them
