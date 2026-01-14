'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, Maximize2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CameraFeedProps {
  className?: string;
  onStreamChange?: (stream: MediaStream | null) => void;
}

export function CameraFeed({ className, onStreamChange }: CameraFeedProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isOn, setIsOn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  const startCamera = async () => {
    try {
      setError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode },
        audio: false,
      });
      setStream(mediaStream);
      setIsOn(true);
      onStreamChange?.(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error('Camera error:', err);
      setError('Camera access denied or not available');
      setIsOn(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      onStreamChange?.(null);
    }
    setIsOn(false);
  };

  const toggleCamera = () => {
    if (isOn) {
      stopCamera();
    } else {
      startCamera();
    }
  };

  const switchCamera = async () => {
    stopCamera();
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    // Will restart with new facing mode on next toggle
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className={cn('relative', className)}>
      {/* Video Container */}
      <div className="aspect-video bg-card rounded-xl overflow-hidden border border-border relative">
        {isOn && stream ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
            <CameraOff className="w-10 h-10 mb-2 opacity-40" />
            <span className="text-sm">Camera Off</span>
            {error && (
              <span className="text-xs text-destructive mt-2 text-center px-4">
                {error}
              </span>
            )}
          </div>
        )}
        
        {/* Status indicator */}
        {isOn && (
          <div className="absolute top-3 left-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <span className="text-xs text-white/80 bg-black/50 px-2 py-0.5 rounded">
              Live
            </span>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-2 mt-3">
        <Button
          variant={isOn ? 'default' : 'outline'}
          size="sm"
          onClick={toggleCamera}
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
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={switchCamera}
              title="Switch camera"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              title="Fullscreen"
            >
              <Maximize2 className="w-4 h-4" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

