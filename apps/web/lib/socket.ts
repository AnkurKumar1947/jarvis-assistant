import { io, Socket } from 'socket.io-client';
import { SOCKET_URL, SOCKET_EVENTS } from './constants';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
    });

    // Connection handlers
    socket.on(SOCKET_EVENTS.CONNECT, () => {
      console.log('[Socket] Connected to server');
    });

    socket.on(SOCKET_EVENTS.DISCONNECT, (reason) => {
      console.log('[Socket] Disconnected:', reason);
    });

    socket.on(SOCKET_EVENTS.CONNECT_ERROR, (error) => {
      console.error('[Socket] Connection error:', error.message);
    });
  }

  return socket;
}

export function connectSocket(): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const s = getSocket();
    
    if (s.connected) {
      resolve(s);
      return;
    }

    const onConnect = () => {
      s.off('connect', onConnect);
      s.off('connect_error', onError);
      resolve(s);
    };

    const onError = (error: Error) => {
      s.off('connect', onConnect);
      s.off('connect_error', onError);
      reject(error);
    };

    s.on('connect', onConnect);
    s.on('connect_error', onError);
    s.connect();
  });
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
  }
}

export function isSocketConnected(): boolean {
  return socket?.connected ?? false;
}

// Type-safe event emitter
export function emitEvent<T>(event: string, data?: T): void {
  if (socket?.connected) {
    socket.emit(event, data);
  } else {
    console.warn('[Socket] Not connected, cannot emit event:', event);
  }
}

// Type-safe event listener
export function onEvent<T>(event: string, callback: (data: T) => void): () => void {
  const s = getSocket();
  s.on(event, callback);
  
  // Return unsubscribe function
  return () => {
    s.off(event, callback);
  };
}

export { socket, SOCKET_EVENTS };

