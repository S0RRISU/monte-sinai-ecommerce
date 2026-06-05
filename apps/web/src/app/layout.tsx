import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Monte Sinai',
  description: 'Água, gás e limpeza com entrega local.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'Monte Sinai',
    statusBarStyle: 'default'
  }
};

export const viewport: Viewport = {
  themeColor: '#003b91'
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var savedTheme = window.localStorage.getItem('monte-sinai-theme');
                var preference = savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system' ? savedTheme : 'system';
                var theme = preference === 'system'
                  ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
                  : preference;
                document.documentElement.dataset.themePreference = preference;
                document.documentElement.dataset.theme = theme;
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
