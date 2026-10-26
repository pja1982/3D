import { useState, useEffect, useCallback } from 'react';
import type { ThemeMode } from '../types';

function getSystemIsDark(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return Boolean(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  } catch (e) {
    return true; // Workshop default is dark
  }
}

export function useTheme(
  initialTheme?: ThemeMode,
  onPersistTheme?: (theme: ThemeMode) => void
) {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    if (initialTheme) return initialTheme;
    try {
      const stored = localStorage.getItem('app_theme');
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        return stored as ThemeMode;
      }
    } catch (e) {
      // Ignore localStorage errors
    }
    return 'dark'; // Dark default for the 3D print workshop
  });

  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'dark';
    if (theme === 'system') {
      return getSystemIsDark() ? 'dark' : 'light';
    }
    return theme;
  });

  const applyThemeToDOM = useCallback((targetTheme: ThemeMode) => {
    if (typeof document === 'undefined') return;
    try {
      const root = document.documentElement;
      const body = document.body;
      const isDark = targetTheme === 'system'
        ? getSystemIsDark()
        : targetTheme === 'dark';

      const resolved = isDark ? 'dark' : 'light';
      setResolvedTheme(resolved);

      if (isDark) {
        root.classList.add('dark');
        root.classList.remove('light');
        root.setAttribute('data-theme', 'dark');
        if (body) {
          body.classList.add('dark');
          body.classList.remove('light');
        }
        document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#0f172a');
      } else {
        root.classList.add('light');
        root.classList.remove('dark');
        root.setAttribute('data-theme', 'light');
        if (body) {
          body.classList.add('light');
          body.classList.remove('dark');
        }
        document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#f8fafc');
      }
    } catch (e) {
      // Ignore DOM theme errors
    }
  }, []);

  const setTheme = useCallback((newTheme: ThemeMode) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem('app_theme', newTheme);
    } catch (e) {
      // Ignore
    }
    applyThemeToDOM(newTheme);
    if (onPersistTheme) {
      try {
        onPersistTheme(newTheme);
      } catch (e) {
        // Ignore
      }
    }
  }, [applyThemeToDOM, onPersistTheme]);

  // Sync if initialTheme changes externally
  useEffect(() => {
    if (initialTheme && initialTheme !== theme) {
      setThemeState(initialTheme);
      try {
        localStorage.setItem('app_theme', initialTheme);
      } catch (e) {
        // Ignore
      }
      applyThemeToDOM(initialTheme);
    }
  }, [initialTheme, applyThemeToDOM]);

  // Apply on mount and handle system preference changes
  useEffect(() => {
    applyThemeToDOM(theme);

    if (typeof window === 'undefined' || !window.matchMedia) return;

    try {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      if (!mediaQuery) return;

      const handleChange = () => {
        if (theme === 'system') {
          applyThemeToDOM('system');
        }
      };

      if (typeof mediaQuery.addEventListener === 'function') {
        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
      } else if (typeof mediaQuery.addListener === 'function') {
        mediaQuery.addListener(handleChange);
        return () => mediaQuery.removeListener(handleChange);
      }
    } catch (e) {
      // Ignore matchMedia listener errors
    }
  }, [theme, applyThemeToDOM]);

  return { theme, setTheme, resolvedTheme };
}
