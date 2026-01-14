'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { SOCKET_URL, SOCKET_EVENTS } from '@/lib/constants';

interface UseSocketOptions {
  autoConnect?: boolean;
  reconnection?: boolean;
  reconnectionAttempts?: number;
}

interface UseSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
  emit: (event: string, data?: unknown) => void;
  on: (event: string, callback: (...args: unknown[]) => void) => void;
  off: (event: string, callback?: (...args: unknown[]) => void) => void;
}

export function useSocket(options: UseSocketOptions = {}): UseSocketReturn {
  const {
    autoConnect = true,
    reconnection = true,
    reconnectionAttempts = 5,
  } = options;

  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!autoConnect) return;

    const newSocket = io(SOCKET_URL, {
      reconnection,
      reconnectionAttempts,
      autoConnect: true,
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    newSocket.on(SOCKET_EVENTS.CONNECT, () => {
      console.log('Socket connected');
      setIsConnected(true);
    });

    newSocket.on(SOCKET_EVENTS.DISCONNECT, () => {
      console.log('Socket disconnected');
      setIsConnected(false);
    });

    newSocket.on(SOCKET_EVENTS.CONNECT_ERROR, (error) => {
      console.error('Socket connection error:', error);
      setIsConnected(false);
    });

    return () => {
      newSocket.disconnect();
      socketRef.current = null;
    };
  }, [autoConnect, reconnection, reconnectionAttempts]);

  const connect = useCallback(() => {
    socketRef.current?.connect();
  }, []);

  const disconnect = useCallback(() => {
    socketRef.current?.disconnect();
  }, []);

  const emit = useCallback((event: string, data?: unknown) => {
    socketRef.current?.emit(event, data);
  }, []);

  const on = useCallback((event: string, callback: (...args: unknown[]) => void) => {
    socketRef.current?.on(event, callback);
  }, []);

  const off = useCallback((event: string, callback?: (...args: unknown[]) => void) => {
    if (callback) {
      socketRef.current?.off(event, callback);
    } else {
      socketRef.current?.off(event);
    }
  }, []);

  return {
    socket,
    isConnected,
    connect,
    disconnect,
    emit,
    on,
    off,
  };
}

