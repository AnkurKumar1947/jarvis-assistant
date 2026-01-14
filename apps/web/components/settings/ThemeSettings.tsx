'use client';

import { useTheme } from 'next-themes';
import { Sun, Moon, Monitor, Sparkles, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ThemeOption {
  id: string;
  name: string;
  icon: React.ElementType;
  description: string;
  colors: {
    bg: string;
    primary: string;
    accent: string;
  };
}

const themes: ThemeOption[] = [
  {
    id: 'dark',
    name: 'Dark',
    icon: Moon,
    description: 'Easy on the eyes',
    colors: {
      bg: '#0a0a0f',
      primary: '#06b6d4',
      accent: '#1a1a2e',
    },
  },
  {
    id: 'light',
    name: 'Light',
    icon: Sun,
    description: 'Clean and bright',
    colors: {
      bg: '#ffffff',
      primary: '#0891b2',
      accent: '#f4f4f5',
    },
  },
  {
    id: 'midnight',
    name: 'Midnight',
    icon: Monitor,
    description: 'Deep blue tones',
    colors: {
      bg: '#0f172a',
      primary: '#3b82f6',
      accent: '#1e293b',
    },
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    icon: Sparkles,
    description: 'Neon vibes',
    colors: {
      bg: '#0d0d0d',
      primary: '#ff00ff',
      accent: '#1a0a2e',
    },
  },
];

export function ThemeSettings() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-1">Theme Settings</h3>
        <p className="text-sm text-muted-foreground">
          Choose your preferred appearance
        </p>
      </div>

      {/* Theme Grid */}
      <div className="grid grid-cols-2 gap-3">
        {themes.map((themeOption) => (
          <button
            key={themeOption.id}
            onClick={() => setTheme(themeOption.id)}
            className={cn(
              'relative p-4 rounded-xl border-2 text-left transition-all',
              theme === themeOption.id
                ? 'border-primary'
                : 'border-border hover:border-primary/50'
            )}
          >
            {/* Preview */}
            <div
              className="h-20 rounded-lg mb-3 overflow-hidden relative"
              style={{ backgroundColor: themeOption.colors.bg }}
            >
              {/* Mini UI preview */}
              <div className="absolute inset-2 flex gap-1">
                <div
                  className="w-1/4 rounded"
                  style={{ backgroundColor: themeOption.colors.accent }}
                />
                <div className="flex-1 flex flex-col gap-1">
                  <div
                    className="h-3 w-1/2 rounded"
                    style={{ backgroundColor: themeOption.colors.primary }}
                  />
                  <div
                    className="flex-1 rounded"
                    style={{ backgroundColor: themeOption.colors.accent }}
                  />
                </div>
                <div
                  className="w-1/4 rounded"
                  style={{ backgroundColor: themeOption.colors.accent }}
                />
              </div>
            </div>

            {/* Info */}
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <themeOption.icon className="h-4 w-4" />
                  <span className="font-medium text-sm">{themeOption.name}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {themeOption.description}
                </p>
              </div>
              {theme === themeOption.id && (
                <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                  <Check className="h-3 w-3 text-primary-foreground" />
                </div>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Color Preview */}
      <div className="space-y-3">
        <label className="text-sm font-medium">Current Colors</label>
        <div className="flex gap-2">
          <div className="flex-1 p-3 rounded-lg bg-background border border-border">
            <div className="text-xs text-muted-foreground mb-1">Background</div>
            <div className="h-8 rounded bg-background border border-border" />
          </div>
          <div className="flex-1 p-3 rounded-lg bg-background border border-border">
            <div className="text-xs text-muted-foreground mb-1">Primary</div>
            <div className="h-8 rounded bg-primary" />
          </div>
          <div className="flex-1 p-3 rounded-lg bg-background border border-border">
            <div className="text-xs text-muted-foreground mb-1">Card</div>
            <div className="h-8 rounded bg-card border border-border" />
          </div>
        </div>
      </div>

      {/* System Theme Note */}
      <div className="p-3 rounded-lg bg-muted/50 border border-border">
        <p className="text-xs text-muted-foreground">
          💡 Tip: The theme preference is saved locally and will persist across sessions.
        </p>
      </div>
    </div>
  );
}

