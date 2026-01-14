'use client';

import { useTheme } from 'next-themes';
import { Sun, Moon, Monitor, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ThemeOption {
  value: string;
  icon: React.ElementType;
  label: string;
}

const themes: ThemeOption[] = [
  { value: 'dark', icon: Moon, label: 'Dark' },
  { value: 'light', icon: Sun, label: 'Light' },
  { value: 'midnight', icon: Monitor, label: 'Midnight' },
  { value: 'cyberpunk', icon: Sparkles, label: 'Cyberpunk' },
];

interface ThemeToggleProps {
  showLabels?: boolean;
  className?: string;
}

export function ThemeToggle({ showLabels = false, className }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();

  return (
    <div className={cn('flex items-center gap-1 p-1 rounded-lg bg-card border border-border', className)}>
      {themes.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          className={cn(
            'p-2 rounded-md transition-colors flex items-center gap-2',
            theme === value
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          )}
          title={label}
        >
          <Icon className="w-4 h-4" />
          {showLabels && <span className="text-xs">{label}</span>}
        </button>
      ))}
    </div>
  );
}

