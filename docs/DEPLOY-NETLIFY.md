# Deploy Netlify - Monte Sinai

O projeto Monte Sinai usa dois apps Next.js separados dentro do monorepo:

- `apps/web`: site publico da loja e PWA do cliente.
- `apps/admin`: painel administrativo/desenvolvedor e PWA do painel.

Nao publique os dois apps como um unico site. Cada app deve ter um site separado no Netlify.

## Site publico da loja

Crie um site no Netlify para a loja oficial.

Configuracao do site:

```text
Base directory: apps/web
Build command: npm run build
Publish directory: .next
Config file: apps/web/netlify.toml
```

O arquivo `apps/web/netlify.toml` deve manter:

```toml
[build]
  command = "npm run build"
  publish = ".next"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

Variaveis obrigatorias no site `apps/web`:

```text
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=SUA_CHAVE_PUBLISHABLE
NEXT_PUBLIC_ADMIN_URL=https://URL-DO-PAINEL-ADMIN
```

Depois que o painel admin estiver publicado, volte neste site da loja e atualize `NEXT_PUBLIC_ADMIN_URL` com a URL final do painel.

## Painel administrativo

Crie outro site no Netlify para o painel.

Configuracao do site:

```text
Base directory: apps/admin
Build command: npm run build
Publish directory: .next
Config file: apps/admin/netlify.toml
```

O arquivo `apps/admin/netlify.toml` deve manter:

```toml
[build]
  command = "npm run build"
  publish = ".next"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

Variaveis obrigatorias no site `apps/admin`:

```text
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=SUA_CHAVE_PUBLISHABLE
NEXT_PUBLIC_STORE_URL=https://URL-DA-LOJA-PUBLICA
```

Depois que a loja estiver publicada, volte neste site do painel e atualize `NEXT_PUBLIC_STORE_URL` com a URL final da loja.

## PWA e manifests

Os PWAs ficam separados por app.

Loja publica:

```text
apps/web/public/manifest.webmanifest
apps/web/src/app/layout.tsx -> manifest: /manifest.webmanifest
```

Painel:

```text
apps/admin/public/manifest-admin.webmanifest
apps/admin/public/manifest-developer.webmanifest
apps/admin/public/admin-sw.js
apps/admin/src/app/layout.tsx -> manifest: /manifest-admin.webmanifest
apps/admin/src/components/admin/pwa-role-manager.tsx -> troca admin/developer depois do login
```

Nao copie manifest ou service worker de um app para o outro.

## Configuracao manual pelo painel do Netlify

### Loja

1. Acesse Netlify e crie um novo site a partir do repositorio.
2. Escolha o repositorio `site-da-pati`.
3. Configure:
   - Base directory: `apps/web`
   - Build command: `npm run build`
   - Publish directory: `.next`
4. Em Environment variables, cadastre:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `NEXT_PUBLIC_ADMIN_URL`
5. Salve e rode o deploy.

### Painel

1. Crie um segundo site no Netlify a partir do mesmo repositorio.
2. Configure:
   - Base directory: `apps/admin`
   - Build command: `npm run build`
   - Publish directory: `.next`
3. Em Environment variables, cadastre:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `NEXT_PUBLIC_STORE_URL`
4. Salve e rode o deploy.

## Comandos com Netlify CLI

A CLI `netlify` e opcional. Se ela estiver instalada e autenticada, use estes comandos como referencia. Nao execute em site errado.

Loja:

```powershell
Push-Location apps/web
netlify sites:create --name monte-sinai-loja
netlify link --name monte-sinai-loja
netlify env:set NEXT_PUBLIC_SUPABASE_URL "https://SEU-PROJETO.supabase.co"
netlify env:set NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY "SUA_CHAVE_PUBLISHABLE"
netlify env:set NEXT_PUBLIC_ADMIN_URL "https://URL-DO-PAINEL-ADMIN"
netlify deploy --build
Pop-Location
```

Painel:

```powershell
Push-Location apps/admin
netlify sites:create --name monte-sinai-admin
netlify link --name monte-sinai-admin
netlify env:set NEXT_PUBLIC_SUPABASE_URL "https://SEU-PROJETO.supabase.co"
netlify env:set NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY "SUA_CHAVE_PUBLISHABLE"
netlify env:set NEXT_PUBLIC_STORE_URL "https://URL-DA-LOJA-PUBLICA"
netlify deploy --build
Pop-Location
```

Pelo monorepo, prefira configurar Base directory no painel do Netlify. Se usar CLI, execute os comandos dentro do diretorio do app correto e confira no site criado se o Base directory ficou como `apps/web` ou `apps/admin` antes de publicar em producao.

## Validacao local antes de publicar

Rode na raiz do repositorio:

```powershell
npm run lint
npm run typecheck
npm run build
```

Se o Netlify selecionar uma versao antiga do Node, configure `NODE_VERSION=22` nas variaveis do site.

## Erro 404 no deploy antigo

Se o site atual estiver com:

```text
Build command: vazio
Publish directory: .
```

ele ainda esta no modelo estatico antigo. Corrija criando os dois sites separados acima ou alterando o site existente para usar `apps/web` como Base directory.
