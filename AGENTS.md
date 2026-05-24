# AI Agent Guide for `site da pati`

## Project overview

- Static HTML/CSS/JS storefront for a local shop called Monte Sinai.
- Uses Supabase for authentication, product/catalog data, orders, and admin dashboard.
- Deploys as a static site on Netlify with `Publish directory: .` and no build command.
- Main runtime files are plain HTML pages, a single CSS file, and a small client-side JS layer.

## What to know first

- `README.md` is the primary project documentation for deployment and Supabase setup.
- `netlify.toml` configures routing, security headers, cache rules, and the static publish workflow.
- `js/supabase.js` contains the Supabase project URL and public key used by every page.
- The app is not a framework app; do not introduce React/Vite/Next.js or similar without explicit user request.
- Pages under `pages/` and root HTML files use relative links and expect the site to live at the repository root.

## Core files and directories

- `index.html` and `pages/*.html`: application pages and public site entry points.
- `css/style.css`: global styling.
- `js/script.js`: main client logic and page behavior.
- `js/supabase.js`: Supabase initialization and auth settings.
- `sw.js`, `site.webmanifest`, `robots.txt`, `sitemap.xml`: PWA, SEO, and caching support.
- `assets/`: static images, banners, product pictures, and brand assets.
- `supabase/`: SQL schema and seeds used for Supabase setup and migrations.

## Supabase-specific guidance

- Any Supabase schema or seed changes should be reflected in `supabase/` SQL files.
- Admin access and user roles are controlled via the canonical RBAC SQL in `supabase/20260524-base-rbac-permissoes.sql`; older role files are legacy/context only.
- The `README.md` includes Supabase setup steps: schema, seed, admin access, storage bucket, and email configuration.
- The site uses Supabase Auth and RLS; avoid breaking table relationships or client-side queries without understanding the database schema.

## Deployment and editing rules

- Do not assume a build step; editing HTML/CSS/JS directly is the normal workflow.
- Preserve the existing relative URL structure in HTML pages and assets.
- When updating URLs or metadata, check `robots.txt`, `sitemap.xml`, and canonical tags across pages.
- Avoid changing the runtime dependency on `https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2` unless the user asks for a library upgrade.

## Useful references

- `README.md`: deployment, Supabase setup, and testing checklist.
- `netlify.toml`: production route/caching/security config.
- `supabase/`: all Supabase SQL migrations and seed data.

## Suggested next customization

- Add a specialized `skill` for Supabase deployment and site configuration tasks.
- Add instructions for testing Supabase flows, image uploads, and checkout/WhatsApp behavior.
