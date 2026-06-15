# 🚀 Monte Sinai Ecommerce

Plataforma web completa para venda local de **água mineral, gás de cozinha e produtos de limpeza**.

O projeto foi desenvolvido para atender uma operação real de comércio local, reunindo catálogo de produtos, autenticação de usuários, carrinho de compras, checkout via WhatsApp, gerenciamento de pedidos, controle de estoque, painel administrativo, banco de dados em nuvem, permissões por cargo, PWA e deploy em produção.

🌐 **Demonstração:**
https://monte-sinai.netlify.app

---

## 📌 Sobre o projeto

O **Monte Sinai Ecommerce** é uma aplicação web criada para digitalizar o processo de venda local de água, gás e produtos de limpeza.

A solução permite que clientes naveguem pelo catálogo, adicionem produtos ao carrinho, finalizem pedidos pelo WhatsApp e acompanhem seus pedidos. Ao mesmo tempo, a administração consegue gerenciar produtos, estoque, pedidos, pagamentos, imagens e configurações da loja através de um painel administrativo integrado.

O sistema utiliza **Supabase** como backend principal, com banco de dados PostgreSQL, autenticação de usuários, policies de segurança, controle de permissões, armazenamento de imagens e funções para criação segura de pedidos.

---

## 🧩 Principais recursos

### 👤 Área do cliente

* Cadastro de usuários
* Login autenticado
* Perfil do cliente
* Catálogo de produtos
* Carrinho de compras
* Checkout via WhatsApp
* Finalização de pedido como visitante
* Finalização de pedido como cliente logado
* Histórico de pedidos
* Consulta de pedidos por código e WhatsApp

### 🛠️ Painel administrativo

* Gestão de produtos
* Cadastro de produtos
* Edição de produtos
* Exclusão de produtos
* Ativação e desativação de produtos
* Controle de preços
* Controle de estoque
* Alerta de estoque baixo
* Gestão de pedidos
* Controle de status do pedido
* Controle de status de pagamento
* Upload de imagens para produtos
* Configurações da loja
* Controle de WhatsApp, Pix, entrega e bairros atendidos
* Modo programador com diagnóstico técnico

### 🔐 Recursos técnicos

* Supabase Auth
* Banco PostgreSQL
* Supabase Storage
* Row Level Security (RLS)
* Role Based Access Control (RBAC)
* Função segura para criação de pedidos
* Recalculo de totais no backend
* Atualização de estoque
* PWA instalável
* Service Worker
* Cache de arquivos estáticos
* Deploy via Netlify

---

## 🧰 Tecnologias utilizadas

### Front-end

* HTML5
* CSS3
* JavaScript

### Backend e banco de dados

* Supabase
* PostgreSQL
* Supabase Auth
* Supabase Storage
* Supabase Edge Functions

### Infraestrutura e publicação

* GitHub
* Netlify
* Netlify TOML
* PWA
* Service Worker

### Segurança e permissões

* Row Level Security (RLS)
* Role Based Access Control (RBAC)
* Policies no Supabase
* Controle de acesso por perfil

---

## 📷 Screenshots

> Adicione aqui imagens do projeto para valorizar o repositório.

Sugestões de imagens:

* Home da loja
* Catálogo de produtos
* Carrinho de compras
* Checkout
* Tela de pedidos
* Painel administrativo
* Versão mobile

Exemplo de estrutura:

```md
![Home da loja](assets/screenshots/home.png)
![Painel administrativo](assets/screenshots/painel-admin.png)
![Versão mobile](assets/screenshots/mobile.png)
```

---

# 📚 Documentação Técnica

## 1. Visão geral da aplicação

O Monte Sinai Ecommerce é um site estático conectado ao Supabase para venda local de água, gás e produtos de limpeza.

A aplicação possui:

* Catálogo de produtos
* Carrinho de compras
* Checkout por WhatsApp
* Autenticação de usuários
* Pedidos
* Painel administrativo
* Controle de estoque
* Upload de imagens
* Configurações operacionais da loja
* PWA
* Deploy em produção

