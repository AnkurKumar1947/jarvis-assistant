'use client';

import { useEffect, useState, useCallback, useRef } from 'react';

interface UseCameraOptions {
  facingMode?: 'user' | 'environment';
  width?: number;
  height?: number;
}

interface UseCameraReturn {
  stream: MediaStream | null;
  isActive: boolean;
  error: string | null;
  start: () => Promise<void>;
  stop: () => void;
  switchCamera: () => Promise<void>;
  takeSnapshot: () => string | null;
}

export function useCamera(options: UseCameraOptions = {}): UseCameraReturn {
  const { 
    facingMode: initialFacingMode = 'user',
    width = 1280,
    height = 720,
  } = options;

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState(initialFacingMode);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const start = useCallback(async () => {
    try {
      setError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: width },
          height: { ideal: height },
        },
        audio: false,
      });
      setStream(mediaStream);
      setIsActive(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Camera access denied';
      setError(message);
      setIsActive(false);
      console.error('Camera error:', err);
    }
  }, [facingMode, width, height]);

  const stop = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsActive(false);
  }, [stream]);

  const switchCamera = useCallback(async () => {
    stop();
    const newFacingMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newFacingMode);
    
    // Wait for state update, then restart
    setTimeout(async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: newFacingMode,
            width: { ideal: width },
            height: { ideal: height },
          },
          audio: false,
        });
        setStream(mediaStream);
        setIsActive(true);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Camera switch failed';
        setError(message);
      }
    }, 100);
  }, [facingMode, stop, width, height]);

  const takeSnapshot = useCallback((): string | null => {
    if (!stream) return null;

    const video = document.createElement('video');
    video.srcObject = stream;
    video.play();

    const canvas = document.createElement('canvas');
    const track = stream.getVideoTracks()[0];
    const settings = track.getSettings();
    
    canvas.width = settings.width || width;
    canvas.height = settings.height || height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.9);
  }, [stream, width, height]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  return {
    stream,
    isActive,
    error,
    start,
    stop,
    switchCamera,
    takeSnapshot,
  };
}

