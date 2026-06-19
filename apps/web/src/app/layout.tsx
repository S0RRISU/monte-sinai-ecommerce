import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Monte Sinai',
  description: 'Agua, gas e limpeza com entrega local.',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/brand/icons/monte-sinai-icon-transparente-192.png', type: 'image/png', sizes: '192x192' },
      { url: '/brand/icons/monte-sinai-icon-transparente-512.png', type: 'image/png', sizes: '512x512' }
    ],
    shortcut: '/brand/icons/monte-sinai-icon-transparente-192.png',
    apple: '/brand/icons/monte-sinai-icon-transparente-192.png'
  },
  appleWebApp: {
    capable: true,
    title: 'Monte Sinai',
    statusBarStyle: 'default'
  }
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#00a8bd'
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var savedTheme = window.localStorage.getItem('monte-sinai-theme');
                var savedStoreTheme = window.localStorage.getItem('monte-sinai-store-theme');
                var preference = savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system' ? savedTheme : 'system';
                var storeTheme = savedStoreTheme === 'classic' || savedStoreTheme === 'premium' || savedStoreTheme === 'fresh' || savedStoreTheme === 'energy' ? savedStoreTheme : 'classic';
                var theme = preference === 'system'
                  ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
                  : preference;
                document.documentElement.dataset.themePreference = preference;
                document.documentElement.dataset.theme = theme;
                document.documentElement.dataset.storeTheme = storeTheme;
                document.documentElement.style.colorScheme = theme;
              } catch (_) {}
            `
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