O sistema utiliza o Supabase como backend principal, com autenticação, banco PostgreSQL, policies de segurança, armazenamento de imagens e funções de apoio.

---

## 2. Estrutura principal do projeto

A estrutura do projeto é organizada em pastas e arquivos responsáveis por interface, lógica, assets, banco de dados e automações.

```txt
/
├── assets/
│   ├── brand/
│   ├── hero/
│   └── produtos/
│
├── css/
│   └── arquivos de estilo da aplicação
│
├── js/
│   ├── supabase.js
│   ├── script.js
│   ├── admin.js
│   ├── app-shell.js
│   └── demais scripts da aplicação
│
├── pages/
│   ├── painel.html
│   ├── pedidos.html
│   └── demais páginas internas
│
├── supabase/
│   ├── schema-pedidos.sql
│   ├── seed-produtos.sql
│   ├── storage-produtos.sql
│   ├── 20260524-base-rbac-permissoes.sql
│   └── demais migrações
│
├── tools/
│   └── scripts auxiliares
│
├── index.html
├── netlify.toml
├── package.json
├── robots.txt
├── sitemap.xml
├── sw.js
└── README.md
```

---

## 3. Publicação no Netlify

A publicação do projeto utiliza Netlify com configuração detectada pelo arquivo `netlify.toml`.

### Fluxo de publicação

1. Subir o projeto para um repositório Git.
2. No Netlify, acessar **Add new site > Import an existing project**.
3. Selecionar o repositório do projeto.
4. Usar as configurações detectadas pelo `netlify.toml`.
5. Publicar o site.

### Configuração de build

```txt
Build command: vazio
Publish directory: .
```

### Configurações implementadas no `netlify.toml`

O arquivo `netlify.toml` configura:

* Rotas amigáveis
* Headers de segurança
* Cache de CSS
* Cache de JavaScript
* Cache de assets
* `sitemap.xml`
* `robots.txt`
* Manifesto PWA
* Service Worker

---

## 4. Configuração do Supabase

A aplicação depende de scripts SQL para criação e atualização da estrutura do banco de dados.

### Scripts principais

No SQL Editor do Supabase, executar:

```txt
supabase/schema-pedidos.sql
supabase/seed-produtos.sql
supabase/20260524-base-rbac-permissoes.sql
supabase/storage-produtos.sql
```

---

### `supabase/schema-pedidos.sql`

Script responsável pela estrutura principal relacionada a pedidos, clientes, itens e dados operacionais.

---

### `supabase/seed-produtos.sql`

Script responsável por popular ou atualizar o catálogo inicial de produtos.

Esse script utiliza a tabela:

```txt
public.produtos
```

Ele atualiza produtos existentes pelo campo:

```txt
nome
```

E não apaga produtos já cadastrados.

Esse arquivo deve ser usado somente quando for necessário repor ou atualizar o catálogo inicial.

---

### `supabase/20260524-base-rbac-permissoes.sql`

Script responsável por criar a base oficial de cargos e permissões do sistema.

Esse arquivo libera o acesso ao painel administrativo para usuários com cargos autorizados.

A base de permissões utiliza cargos como:

```txt
cliente
equipe
motoboy
admin
developer
```

---

### `supabase/storage-produtos.sql`

Script responsável por criar o bucket público:

```txt
produtos
```

Esse bucket é utilizado para imagens dos produtos.

O upload de imagens é permitido somente para usuários administrativos.

---

## 5. Migrações complementares

Quando o banco já existe antes desta versão, também devem ser executadas as migrações idempotentes:

```txt
ofertas-kits-produtos.sql
promocoes-estoque-cupons.sql
site-configuracoes.sql
checkout-visitante-admin-roles.sql
```

Após essas migrações, deve ser reexecutado:

```txt
supabase/20260524-base-rbac-permissoes.sql
```

Essa etapa garante que:

* Policies continuem corretas
* Grants continuem aplicados
* Cargos canônicos continuem consistentes
* Permissões administrativas continuem funcionando

---

## 6. Configuração do cliente Supabase

O arquivo responsável pela conexão com o Supabase é:

```txt
js/supabase.js
```

Esse arquivo deve conter:

