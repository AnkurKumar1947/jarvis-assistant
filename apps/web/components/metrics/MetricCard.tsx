'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  suffix?: string;
  color?: 'primary' | 'success' | 'warning' | 'destructive';
  showBar?: boolean;
  className?: string;
}

const colorClasses = {
  primary: {
    bar: 'from-primary to-primary/70',
    text: 'text-primary',
    bg: 'bg-primary/10',
  },
  success: {
    bar: 'from-success to-success/70',
    text: 'text-success',
    bg: 'bg-success/10',
  },
  warning: {
    bar: 'from-warning to-warning/70',
    text: 'text-warning',
    bg: 'bg-warning/10',
  },
  destructive: {
    bar: 'from-destructive to-destructive/70',
    text: 'text-destructive',
    bg: 'bg-destructive/10',
  },
};

export function MetricCard({
  label,
  value,
  icon,
  suffix = '%',
  color = 'primary',
  showBar = true,
  className,
}: MetricCardProps) {
  const colors = colorClasses[color];
  
  // Determine color based on value if using default
  const getAutoColor = () => {
    if (value >= 90) return colorClasses.destructive;
    if (value >= 70) return colorClasses.warning;
    return colorClasses.success;
  };
  
  const activeColors = color === 'primary' && showBar ? getAutoColor() : colors;

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground flex items-center gap-1.5">
          {icon}
          {label}
        </span>
        <span className="font-mono font-medium">
          {Math.round(value)}{suffix}
        </span>
      </div>
      
      {showBar && (
        <div className="h-2 bg-card rounded-full overflow-hidden">
          <motion.div
            className={cn(
              'h-full bg-gradient-to-r rounded-full',
              activeColors.bar
            )}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, Math.max(0, value))}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
      )}
    </div>
  );
}

