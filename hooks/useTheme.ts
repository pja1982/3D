import { useState, useEffect, useCallback } from 'react';
import type { ThemeMode } from '../types';

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
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return theme;
  });

  const applyThemeToDOM = useCallback((targetTheme: ThemeMode) => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    const body = document.body;
    const isDark = targetTheme === 'system'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
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
      onPersistTheme(newTheme);
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

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme === 'system') {
        applyThemeToDOM('system');
      }
    };

    try {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } catch (e) {
      // Legacy fallback
      mediaQuery.addListener?.(handleChange);
      return () => mediaQuery.removeListener?.(handleChange);
    }
  }, [theme, applyThemeToDOM]);

  return { theme, setTheme, resolvedTheme };
}
