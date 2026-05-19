# Monte Sinai

Site estático para venda local de água, gás e produtos de limpeza.

## Publicar no Netlify

1. Suba este projeto para um repositório Git.
2. No Netlify, escolha **Add new site > Import an existing project**.
3. Selecione o repositório.
4. Use as configurações detectadas pelo `netlify.toml`:
   - Build command: vazio
   - Publish directory: `.`
5. Publique o site.

## Antes de vender

- Configure WhatsApp e chave Pix no Painel do Lojista.
- Faça um pedido de teste com Pix, pagamento na entrega e WhatsApp.
- O login atual é local do navegador. Para autenticação real com servidor, integre um provedor como Supabase, Firebase, Auth0 ou backend próprio.

## Assets 3D

O projeto já inclui imagens 3D em `assets/hero`, `assets/brand` e `assets/produtos`. Para regerar banners e peças de divulgação locais, rode:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\generate-marketing-assets.ps1
```
