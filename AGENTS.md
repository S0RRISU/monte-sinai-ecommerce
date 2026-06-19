# AI Agent Guide for `site da pati`

## Project overview

- Monte Sinai monorepo using Next.js/React.
- `apps/web` is the official storefront/PWA.
- `apps/admin` is the administrator/developer panel/PWA.
- Supabase remains the data/auth/storage backend.

## Core rules

- Work one etapa at a time. Do not advance to the next etapa without user review.
- Do not add archive/remendo folders. Use Git as the backup.
- Do not solve UI or business-logic problems by adding a new layer over an old one; edit or replace the existing source responsible for the behavior, and remove obsolete code when replacement is safe.
- Keep the root clean: source lives in `apps/`, shared assets in `assets/`, SQL in `supabase/`.
- Do not reintroduce root `index.html`, `pages/`, `css/`, `js/`, old service workers, or static Netlify publish workflow.
- Do not expose Supabase service role keys in frontend code.
- SQL changes must be aditive, reviewed separately, and stored in `supabase/`.

## Important directories

- `apps/web/src`: official site source.
- `apps/web/public`: public assets, manifest, SEO files for the site.
- `apps/admin/src`: admin panel source.
- `apps/admin/public`: admin/developer manifests and assets.
- `assets`: final brand, hero, and product images.
- `supabase`: migrations, seeds, functions, and setup SQL.

## Validation

Run from the repository root:

```powershell
npm run lint
npm run typecheck
npm run build
npm run test
npm run ready
```

If a command fails due to local environment issues, report the exact command and reason.
