'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface WaveformProps {
  isActive: boolean;
  color?: 'primary' | 'success' | 'warning';
  bars?: number;
  className?: string;
}

const colorClasses = {
  primary: 'bg-primary',
  success: 'bg-success',
  warning: 'bg-warning',
};

export function Waveform({ 
  isActive, 
  color = 'primary', 
  bars = 5, 
  className 
}: WaveformProps) {
  if (!isActive) return null;

  return (
    <div className={cn('flex items-end justify-center gap-1 h-12', className)}>
      {Array.from({ length: bars }).map((_, i) => (
        <motion.div
          key={i}
          className={cn('w-2 rounded-full', colorClasses[color])}
          animate={{
            height: ['12px', '48px', '12px'],
          }}
          transition={{
            duration: 0.5,
            repeat: Infinity,
            delay: i * 0.1,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

