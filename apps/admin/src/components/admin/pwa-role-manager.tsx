'use client';

import { useEffect, useMemo, useState } from 'react';
import { Download, MonitorCog, ShieldCheck } from 'lucide-react';
import type { AdminRole } from '@/lib/types';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

type PwaRoleManagerProps = {
  role?: AdminRole;
};

function appInfo(role?: AdminRole) {
  const developer = role === 'developer';
  return {
    label: developer ? 'App Desenvolvedor' : 'App Administrador',
    roleName: developer ? 'developer' : 'admin',
    manifest: developer ? '/manifest-developer.webmanifest' : '/manifest-admin.webmanifest',
    themeColor: developer ? '#a855f7' : '#8b5cf6',
    Icon: developer ? MonitorCog : ShieldCheck
  };
}

function isStandalone() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches || Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);
}

function isLocalDevelopmentHost() {
  if (typeof window === 'undefined') return false;
  return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname === '::1';
}

async function clearLocalPwaState() {
  if (!isLocalDevelopmentHost()) return;

  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
  }

  if ('caches' in window) {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith('monte-sinai-admin-')).map((key) => caches.delete(key)));
  }
}

export function PwaRoleManager({ role }: PwaRoleManagerProps) {
  const info = useMemo(() => appInfo(role), [role]);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(() => isStandalone());

  useEffect(() => {
    const manifest = document.querySelector<HTMLLinkElement>('link[rel="manifest"]') || document.createElement('link');
    manifest.rel = 'manifest';
    manifest.href = info.manifest;
    document.head.appendChild(manifest);

    const theme = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]') || document.createElement('meta');
    theme.name = 'theme-color';
    theme.content = info.themeColor;
    document.head.appendChild(theme);

    document.documentElement.dataset.appRole = info.roleName;
    document.title = `${info.label} | Monte Sinai`;
  }, [info]);

  useEffect(() => {
    if (isLocalDevelopmentHost()) {
      void clearLocalPwaState();
    } else if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/admin-sw.js')
        .then((registration) => registration.update())
        .catch(() => undefined);
    }

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    }

    function handleInstalled() {
      setInstalled(true);
      setInstallPrompt(null);
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  async function installApp() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === 'accepted') setInstalled(true);
    setInstallPrompt(null);
  }

  if (installed || !installPrompt) return null;

  const Icon = info.Icon;

  return (
    <section className="admin-pwa-install mb-5 rounded-[22px] border border-[color:var(--admin-border)] bg-[color:var(--admin-card)] p-3 shadow-sm md:p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-blue-600/15 text-blue-500 md:size-11">
            <Icon className="size-5" />
          </span>
          <div>
            <h2 className="text-base font-black text-[color:var(--admin-text)]">{info.label}</h2>
            <p className="text-xs text-[color:var(--admin-muted)] md:text-sm">Instale este painel como PWA separado da loja oficial.</p>
          </div>
        </div>
        <button className="admin-button admin-button-primary" type="button" onClick={installApp}>
          <Download className="size-4" />
          Instalar
        </button>
      </div>
    </section>
  );
}
