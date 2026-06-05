# Monte Sinai

Monorepo da Monte Sinai com dois apps Next/React:

- `apps/web`: site oficial e PWA da loja.
- `apps/admin`: painel administrador/desenvolvedor e PWAs por papel.

A loja estatica antiga foi removida na Etapa 1. O historico fica no Git; o projeto final nao depende de `archive`, HTML solto, CSS global legado ou JS antigo.

## Comandos

```powershell
npm install
npm run dev:web
npm run dev:admin
npm run lint
npm run typecheck
npm run build
npm run test
npm run ready
```

## Deploy

Configure dois sites no Netlify, cada um com seu diretorio base:

- Site oficial: base `apps/web`, build `npm run build`, publish `.next`.
- Painel: base `apps/admin`, build `npm run build`, publish `.next`.

Cada app tem seu proprio `netlify.toml`.

## Supabase

As migrations e seeds ficam em `supabase/`. SQL deve ser feito em etapa propria, sempre aditivo e sem `DELETE`/`TRUNCATE` em dados reais.

Base canonica atual:

- `public.profiles`
- `public.produtos`
- `public.produto_variacoes`
- `public.pedidos`
- `public.pedido_itens`
- `public.admin_audit_logs`
- `public.site_configuracoes`

Arquivos importantes:

- `supabase/schema-pedidos.sql`
- `supabase/20260524-base-rbac-permissoes.sql`
- `supabase/storage-produtos.sql`
- `supabase/seed-produtos.sql`

## Etapas

1. Base limpa: monorepo, apps separados, deploy separado e remocao do legado.
2. Site oficial Next fiel ao PDF do site.
3. Produto, carrinho e checkout com variacoes reais.
4. Painel administrador/desenvolvedor fiel ao PDF do painel.
5. SQL/Supabase somente quando a auditoria mostrar necessidade real.

Cada etapa para no final para revisao antes de avancar.