* URL do projeto Supabase
* Chave pública anon/publishable

A aplicação web utiliza a chave pública do Supabase para operação no front-end.

---

# 🗄️ Estrutura no Supabase

## Tabelas principais

O sistema utiliza as seguintes tabelas principais:

```txt
public.profiles
public.produtos
pedidos
pedido_itens
enderecos
site_configuracoes
```

---

## `public.profiles`

Tabela oficial de dados dos usuários.

Armazena:

* Dados do cliente
* Informações de perfil
* Permissões administrativas
* Cargo do usuário
* Controle de acesso ao painel

---

## `public.produtos`

Tabela oficial do catálogo.

Armazena:

* Nome do produto
* Categoria
* Preço
* Imagem
* Descrição
* Estoque
* Status ativo/inativo

---

## `pedidos`

Tabela de cabeçalho dos pedidos.

Armazena:

* Dados gerais do pedido
* Cliente vinculado
* Status do pedido
* Status de pagamento
* Total do pedido
* Dados de visitante quando aplicável

---

## `pedido_itens`

Tabela de itens do pedido.

Armazena:

* Produtos comprados
* Quantidade
* Preço unitário
* Subtotal
* Vínculo com o pedido

---

## `enderecos`

Tabela de endereços dos clientes.

Armazena:

* Endereços cadastrados
* Dados de entrega
* Vínculo com usuário autenticado

---

## `site_configuracoes`

Tabela de configurações operacionais da loja.

Armazena:

* Nome da loja
* Logo
* Cor principal
* Textos da home
* Avisos
* WhatsApp
* Chave Pix
* Dados de entrega
* Bairros atendidos
* Configurações da vitrine

---

## Tabelas legadas

As tabelas antigas continuam preservadas apenas como legado:

```txt
public.produto
public.perfis_usuarios
```

O site não deve ler nem gravar nessas tabelas.

Quando existirem dados antigos, deve ser executado:

```txt
supabase/20260522-unificar-tabelas-legadas.sql
```

Esse script copia os dados aproveitáveis para:

```txt
public.produtos
public.profiles
```

As tabelas antigas não são apagadas.

---

# 🔐 Segurança

## Row Level Security (RLS)

A aplicação utiliza RLS no Supabase para controlar o acesso aos dados.

As policies implementadas garantem que:

* Clientes acessam apenas seus próprios dados
* Clientes acessam apenas seus próprios pedidos
* Administradores acessam pedidos da loja
* Administradores gerenciam produtos
* Administradores alteram status de pedidos
* Usuários sem permissão não acessam o painel administrativo

---

## Criação segura de pedidos

Pedidos de visitantes e clientes logados são criados através da função segura:

```txt
create_order
```

Essa função implementa:

* Validação dos dados do pedido
* Recalculo dos totais
* Criação do cabeçalho do pedido
* Criação dos itens do pedido
* Atualização de estoque
* Tratamento de cliente visitante
* Tratamento de cliente autenticado

Pedidos visitantes aparecem no painel com:

```txt
user_id = null
```

---

# 🧑‍💼 Controle de Acesso (RBAC)

A aplicação implementa controle de acesso baseado em papéis.

## Cargos implementados

```txt
cliente
equipe
motoboy
admin
developer
```

---

## Permissões por cargo

### `cliente`

Permite:

* Comprar produtos
* Gerenciar seus próprios dados
* Consultar seus próprios pedidos

### `equipe`

Permite:

* Atuar na operação de pedidos
* Apoiar o fluxo administrativo da loja

### `motoboy`

Permite:

* Atuar no fluxo de entrega
* Acompanhar pedidos relacionados à entrega

### `admin`

Permite:

* Gerenciar produtos
* Gerenciar pedidos
* Gerenciar configurações da loja
* Gerenciar equipe
* Controlar estoque
* Controlar pagamentos

### `developer`

Permite:

* Acesso administrativo completo
* Diagnóstico técnico
* Configuração avançada da plataforma
* Manutenção do sistema

A base canônica de permissões fica em:

```txt
supabase/20260524-base-rbac-permissoes.sql
```

---

# 🔑 Autenticação e email

