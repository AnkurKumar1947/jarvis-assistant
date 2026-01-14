'use client';

import { useState } from 'react';
import { AssistantAvatar } from './AssistantAvatar';
import { StateIndicator } from './StateIndicator';
import { Waveform } from './Waveform';
import { ControlButtons } from './ControlButtons';
import { SettingsDialog } from '@/components/settings/SettingsDialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type AssistantState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'processing' | 'executing' | 'initializing';

interface AssistantViewProps {
  state?: AssistantState;
  onStateChange?: (state: AssistantState) => void;
  voice?: string;
  mode?: string;
  className?: string;
}

export function AssistantView({
  state: externalState,
  onStateChange,
  voice = 'Daniel',
  mode = 'Voice + Text',
  className,
}: AssistantViewProps) {
  const [internalState, setInternalState] = useState<AssistantState>('idle');
  const [isListening, setIsListening] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const state = externalState ?? internalState;

  const handleToggleListening = () => {
    const newListening = !isListening;
    setIsListening(newListening);
    const newState = newListening ? 'listening' : 'idle';
    setInternalState(newState);
    onStateChange?.(newState);
  };

  const handleToggleMute = () => {
    setIsMuted(!isMuted);
  };

  const getWaveformColor = () => {
    if (state === 'listening') return 'success';
    if (state === 'speaking') return 'primary';
    return 'primary';
  };

  return (
    <Card glass className={cn('h-full', className)}>
      <CardContent className="flex flex-col items-center justify-center p-6 h-full min-h-[500px]">
        {/* Avatar */}
        <div className="mb-8">
          <AssistantAvatar state={state} size="lg" />
        </div>

        {/* Waveform */}
        <div className="h-12 mb-6">
          <Waveform
            isActive={state === 'listening' || state === 'speaking'}
            color={getWaveformColor()}
          />
        </div>

        {/* State Indicator */}
        <div className="mb-8">
          <StateIndicator state={state} />
        </div>

        {/* Info Badges */}
        <div className="flex items-center gap-3 mb-8">
          <Badge variant="outline" className="text-xs">
            Voice: {voice}
          </Badge>
          <Badge variant="outline" className="text-xs">
            Mode: {mode}
          </Badge>
        </div>

        {/* Control Buttons */}
        <ControlButtons
          isListening={isListening}
          isMuted={isMuted}
          onToggleListening={handleToggleListening}
          onToggleMute={handleToggleMute}
          onOpenSettings={() => setSettingsOpen(true)}
        />

        {/* Settings Dialog */}
        <SettingsDialog 
          trigger={<span className="hidden" />}
        />
      </CardContent>
    </Card>
  );
}

