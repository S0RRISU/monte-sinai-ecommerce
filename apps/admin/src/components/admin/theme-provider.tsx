'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type Theme = 'light' | 'dark' | 'system';
export type AdminLightPalette =
  | 'clean'
  | 'gray'
  | 'mist'
  | 'mint'
  | 'sky'
  | 'rose'
  | 'contrast'
  | 'color';
export type AdminDarkPalette =
  | 'black'
  | 'graphite'
  | 'soft'
  | 'forest'
  | 'ocean'
  | 'wine'
  | 'neon'
  | 'sunset';

const lightPalettes: AdminLightPalette[] = ['clean', 'gray', 'mist', 'mint', 'sky', 'rose', 'contrast', 'color'];
const darkPalettes: AdminDarkPalette[] = ['black', 'graphite', 'soft', 'forest', 'ocean', 'wine', 'neon', 'sunset'];

const ThemeContext = createContext<{
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
  lightPalette: AdminLightPalette;
  setLightPalette: (palette: AdminLightPalette) => void;
  darkPalette: AdminDarkPalette;
  setDarkPalette: (palette: AdminDarkPalette) => void;
}>({
  theme: 'dark',
  resolvedTheme: 'dark',
  setTheme: () => undefined,
  lightPalette: 'clean',
  setLightPalette: () => undefined,
  darkPalette: 'graphite',
  setDarkPalette: () => undefined
});

function readTheme(): Theme {
  if (typeof window === 'undefined') return 'dark';
  const value = localStorage.getItem('monte-sinai-admin-theme');
  return value === 'light' || value === 'dark' || value === 'system' ? value : 'dark';
}

function readLightPalette(): AdminLightPalette {
  if (typeof window === 'undefined') return 'clean';
  const value = localStorage.getItem('monte-sinai-admin-light-palette');
  return lightPalettes.includes(value as AdminLightPalette) ? (value as AdminLightPalette) : 'clean';
}

function readDarkPalette(): AdminDarkPalette {
  if (typeof window === 'undefined') return 'graphite';
  const value = localStorage.getItem('monte-sinai-admin-dark-palette');
  if (darkPalettes.includes(value as AdminDarkPalette)) return value as AdminDarkPalette;

  const legacy = localStorage.getItem('monte-sinai-admin-palette');
  const legacyMap: Record<string, AdminDarkPalette> = {
    sinai: 'forest',
    grafite: 'graphite',
    azul: 'ocean',
    vinho: 'wine',
    cobre: 'sunset'
  };
  return legacyMap[legacy || ''] || 'graphite';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readTheme);
  const [lightPalette, setLightPaletteState] = useState<AdminLightPalette>(readLightPalette);
  const [darkPalette, setDarkPaletteState] = useState<AdminDarkPalette>(readDarkPalette);
  const [systemDark, setSystemDark] = useState(() =>
    typeof window === 'undefined' ? true : window.matchMedia('(prefers-color-scheme: dark)').matches
  );
  const resolvedTheme = theme === 'system' ? (systemDark ? 'dark' : 'light') : theme;

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const syncSystemTheme = (event: MediaQueryListEvent) => setSystemDark(event.matches);
    media.addEventListener('change', syncSystemTheme);
    return () => media.removeEventListener('change', syncSystemTheme);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const activePalette = resolvedTheme === 'light' ? lightPalette : darkPalette;
    root.dataset.theme = resolvedTheme;
    root.dataset.adminPalette = activePalette;
    root.dataset.adminLightPalette = lightPalette;
    root.dataset.adminDarkPalette = darkPalette;
    root.classList.toggle('dark', resolvedTheme === 'dark');
    root.style.colorScheme = resolvedTheme;
    localStorage.setItem('monte-sinai-admin-theme', theme);
    localStorage.setItem('monte-sinai-admin-light-palette', lightPalette);
    localStorage.setItem('monte-sinai-admin-dark-palette', darkPalette);
  }, [darkPalette, lightPalette, resolvedTheme, theme]);

  const value = useMemo(
    () => ({
      theme,
      resolvedTheme,
      setTheme: setThemeState,
      lightPalette,
      setLightPalette: setLightPaletteState,
      darkPalette,
      setDarkPalette: setDarkPaletteState
    }),
    [darkPalette, lightPalette, resolvedTheme, theme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