A autenticação utiliza Supabase Auth.

## Configuração de email

Em **Supabase > Authentication > Providers > Email**, a confirmação obrigatória de email pode ser desativada caso a loja queira permitir que o cliente entre logo após o cadastro.

---

## Email de boas-vindas

A aplicação suporta envio de email de boas-vindas através da Edge Function:

```txt
supabase/functions/send-welcome-email/index.ts
```

### Secrets necessários

```txt
RESEND_API_KEY
WELCOME_FROM_EMAIL
```

### Comportamento da função

A função `send-welcome-email` implementa:

* Validação do JWT do usuário logado
* Envio de email após cadastro autenticado
* Botões para abrir a loja
* Botão para instalar o app

A verificação JWT da Edge Function deve permanecer ativa.

---

# 📱 PWA

A aplicação implementa recursos de Progressive Web App.

## Recursos implementados

* Manifesto PWA
* Service Worker
* Cache de recursos
* Instalação em dispositivos compatíveis

A tela de login possui botão **Instalar app**.

Em navegadores compatíveis, o botão abre a instalação PWA.

Em iPhone ou navegadores sem prompt de instalação, o sistema exibe instrução manual para instalação.

---

# 🛒 Fluxo do pedido

## Fluxo do cliente

1. O cliente acessa o catálogo.
2. O cliente adiciona produtos ao carrinho.
3. O cliente acessa o checkout.
4. O pedido é salvo no Supabase.
5. O cliente pode finalizar logado ou como visitante.
6. Após o pedido ser salvo, o site abre o WhatsApp com a mensagem pronta.
7. O cliente acompanha os pedidos em:

```txt
pages/pedidos.html
```

---

## Pedido de cliente logado

Clientes autenticados visualizam seus pedidos diretamente a partir do Supabase.

---

## Pedido de visitante

Visitantes podem:

* Consultar pedido por código + WhatsApp
* Ver histórico salvo naquele aparelho

---

# 🛠️ Painel administrativo

O lojista gerencia pedidos e produtos em:

```txt
pages/painel.html
```

---

## Gestão de pedidos

O painel administrativo implementa:

* Listagem de pedidos
* Visualização de detalhes do pedido
* Alteração de status do pedido
* Alteração de status de pagamento
* Confirmação de pedido recebido
* Controle de pedidos logados e visitantes

---

## Gestão de produtos

O painel administrativo implementa:

* Listagem de produtos
* Cadastro de produtos
* Edição de produtos
* Exclusão de produtos
* Ativação de produtos
* Desativação de produtos
* Edição de preço
* Controle de estoque
* Alerta de estoque baixo

---

## Upload de imagens

O painel administrativo implementa envio de imagem para o Supabase Storage.

Após o upload, a URL da imagem é salva no cadastro do produto.

---

## Importação de catálogo

O painel permite importar o catálogo local inicial quando a tabela de produtos estiver vazia.

---

## Configurações da loja

O painel administrativo implementa controle de:

* Nome da loja
* Logo
* Cor principal
* Textos da home
* Aviso
* WhatsApp
* Pix
* Entrega
* Bairros atendidos
* Seções da vitrine

---

## Modo programador

No desktop, o painel possui modo programador com:

* Diagnóstico de Supabase
* Diagnóstico de cache
* Controle de versões
* Exportação
* Checklist técnico

---

# ✅ Checklist de validação

Antes de utilizar em produção, a aplicação deve ser validada nos seguintes cenários:

## Autenticação

* Fazer login com usuário lojista
* Confirmar se o painel administrativo abre corretamente
* Cadastrar cliente novo
* Confirmar se o cliente consegue entrar sem verificação de email quando essa opção estiver desativada

## Pedidos

* Finalizar pedido como visitante
* Finalizar pedido como cliente logado
* Confirmar se os dois pedidos aparecem no painel
* Confirmar status de entrega
* Confirmar status de pagamento
* Testar abertura do WhatsApp após pedido salvo
* Confirmar preservação do carrinho em caso de falha no Supabase

## Produtos

* Criar produto
* Editar produto
* Ativar produto
* Desativar produto
* Editar preço
* Atualizar estoque
* Enviar imagem do produto

