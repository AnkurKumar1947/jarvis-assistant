'use client';

import { motion } from 'framer-motion';
import { Bot, Mic, Brain, Volume2, Cog, Zap, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type AssistantState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'processing' | 'executing' | 'initializing';

interface AssistantAvatarProps {
  state: AssistantState;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'w-16 h-16',
  md: 'w-24 h-24',
  lg: 'w-32 h-32',
};

const iconSizes = {
  sm: 'w-8 h-8',
  md: 'w-12 h-12',
  lg: 'w-16 h-16',
};

const stateConfig: Record<AssistantState, {
  bgClass: string;
  iconClass: string;
  icon: typeof Bot;
  glow: boolean;
  glowClass?: string;
}> = {
  idle: {
    bgClass: 'bg-card border-2 border-border',
    iconClass: 'text-muted-foreground',
    icon: Bot,
    glow: false,
  },
  listening: {
    bgClass: 'bg-success/20 border-2 border-success',
    iconClass: 'text-success',
    icon: Mic,
    glow: true,
    glowClass: 'glow-success',
  },
  thinking: {
    bgClass: 'bg-warning/20 border-2 border-warning',
    iconClass: 'text-warning',
    icon: Brain,
    glow: true,
    glowClass: 'glow-warning',
  },
  speaking: {
    bgClass: 'bg-primary/20 border-2 border-primary',
    iconClass: 'text-primary',
    icon: Volume2,
    glow: true,
    glowClass: 'glow-primary',
  },
  processing: {
    bgClass: 'bg-warning/20 border-2 border-warning',
    iconClass: 'text-warning',
    icon: Loader2,
    glow: true,
    glowClass: 'glow-warning',
  },
  executing: {
    bgClass: 'bg-cyan-500/20 border-2 border-cyan-500',
    iconClass: 'text-cyan-400',
    icon: Zap,
    glow: true,
    glowClass: 'glow-primary',
  },
  initializing: {
    bgClass: 'bg-muted border-2 border-border',
    iconClass: 'text-muted-foreground',
    icon: Cog,
    glow: false,
  },
};

export function AssistantAvatar({ state, size = 'lg', className }: AssistantAvatarProps) {
  // Fallback to idle if state is unknown
  const config = stateConfig[state] || stateConfig.idle;
  const Icon = config.icon;

  return (
    <div className={cn('relative', className)}>
      {/* Pulse rings for listening state */}
      {state === 'listening' && (
        <>
          <div className="pulse-ring" />
          <div className="pulse-ring" style={{ animationDelay: '0.5s' }} />
        </>
      )}

      {/* Main avatar */}
      <motion.div
        className={cn(
          'rounded-full flex items-center justify-center transition-all duration-300',
          sizeClasses[size],
          config.bgClass,
          config.glow && config.glowClass
        )}
        animate={{
          scale: state === 'speaking' ? [1, 1.05, 1] : 1,
        }}
        transition={{
          duration: 0.5,
          repeat: state === 'speaking' ? Infinity : 0,
        }}
      >
        <motion.div
          animate={{
            rotate: (state === 'thinking' || state === 'processing' || state === 'initializing') ? 360 : 0,
          }}
          transition={{
            duration: 2,
            repeat: (state === 'thinking' || state === 'processing' || state === 'initializing') ? Infinity : 0,
            ease: 'linear',
          }}
        >
          <Icon className={cn(iconSizes[size], config.iconClass)} />
        </motion.div>
      </motion.div>
    </div>
  );
}

