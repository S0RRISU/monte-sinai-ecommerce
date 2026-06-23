'use client';

import { CheckCircle2, Download, Share2, Smartphone, X } from 'lucide-react';
import { createContext, useContext, useEffect, useState } from 'react';

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

type StoreAppInstallContextValue = {
  install: () => Promise<void>;
  dismissFirstVisitPrompt: () => void;
  isInstalled: boolean;
  isIos: boolean;
  showFirstVisitPrompt: boolean;
  showInstructions: boolean;
};

const INSTALL_PROMPT_SEEN_KEY = 'monte-sinai-install-prompt-seen-v1';
const StoreAppInstallContext = createContext<StoreAppInstallContextValue | null>(null);

export function StoreAppInstallProvider({ children }: { children: React.ReactNode }) {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showFirstVisitPrompt, setShowFirstVisitPrompt] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const isIos = typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent);

  useEffect(() => {
    const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
    const installed = window.matchMedia('(display-mode: standalone)').matches || navigatorWithStandalone.standalone === true;
    const firstVisitTimer = window.setTimeout(() => {
      setIsInstalled(installed);
      if (!installed && window.localStorage.getItem(INSTALL_PROMPT_SEEN_KEY) !== '1') {
        setShowFirstVisitPrompt(true);
      }
    }, 900);

    const handleInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const handleInstalled = () => {
      window.localStorage.setItem(INSTALL_PROMPT_SEEN_KEY, '1');
      setInstallPrompt(null);
      setShowFirstVisitPrompt(false);
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
      window.clearTimeout(firstVisitTimer);
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
      window.removeEventListener('load', registerServiceWorker);
    };
  }, []);

  const dismissFirstVisitPrompt = () => {
    window.localStorage.setItem(INSTALL_PROMPT_SEEN_KEY, '1');
    setShowFirstVisitPrompt(false);
    setShowInstructions(false);
  };

  const install = async () => {
    if (isInstalled) return;

    if (!installPrompt) {
      setShowInstructions(true);
      return;
    }

    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    window.localStorage.setItem(INSTALL_PROMPT_SEEN_KEY, '1');
    setInstallPrompt(null);
    setShowFirstVisitPrompt(false);
    setShowInstructions(false);
    if (choice.outcome === 'accepted') setIsInstalled(true);
  };

  return (
    <StoreAppInstallContext.Provider
      value={{ install, dismissFirstVisitPrompt, isInstalled, isIos, showFirstVisitPrompt, showInstructions }}
    >
      {children}
    </StoreAppInstallContext.Provider>
  );
}

export function StoreFirstVisitInstall() {
  const { dismissFirstVisitPrompt, install, isInstalled, isIos, showFirstVisitPrompt, showInstructions } = useStoreAppInstall();

  if (isInstalled || !showFirstVisitPrompt) return null;

  return (
    <aside className="store-install-welcome" role="dialog" aria-label="Instalar aplicativo Monte Sinai">
      <button
        type="button"
        className="store-install-welcome-close"
        aria-label="Agora nao"
        onClick={dismissFirstVisitPrompt}
      >
        <X className="size-4" />
      </button>

      <span className="store-install-welcome-logo">
        <img src="/brand/icons/monte-sinai-icon-transparente-192.png" alt="" />
      </span>
      <div className="store-install-welcome-copy">
        <span>Aplicativo Monte Sinai</span>
        <strong>Instale a loja no seu celular.</strong>
        <p>Acesso rapido a compras e pedidos.</p>
      </div>
      <button type="button" className="store-install-welcome-action" onClick={install}>
        <Download className="size-4" />
        Instalar
      </button>

      {showInstructions ? (
        <p className="store-install-welcome-help" role="status">
          {isIos ? <Share2 className="size-4" /> : <Smartphone className="size-4" />}
          {isIos
            ? 'No Safari, toque em Compartilhar e depois em Adicionar a Tela de Inicio.'
            : 'No menu do navegador, escolha Instalar aplicativo ou Adicionar a tela inicial.'}
        </p>
      ) : null}
    </aside>
  );
}

export function StoreAppInstall() {
  const { install, isInstalled, isIos, showInstructions } = useStoreAppInstall();

  return (
    <div className="store-app-install">
      <button type="button" onClick={install} disabled={isInstalled}>
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

function useStoreAppInstall() {
  const context = useContext(StoreAppInstallContext);
  if (!context) throw new Error('StoreAppInstall precisa estar dentro de StoreAppInstallProvider.');
  return context;
}
