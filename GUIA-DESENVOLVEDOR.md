# Guia rapido do desenvolvedor

Este projeto e um site estatico em HTML, CSS e JavaScript. Nao precisa de React, Vite ou build para funcionar.

## Rotina no VS Code

1. Abra esta pasta no VS Code.
2. Instale as extensoes recomendadas quando o VS Code perguntar.
3. Use o Live Preview para abrir `index.html`.
4. Edite HTML, CSS e JS.
5. Teste no desktop e no celular.
6. Rode a task **Gerar preview Netlify** antes de publicar.
7. Rode a task **Publicar site online (Netlify)** quando estiver tudo pronto.

## Tasks mais uteis

- **Instalar dependencias do gerador**: instala Pillow, requests e tqdm.
- **Gerar imagem teste (4 variacoes)**: cria varias opcoes em `generated/`.
- **Gerar imagens de um produto (IA)**: pergunta o produto e gera a imagem do catalogo.
- **Gerar catalogo completo com IA**: regenera todos os produtos.
- **Otimizar imagens do site**: reduz peso de imagens em `assets/`.
- **Preparar showcase dos produtos**: recria imagens bonitas em `assets/produtos/site/`.
- **Gerar artes de divulgacao**: recria banners e artes para WhatsApp.
- **Instalar editores de imagem gratuitos**: instala GIMP, Krita e Inkscape.
- **Instalar ferramentas base gratuitas**: verifica Python, Git e Node.

## Imagens boas sem gastar dinheiro

O melhor fluxo e misturar IA com edicao manual:

1. Gere 4 a 8 variacoes.
2. Escolha a melhor olhando o arquivo `*_preview.png`.
3. Ajuste no GIMP, Photopea ou Krita.
4. Comprima no Squoosh ou rode a task **Otimizar imagens do site**.
5. Quando possivel, use foto real do produto tirada com celular, fundo claro e luz natural.

## Comandos uteis

Se o terminal nao reconhecer `python`, feche e abra o VS Code de novo. No seu terminal atual, `python` ja esta funcionando.

Gerar variacoes:

```powershell
python .\gerar_foto.py --object "generic unbranded cleaning product bottle, clean catalog packshot, pure white background, full product visible" --style studio --views front,three_quarter --count 4 --output-dir generated --base-name teste-produto --provider pollinations --model flux --width 900 --height 900
```

Gerar um produto do catalogo:

```powershell
python .\gerar_foto.py --catalog --products gas --provider pollinations --model flux --width 900 --height 900
```

Otimizar imagens existentes:

```powershell
python .\gerar_foto.py --optimize-assets
```

## Ordem de estudo

1. HTML semantico.
2. CSS responsivo.
3. JavaScript para carrinho, formularios e filtros.
4. Supabase Auth, tabelas, Storage e RLS.
5. Git, commits e publicacao no Netlify.
