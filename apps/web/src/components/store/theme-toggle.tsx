'use client';

import { useEffect, useState } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';

export type ThemePreference = 'system' | 'light' | 'dark';
type ResolvedTheme = 'light' | 'dark';

type ThemeToggleProps = {
  className?: string;
};

const storageKey = 'monte-sinai-theme';
export const themePreferenceEvent = 'monte-sinai-theme-change';

export function resolveTheme(preference: ThemePreference): ResolvedTheme {
  if (preference !== 'system') return preference;
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function readThemePreference(): ThemePreference {
  if (typeof window === 'undefined') return 'system';
  const savedTheme = window.localStorage.getItem(storageKey);
  return savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system' ? savedTheme : 'system';
}

export function applyThemePreference(preference: ThemePreference) {
  const theme = resolveTheme(preference);
  document.documentElement.dataset.themePreference = preference;
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const [preference, setPreference] = useState<ThemePreference>(() => readThemePreference());

  useEffect(() => {
    applyThemePreference(preference);
    window.localStorage.setItem(storageKey, preference);

    const onPreferenceChange = (event: Event) => {
      const customEvent = event as CustomEvent<ThemePreference>;
      if (customEvent.detail) setPreference(customEvent.detail);
    };
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const syncSystemTheme = () => {
      if (preference === 'system') applyThemePreference('system');
    };
    window.addEventListener(themePreferenceEvent, onPreferenceChange);
    media.addEventListener('change', syncSystemTheme);
    return () => {
      window.removeEventListener(themePreferenceEvent, onPreferenceChange);
      media.removeEventListener('change', syncSystemTheme);
    };
  }, [preference]);

  function toggleTheme() {
    const nextPreference: ThemePreference = preference === 'system' ? 'light' : preference === 'light' ? 'dark' : 'system';
    setPreference(nextPreference);
    window.dispatchEvent(new CustomEvent<ThemePreference>(themePreferenceEvent, { detail: nextPreference }));
  }

  const label = preference === 'system' ? 'Sistema' : preference === 'dark' ? 'Escuro' : 'Claro';
  const nextLabel = preference === 'system' ? 'claro' : preference === 'light' ? 'escuro' : 'sistema';

  return (
    <button
      className={`theme-toggle ${className || ''}`}
      type="button"
      onClick={toggleTheme}
      aria-label={`Modo atual: ${label}. Alterar para ${nextLabel}`}
      title={`Modo atual: ${label}`}
    >
      {preference === 'system' ? <Monitor className="size-5" /> : preference === 'dark' ? <Moon className="size-5" /> : <Sun className="size-5" />}
      <span>{label}</span>
    </button>
  );
}
