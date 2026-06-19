# Monte Sinai Admin PWA

Painel novo em Next.js para ser publicado como app separado da loja oficial.

## PWAs do projeto

- Loja oficial: raiz do repositorio, `site.webmanifest`, `sw.js`.
- Administrador: `apps/admin/public/manifest-admin.webmanifest`.
- Desenvolvedor: `apps/admin/public/manifest-developer.webmanifest`.

O app escolhe o manifest correto depois do login:

- `admin` instala o App Administrador.
- `developer` instala o App Desenvolvedor.

## Deploy

Publique `apps/admin` como um segundo site/app no Netlify.

- Base directory: `apps/admin`
- Build command: `npm run build`
- Publish directory: `.next`

Depois de publicado, configure `NEXT_PUBLIC_STORE_URL` no painel e `NEXT_PUBLIC_ADMIN_URL` na loja oficial.
