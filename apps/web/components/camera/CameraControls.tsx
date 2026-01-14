'use client';

import { Camera, CameraOff, RotateCcw, Maximize2, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CameraControlsProps {
  isOn: boolean;
  onToggle: () => void;
  onSwitch?: () => void;
  onFullscreen?: () => void;
  onSettings?: () => void;
  className?: string;
}

export function CameraControls({
  isOn,
  onToggle,
  onSwitch,
  onFullscreen,
  onSettings,
  className,
}: CameraControlsProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Button
        variant={isOn ? 'default' : 'outline'}
        size="sm"
        onClick={onToggle}
        className={cn(
          'transition-all',
          isOn && 'bg-success hover:bg-success/90'
        )}
      >
        {isOn ? (
          <>
            <Camera className="w-4 h-4 mr-2" />
            On
          </>
        ) : (
          <>
            <CameraOff className="w-4 h-4 mr-2" />
            Off
          </>
        )}
      </Button>
      
      {isOn && (
        <>
          {onSwitch && (
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={onSwitch}
              title="Switch camera"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          )}
          
          {onFullscreen && (
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={onFullscreen}
              title="Fullscreen"
            >
              <Maximize2 className="w-4 h-4" />
            </Button>
          )}
          
          {onSettings && (
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={onSettings}
              title="Camera settings"
            >
              <Settings className="w-4 h-4" />
            </Button>
          )}
        </>
      )}
    </div>
  );
}

