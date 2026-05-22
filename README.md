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
2. Execute `supabase/seed-produtos.sql` para popular ou atualizar os produtos iniciais quando necessario.
3. Execute `supabase/admin-acesso.sql` para liberar o painel administrativo.
4. Execute `supabase/storage-produtos.sql` para criar o bucket publico `produtos` e permitir upload somente para administradores.
5. Confirme se `js/supabase.js` esta com a URL do projeto e a chave publica anon/publishable corretas.

Se o banco ja existia antes desta versao, execute tambem as migracoes idempotentes `ofertas-kits-produtos.sql`, `promocoes-estoque-cupons.sql`, `site-configuracoes.sql` e `checkout-visitante-admin-roles.sql`.

`supabase/seed-produtos.sql` deve ser usado somente quando for necessario repor ou atualizar o catalogo inicial. Ele usa `public.produtos`, atualiza produtos existentes pelo campo `nome` e nao apaga produtos ja cadastrados.

### Autenticacao e email

- Em **Supabase > Authentication > Providers > Email**, desligue a confirmacao obrigatoria de email se quiser que o cliente entre logo depois do cadastro.
- Crie a Edge Function `send-welcome-email` usando `supabase/functions/send-welcome-email/index.ts`.
- Configure os secrets da funcao:
  - `RESEND_API_KEY`: chave da Resend.
  - `WELCOME_FROM_EMAIL`: remetente validado, por exemplo `Monte Sinai <contato@seudominio.com>`.
- A funcao valida o JWT do usuario logado antes de enviar, entao deixe a verificacao JWT da Edge Function ativa.
- O email de boas-vindas e disparado depois do cadastro autenticado e inclui botoes para abrir a loja e instalar o app.
- A tela de login tem botao **Instalar app**. Em navegadores compativeis ele abre a instalacao PWA; em iPhone ou navegadores sem prompt, mostra a instrucao manual.

## Estrutura no Supabase

O site usa estas tabelas principais:

- `public.profiles`: tabela oficial de dados do cliente e permissoes administrativas.
- `public.produtos`: tabela oficial do catalogo, preco, imagem, categoria, descricao e status ativo/inativo.
- `pedidos`: cabecalho do pedido.
- `pedido_itens`: itens de cada pedido.
- `enderecos`: enderecos do cliente.
- `site_configuracoes`: textos, identidade, entrega e vitrine controlados pelo painel.

Tabelas antigas continuam preservadas apenas como legado: `public.produto` e `public.perfis_usuarios`. O site nao deve ler nem gravar nelas; quando existirem dados antigos, execute `supabase/20260522-unificar-tabelas-legadas.sql` para copiar o que for aproveitavel para `public.produtos` e `public.profiles` sem apagar as tabelas antigas.

As policies de RLS deixam cada cliente ver seus proprios dados e pedidos. Administradores conseguem gerenciar produtos, ver todos os pedidos, confirmar pedidos e mudar status. Pedidos visitantes e logados sao criados pela funcao segura `create_order`, que valida dados, recalcula totais e atualiza estoque; visitantes aparecem no painel com `user_id = null`.

## Fluxo do pedido

1. O cliente adiciona produtos ao carrinho.
2. No checkout, o pedido e salvo no Supabase. O cliente pode finalizar logado ou como visitante.
3. Depois que o pedido e salvo, o site abre o WhatsApp com a mensagem pronta.
4. O cliente acompanha os pedidos em `pages/pedidos.html`; logados veem os pedidos do Supabase e visitantes podem consultar por codigo + WhatsApp ou ver o historico salvo naquele aparelho.
5. O lojista gerencia pedidos e produtos em `pages/painel.html`.

## Painel administrativo

O painel permite:

- listar pedidos;
- mudar status do pedido e status de pagamento;
- confirmar pedido recebido;
- listar, criar, editar e excluir produtos;
- ativar/desativar produtos;
- editar preco;
- controlar estoque e receber alerta quando estiver baixo;
- enviar imagem para o Supabase Storage e salvar a URL no produto.
- importar o catalogo local inicial quando a tabela estiver vazia;
- controlar nome da loja, logo, cor principal, textos da home, aviso, WhatsApp, Pix, entrega, bairros atendidos e secoes da vitrine;
- usar o modo programador no desktop com diagnostico de Supabase, cache, versoes, exportacao e checklist tecnico.

Para liberar acesso, o usuario precisa existir no Auth/Profiles e ter `profiles.is_admin = true` ou `profiles.admin_role` como `developer`, `owner` ou `staff`. O email `marcelol527319@gmail.com` fica como `developer`. Troque o placeholder da Patricia em `supabase/checkout-visitante-admin-roles.sql` quando souber o email dela.

## Antes de vender

- Faca login com o email do lojista e confirme se o painel abre.
- Cadastre um cliente novo e confirme se ele consegue entrar sem verificacao por email.
- Finalize um pedido como visitante e outro como cliente logado.
- Confirme se os dois pedidos aparecem no painel com status de entrega e pagamento.
- Crie ou edite um produto com imagem.
- Teste um pedido completo ate abrir o WhatsApp e confirme se o carrinho fica preservado quando o Supabase falhar.
- Confira se o pedido aparece no perfil do cliente e no painel do lojista.
- No celular, teste o painel da Patricia com produtos, estoque, ofertas e pedidos.
- No computador, teste o modo programador do Marcelo.
- Ajuste o dominio `https://monte-sinai.netlify.app` em SEO/sitemap se usar um dominio proprio.

## Assets

O projeto inclui imagens em `assets/hero`, `assets/brand` e `assets/produtos`. Para regerar banners e pecas de divulgacao locais, rode:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\generate-marketing-assets.ps1
```

Para gerar imagens avulsas ou atualizar o catalogo de produtos com IA, instale as dependencias e use o gerador unico:

```powershell
python -m pip install -r requirements.txt
python .\gerar_foto.py --object "generic 3d product" --style 3d --views front,three_quarter --output-dir generated --base-name produto3d
python .\gerar_foto.py --catalog --provider pollinations --brand-aware
```

O modo `--catalog` grava por padrao em `assets/produtos/v2`, copia a versao de vitrine para `assets/produtos/site/v2` e atualiza `assets/generated/v2/manifest.json`. Para aplicar o manifest nas paginas, rode:

```powershell
python .\tools\update_asset_refs.py --write --check
```

O gerador tambem aceita `--model`, `--negative`, `--padding`, `--private`, `--legacy-output` e cria um `*_preview.png` quando voce gera varias variacoes. Para reduzir o peso das imagens existentes, rode:

```powershell
python .\gerar_foto.py --optimize-assets
```

Veja `GUIA-DESENVOLVEDOR.md` para a rotina recomendada no VS Code.

## Publicar pelo VS Code

O projeto inclui a task **Publicar site online (Netlify)** em `.vscode/tasks.json`. No primeiro uso, rode a task **Netlify: login e vincular site** para entrar na sua conta e ligar esta pasta ao site correto. Depois disso, basta rodar **Publicar site online (Netlify)** para enviar a versao atual para producao.

Para ter um botao visual no VS Code, instale a extensao recomendada **Task Runner Explorer**. Ela mostra as tasks do workspace para execucao rapida.
