'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import {
  applyThemePreference,
  readThemePreference,
  themePreferenceEvent,
  type ThemePreference
} from './theme-toggle';

const options: Array<{ value: ThemePreference; label: string; icon: typeof Monitor }> = [
  { value: 'system', label: 'Sistema', icon: Monitor },
  { value: 'light', label: 'Claro', icon: Sun },
  { value: 'dark', label: 'Noite', icon: Moon }
];

export function ThemeSettings() {
  const preference = useSyncExternalStore<ThemePreference>(subscribeToThemePreference, readThemePreference, () => 'system');

  useEffect(() => {
    applyThemePreference(preference);
    window.localStorage.setItem('monte-sinai-theme', preference);
  }, [preference]);

  function selectPreference(nextPreference: ThemePreference) {
    window.localStorage.setItem('monte-sinai-theme', nextPreference);
    applyThemePreference(nextPreference);
    window.dispatchEvent(new CustomEvent<ThemePreference>(themePreferenceEvent, { detail: nextPreference }));
  }

  return (
    <div className="theme-segmented-control" role="radiogroup" aria-label="Tema do app">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={preference === option.value ? 'is-selected' : ''}
          role="radio"
          aria-label={option.label}
          aria-checked={preference === option.value}
          onClick={() => selectPreference(option.value)}
        >
          <option.icon className="size-4" />
          <span>{option.label}</span>
        </button>
      ))}
    </div>
  );
}

function subscribeToThemePreference(callback: () => void) {
  window.addEventListener(themePreferenceEvent, callback);
  return () => window.removeEventListener(themePreferenceEvent, callback);
}
