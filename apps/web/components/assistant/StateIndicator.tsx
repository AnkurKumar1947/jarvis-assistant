'use client';

import { cn } from '@/lib/utils';

type AssistantState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'processing' | 'executing' | 'initializing';

interface StateIndicatorProps {
  state: AssistantState;
  className?: string;
}

const stateLabels: Record<AssistantState, { label: string; color: string; dot: string }> = {
  idle: { label: 'Ready', color: 'text-muted-foreground', dot: 'bg-muted-foreground' },
  listening: { label: 'Listening...', color: 'text-success', dot: 'bg-success' },
  thinking: { label: 'Thinking...', color: 'text-warning', dot: 'bg-warning' },
  speaking: { label: 'Speaking...', color: 'text-primary', dot: 'bg-primary' },
  processing: { label: 'Processing...', color: 'text-warning', dot: 'bg-warning' },
  executing: { label: 'Executing...', color: 'text-cyan-400', dot: 'bg-cyan-400' },
  initializing: { label: 'Starting...', color: 'text-muted-foreground', dot: 'bg-muted-foreground' },
};

export function StateIndicator({ state, className }: StateIndicatorProps) {
  // Fallback to idle if state is unknown
  const config = stateLabels[state] || stateLabels.idle;

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span className={cn('w-2 h-2 rounded-full', config.dot, state !== 'idle' && 'animate-pulse')} />
      <span className={cn('text-sm font-medium uppercase tracking-wider', config.color)}>
        {config.label}
      </span>
    </div>
  );
}

