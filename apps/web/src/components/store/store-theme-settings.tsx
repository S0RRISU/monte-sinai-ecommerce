'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { Droplets, Flame, Gem, ShieldCheck } from 'lucide-react';

export type StoreTheme = 'classic' | 'premium' | 'fresh' | 'energy';

const storageKey = 'monte-sinai-store-theme';
const storeThemeEvent = 'monte-sinai-store-theme-change';

const storeThemes: Array<{
  value: StoreTheme;
  title: string;
  text: string;
  icon: typeof ShieldCheck;
  swatches: string[];
}> = [
  {
    value: 'classic',
    title: 'Clássico Monte Sinai',
    text: 'Azul forte, amarelo da marca e loja direta.',
    icon: ShieldCheck,
    swatches: ['#006cff', '#ffd32a', '#ffffff']
  },
  {
    value: 'premium',
    title: 'Premium Claro',
    text: 'Mais limpo, elegante e com contraste suave.',
    icon: Gem,
    swatches: ['#0a4fb8', '#f4c542', '#f7fbff']
  },
  {
    value: 'fresh',
    title: 'Água Fresh',
    text: 'Sensação de água, limpeza e frescor.',
    icon: Droplets,
    swatches: ['#00a7c8', '#2f80ed', '#ecfbff']
  },
  {
    value: 'energy',
    title: 'Energia Gás',
    text: 'Mais quente, forte e focado em entrega rápida.',
    icon: Flame,
    swatches: ['#003b91', '#ffbf1f', '#fff7df']
  }
];

export function readStoreTheme(): StoreTheme {
  if (typeof window === 'undefined') return 'classic';
  const savedTheme = window.localStorage.getItem(storageKey);
  return isStoreTheme(savedTheme) ? savedTheme : 'classic';
}

export function applyStoreTheme(theme: StoreTheme) {
  document.documentElement.dataset.storeTheme = theme;
}

export function StoreThemeSettings() {
  const selectedTheme = useSyncExternalStore<StoreTheme>(subscribeToStoreTheme, readStoreTheme, () => 'classic');

  useEffect(() => {
    applyStoreTheme(selectedTheme);
    window.localStorage.setItem(storageKey, selectedTheme);
  }, [selectedTheme]);

  function selectTheme(nextTheme: StoreTheme) {
    window.localStorage.setItem(storageKey, nextTheme);
    applyStoreTheme(nextTheme);
    window.dispatchEvent(new CustomEvent<StoreTheme>(storeThemeEvent, { detail: nextTheme }));
  }

  return (
    <div className="store-theme-grid" role="radiogroup" aria-label="Estilo visual da loja">
      {storeThemes.map((theme) => (
        <button
          key={theme.value}
          type="button"
          className={selectedTheme === theme.value ? 'is-selected' : ''}
          data-store-theme-option={theme.value}
          role="radio"
          aria-checked={selectedTheme === theme.value}
          onClick={() => selectTheme(theme.value)}
        >
          <span className="store-theme-icon">
            <theme.icon className="size-5" />
          </span>
          <span className="store-theme-copy">
            <strong>{theme.title}</strong>
            <small>{theme.text}</small>
          </span>
          <span className="store-theme-swatches" aria-hidden="true">
            {theme.swatches.map((color) => (
              <i key={color} style={{ background: color }} />
            ))}
          </span>
        </button>
      ))}
    </div>
  );
}

function isStoreTheme(value: string | null): value is StoreTheme {
  return value === 'classic' || value === 'premium' || value === 'fresh' || value === 'energy';
}

function subscribeToStoreTheme(callback: () => void) {
  window.addEventListener(storeThemeEvent, callback);
  return () => window.removeEventListener(storeThemeEvent, callback);
}
