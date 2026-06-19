# Deploy Monte Sinai

O projeto agora usa dois apps Next independentes.

## Site oficial

Netlify:

- Base directory: `apps/web`
- Build command: `npm run build`
- Publish directory: `.next`
- Config file: `apps/web/netlify.toml`

## Painel administrativo

Netlify:

- Base directory: `apps/admin`
- Build command: `npm run build`
- Publish directory: `.next`
- Config file: `apps/admin/netlify.toml`

## Variaveis

Configure nos dois sites quando necessario:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

Configure tambem as URLs entre os apps:

```text
# apps/web
NEXT_PUBLIC_ADMIN_URL=https://URL-DO-PAINEL

# apps/admin
NEXT_PUBLIC_STORE_URL=https://URL-DA-LOJA
```

Nao use service role no frontend.

## Validacao antes de publicar

```powershell
npm run ready
npm run test
```

Se uma etapa tiver SQL, revise a migration em `supabase/` antes de executar no Supabase.
