'use client';

import { CheckCircle2, Download, Share2 } from 'lucide-react';
import { useEffect, useState } from 'react';

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

export function StoreAppInstall() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const isIos = typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent);

  useEffect(() => {
    const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
    const installed = window.matchMedia('(display-mode: standalone)').matches || navigatorWithStandalone.standalone === true;
    const installedStateTimer = window.setTimeout(() => setIsInstalled(installed), 0);

    const handleInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const handleInstalled = () => {
      setInstallPrompt(null);
      setShowInstructions(false);
      setIsInstalled(true);
    };

    window.addEventListener('beforeinstallprompt', handleInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);

    const registerServiceWorker = () => {
      if ('serviceWorker' in navigator) {
        void navigator.serviceWorker.register('/store-sw.js').catch(() => undefined);
      }
    };

    if (document.readyState === 'complete') {
      registerServiceWorker();
    } else {
      window.addEventListener('load', registerServiceWorker, { once: true });
    }

    return () => {
      window.clearTimeout(installedStateTimer);
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
      window.removeEventListener('load', registerServiceWorker);
    };
  }, []);

  const handleInstall = async () => {
    if (isInstalled) return;

    if (!installPrompt) {
      setShowInstructions((current) => !current);
      return;
    }

    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      setInstallPrompt(null);
      setShowInstructions(false);
      setIsInstalled(true);
    }
  };

  return (
    <div className="store-app-install">
      <button type="button" onClick={handleInstall} disabled={isInstalled}>
        <span className="store-app-install-icon">
          {isInstalled ? <CheckCircle2 className="size-5" /> : <Download className="size-5" />}
        </span>
        <span>
          <strong>{isInstalled ? 'Aplicativo instalado' : 'Instalar aplicativo'}</strong>
          <small>{isInstalled ? 'A Monte Sinai ja esta neste aparelho.' : 'Acesse a loja direto pela tela inicial.'}</small>
        </span>
      </button>

      {showInstructions && !isInstalled ? (
        <p role="status">
          {isIos ? <Share2 className="size-4" /> : <Download className="size-4" />}
          {isIos
            ? 'No Safari, toque em Compartilhar e depois em Adicionar a Tela de Inicio.'
            : 'Abra o menu do navegador e escolha Instalar aplicativo ou Adicionar a tela inicial.'}
        </p>
      ) : null}
    </div>
  );
}
