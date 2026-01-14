'use client';

import { Mic, MicOff, Volume2, VolumeX, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ControlButtonsProps {
  isListening: boolean;
  isMuted: boolean;
  onToggleListening: () => void;
  onToggleMute: () => void;
  onOpenSettings: () => void;
  className?: string;
}

export function ControlButtons({
  isListening,
  isMuted,
  onToggleListening,
  onToggleMute,
  onOpenSettings,
  className,
}: ControlButtonsProps) {
  return (
    <div className={cn('flex items-center gap-4', className)}>
      {/* Listen Button */}
      <Button
        onClick={onToggleListening}
        size="iconLg"
        variant={isListening ? 'success' : 'outline'}
        className={cn(
          'transition-all duration-200',
          isListening && 'glow-success'
        )}
      >
        {isListening ? (
          <Mic className="w-6 h-6" />
        ) : (
          <MicOff className="w-6 h-6" />
        )}
      </Button>

      {/* Mute Button */}
      <Button
        onClick={onToggleMute}
        size="iconLg"
        variant={isMuted ? 'destructive' : 'outline'}
        className={cn(
          'transition-all duration-200',
          isMuted && 'bg-destructive/20 text-destructive hover:bg-destructive/30'
        )}
      >
        {isMuted ? (
          <VolumeX className="w-6 h-6" />
        ) : (
          <Volume2 className="w-6 h-6" />
        )}
      </Button>

      {/* Settings Button */}
      <Button
        onClick={onOpenSettings}
        size="iconLg"
        variant="outline"
      >
        <Settings className="w-6 h-6" />
      </Button>
    </div>
  );
}

