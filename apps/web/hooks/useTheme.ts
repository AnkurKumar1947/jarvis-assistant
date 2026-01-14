'use client';

import { useTheme as useNextTheme } from 'next-themes';
import { useEffect, useState } from 'react';

type Theme = 'dark' | 'light' | 'midnight' | 'cyberpunk';

interface UseThemeReturn {
  theme: Theme | undefined;
  setTheme: (theme: Theme) => void;
  themes: Theme[];
  isDark: boolean;
  isLight: boolean;
  toggleTheme: () => void;
}

const THEMES: Theme[] = ['dark', 'light', 'midnight', 'cyberpunk'];

export function useTheme(): UseThemeReturn {
  const { theme, setTheme, systemTheme } = useNextTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentTheme = (mounted ? theme : 'dark') as Theme | undefined;
  const isDark = currentTheme === 'dark' || currentTheme === 'midnight' || currentTheme === 'cyberpunk';
  const isLight = currentTheme === 'light';

  const toggleTheme = () => {
    const currentIndex = THEMES.indexOf(currentTheme || 'dark');
    const nextIndex = (currentIndex + 1) % THEMES.length;
    setTheme(THEMES[nextIndex]);
  };

  return {
    theme: currentTheme,
    setTheme: setTheme as (theme: Theme) => void,
    themes: THEMES,
    isDark,
    isLight,
    toggleTheme,
  };
}

