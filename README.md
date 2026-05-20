# Monte Sinai

Site estatico da Monte Sinai para venda local de agua, gas e produtos de limpeza, com catalogo, carrinho, checkout por WhatsApp, autenticacao, pedidos e painel administrativo conectados ao Supabase.

## Publicar no Netlify

1. Suba este projeto para um repositorio Git.
2. No Netlify, escolha **Add new site > Import an existing project**.
3. Selecione o repositorio.
4. Use as configuracoes detectadas pelo `netlify.toml`:
   - Build command: vazio
   - Publish directory: `.`
5. Publique o site.

O arquivo `netlify.toml` tambem configura rotas bonitas, headers de seguranca, cache de CSS/JS/assets, `sitemap.xml`, `robots.txt`, manifesto PWA e service worker.

## Configurar Supabase

1. No SQL Editor do Supabase, execute `supabase/schema-pedidos.sql`.
2. Execute `supabase/seed-produtos.sql` para popular os produtos iniciais.
3. Execute `supabase/admin-acesso.sql`, trocando `email-do-lojista@exemplo.com` pelo email real do lojista.
4. Execute `supabase/storage-produtos.sql` para criar o bucket publico `produtos` e permitir upload somente para administradores.
5. Confirme se `js/supabase.js` esta com a URL do projeto e a chave publica anon/publishable corretas.

## Estrutura no Supabase

O site usa estas tabelas principais:

- `profiles`: dados do cliente e identificacao de administrador.
- `produtos`: catalogo, preco, imagem, categoria, descricao e status ativo/inativo.
- `pedidos`: cabecalho do pedido.
- `pedido_itens`: itens de cada pedido.
- `enderecos`: enderecos do cliente.

As policies de RLS deixam cada cliente ver seus proprios dados e pedidos. Administradores conseguem gerenciar produtos, ver todos os pedidos e mudar status.

## Fluxo do pedido

1. O cliente adiciona produtos ao carrinho.
2. No checkout, o pedido e salvo no Supabase.
3. Depois que o pedido e salvo, o site abre o WhatsApp com a mensagem pronta.
4. O cliente acompanha os pedidos em `pages/perfil.html`.
5. O lojista gerencia pedidos e produtos em `pages/painel.html`.

## Painel administrativo

O painel permite:

- listar pedidos;
- mudar status do pedido;
- listar, criar, editar e excluir produtos;
- ativar/desativar produtos;
- editar preco;
- enviar imagem para o Supabase Storage e salvar a URL no produto.

Para liberar acesso, o usuario precisa existir no Auth/Profiles e ter `profiles.is_admin = true`.

## Antes de vender

- Faca login com o email do lojista e confirme se o painel abre.
- Crie ou edite um produto com imagem.
- Teste um pedido completo ate abrir o WhatsApp.
- Confira se o pedido aparece no perfil do cliente e no painel do lojista.
- Ajuste o dominio `https://monte-sinai.netlify.app` em SEO/sitemap se usar um dominio proprio.

## Assets

O projeto inclui imagens em `assets/hero`, `assets/brand` e `assets/produtos`. Para regerar banners e pecas de divulgacao locais, rode:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\generate-marketing-assets.ps1
```
