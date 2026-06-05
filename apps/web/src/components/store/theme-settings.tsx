'use client';

import { useEffect, useState } from 'react';
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
  const [preference, setPreference] = useState<ThemePreference>(() => readThemePreference());

  useEffect(() => {
    applyThemePreference(preference);
    window.localStorage.setItem('monte-sinai-theme', preference);

    const onPreferenceChange = (event: Event) => {
      const customEvent = event as CustomEvent<ThemePreference>;
      if (customEvent.detail) setPreference(customEvent.detail);
    };
    window.addEventListener(themePreferenceEvent, onPreferenceChange);
    return () => window.removeEventListener(themePreferenceEvent, onPreferenceChange);
  }, [preference]);

  function selectPreference(nextPreference: ThemePreference) {
    setPreference(nextPreference);
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
