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

Depois de publicado, coloque a URL em `CONFIG.apps.adminUrl` no arquivo `js/config.js` da loja oficial.
