import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/admin/theme-provider';

export const metadata: Metadata = {
  title: 'Admin Monte Sinai',
  description: 'Painel administrativo Monte Sinai',
  manifest: '/manifest-admin.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'MS Admin',
    statusBarStyle: 'black-translucent'
  }
};

export const viewport: Viewport = {
  themeColor: '#8b5cf6'
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var preference = localStorage.getItem('monte-sinai-admin-theme') || 'dark';
                var resolved = preference === 'system'
                  ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
                  : preference;
                var lightPalette = localStorage.getItem('monte-sinai-admin-light-palette') || 'clean';
                var darkPalette = localStorage.getItem('monte-sinai-admin-dark-palette') || 'graphite';
                var activePalette = resolved === 'light' ? lightPalette : darkPalette;
                document.documentElement.dataset.theme = resolved;
                document.documentElement.dataset.adminPalette = activePalette;
                document.documentElement.dataset.adminLightPalette = lightPalette;
                document.documentElement.dataset.adminDarkPalette = darkPalette;
                document.documentElement.style.colorScheme = resolved;
                document.documentElement.classList.toggle('dark', resolved === 'dark');
              } catch (_) {}
            `
          }}
        />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