## Cliente

* Conferir se o pedido aparece no perfil do cliente
* Conferir se visitante consegue consultar pedido por código e WhatsApp

## Painel

* Testar o painel no celular
* Testar produtos no painel
* Testar estoque no painel
* Testar ofertas no painel
* Testar pedidos no painel
* Testar modo programador no computador

## SEO e domínio

Quando houver domínio próprio, ajustar o domínio utilizado em SEO e sitemap.

Domínio atual:

```txt
https://monte-sinai.netlify.app
```

---

# 🖼️ Assets

O projeto inclui imagens nas seguintes pastas:

```txt
assets/hero
assets/brand
assets/produtos
```

---

## Geração de banners e peças locais

Para regerar banners e peças de divulgação locais:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\generate-marketing-assets.ps1
```

---

# 🤖 Geração de imagens com IA

Para gerar imagens avulsas ou atualizar o catálogo de produtos com IA, instalar as dependências:

```powershell
python -m pip install -r requirements.txt
```

---

## Gerar imagem avulsa

```powershell
python .\gerar_foto.py --object "generic 3d product" --style 3d --views front,three_quarter --output-dir generated --base-name produto3d
```

---

## Gerar catálogo

```powershell
python .\gerar_foto.py --catalog --provider pollinations --brand-aware
```

O modo `--catalog` grava por padrão em:

```txt
assets/produtos/v2
```

Também copia a versão de vitrine para:

```txt
assets/produtos/site/v2
```

E atualiza:

```txt
assets/generated/v2/manifest.json
```

---

## Aplicar manifest nas páginas

```powershell
python .\tools\update_asset_refs.py --write --check
```

---

## Opções adicionais do gerador

O gerador também aceita:

```txt
--model
--negative
--padding
--private
--legacy-output
```

Quando várias variações são geradas, também é criado um arquivo:

```txt
*_preview.png
```

---

## Otimizar imagens existentes

```powershell
python .\gerar_foto.py --optimize-assets
```

A rotina recomendada no VS Code está documentada em:

```txt
GUIA-DESENVOLVEDOR.md
```

---

# 🚀 Publicação pelo VS Code

O projeto inclui a task:

```txt
Publicar site online (Netlify)
```

Ela está configurada em:

```txt
.vscode/tasks.json
```

---

## Primeiro uso

No primeiro uso, executar a task:

```txt
Netlify: login e vincular site
```

Essa task realiza login na conta Netlify e vincula a pasta ao site correto.

---

## Publicação de novas versões

Após o vínculo inicial, executar:

```txt
Publicar site online (Netlify)
```

Essa task envia a versão atual para produção.

---

## Execução visual das tasks

Para ter um botão visual no VS Code, instalar a extensão:

```txt
Task Runner Explorer
```

Essa extensão exibe as tasks do workspace para execução rápida.

---

# 🧪 Testes recomendados

Antes de considerar uma versão pronta para produção, validar:

* Links internos
* Carregamento de CSS
* Carregamento de JavaScript
* Imagens
* Responsividade mobile
* Responsividade tablet
* Responsividade desktop
* Console do navegador
* Fluxo de carrinho
* Fluxo de checkout
* Login
* Cadastro
* Pedidos
* Painel administrativo
* Upload de imagem
* Status de pedido
* Consulta de pedido visitante
* PWA
* Service Worker

---

# 📈 Status do projeto

O projeto está em desenvolvimento contínuo.

## Melhorias em andamento

* Refinamento visual
* Melhorias de responsividade
* Otimização de imagens
* Organização de código
* Aprimoramento do painel administrativo
* Melhoria do fluxo de pedidos
* Testes de produção
* Melhorias no PWA
* Melhorias de performance

---

# 🧑‍💻 Desenvolvedor

Marcelo Lopes da Silva

📍 São Paulo - SP

GitHub:
https://github.com/S0RRISU

LinkedIn:
https://www.linkedin.com/in/marcelosil

---

# 📄 Licença

Projeto desenvolvido para fins de estudo, prática profissional e aplicação real em comércio local.
