import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'dark' | 'light' | 'midnight' | 'cyberpunk';

interface ThemeStore {
  // State
  theme: Theme;
  accentColor: string;
  
  // Actions
  setTheme: (theme: Theme) => void;
  setAccentColor: (color: string) => void;
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      theme: 'dark',
      accentColor: '#06b6d4', // Cyan
      
      setTheme: (theme) => set({ theme }),
      setAccentColor: (accentColor) => set({ accentColor }),
    }),
    {
      name: 'jarvis-theme',
    }
  )
);

