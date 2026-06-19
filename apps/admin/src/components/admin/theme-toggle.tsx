'use client';

import { Moon, Monitor, Sun } from 'lucide-react';
import { useTheme } from './theme-provider';

const themeOptions = [
  { value: 'light', Icon: Sun },
  { value: 'dark', Icon: Moon },
  { value: 'system', Icon: Monitor }
] as const;

export function ThemeToggle({ variant = 'full' }: { variant?: 'full' | 'compact' }) {
  const { theme, setTheme } = useTheme();
  const activeTheme = themeOptions.find((option) => option.value === theme) || themeOptions[1];
  const ActiveIcon = activeTheme.Icon;

  if (variant === 'compact') {
    function cycleTheme() {
      const currentIndex = themeOptions.findIndex((option) => option.value === theme);
      const next = themeOptions[(currentIndex + 1) % themeOptions.length] || themeOptions[0];
      setTheme(next.value);
    }

    return (
      <button type="button" className="theme-toggle-compact" aria-label={`Tema atual: ${theme}. Trocar tema`} onClick={cycleTheme}>
        <ActiveIcon className="size-4" />
      </button>
    );
  }

  return (
    <div className="theme-toggle-control inline-flex rounded-2xl border border-white/10 bg-white/5 p-1">
      {themeOptions.map(({ value, Icon }) => (
        <button
          key={value}
          type="button"
          aria-label={`Tema ${value}`}
          className={`theme-toggle-option ${theme === value ? 'is-active' : ''}`}
          onClick={() => setTheme(value)}
        >
          <Icon className="size-4" />
        </button>
      ))}
    </div>
  );
}
