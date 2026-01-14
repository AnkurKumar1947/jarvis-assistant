/**
 * Application constants
 */

// Socket server URL
export const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

// Assistant states
export const ASSISTANT_STATES = {
  IDLE: 'idle',
  LISTENING: 'listening',
  THINKING: 'thinking',
  SPEAKING: 'speaking',
} as const;

// Theme options
export const THEMES = {
  DARK: 'dark',
  LIGHT: 'light',
  MIDNIGHT: 'midnight',
  CYBERPUNK: 'cyberpunk',
} as const;

// Voice options
export const VOICES = [
  { id: 'daniel', name: 'Daniel', description: 'British male (default)' },
  { id: 'samantha', name: 'Samantha', description: 'American female' },
  { id: 'alex', name: 'Alex', description: 'American male' },
  { id: 'karen', name: 'Karen', description: 'Australian female' },
  { id: 'moira', name: 'Moira', description: 'Irish female' },
] as const;

// Default settings
export const DEFAULT_SETTINGS = {
  voice: 'daniel',
  speechRate: 170,
  theme: THEMES.DARK,
  soundsEnabled: true,
  wakeWordEnabled: true,
};

// Socket events
export const SOCKET_EVENTS = {
  // Client -> Server
  SEND_MESSAGE: 'send_message',
  START_LISTENING: 'start_listening',
  STOP_LISTENING: 'stop_listening',
  AUDIO_DATA: 'audio_data',
  GET_METRICS: 'get_metrics',
  
  // Server -> Client
  MESSAGE: 'message',
  ASSISTANT_STATE: 'assistant_state',
  TRANSCRIPTION: 'transcription',
  METRICS_UPDATE: 'metrics_update',
  ERROR: 'error',
  
  // Connection
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  CONNECT_ERROR: 'connect_error',
} as const;

// Keyboard shortcuts
export const KEYBOARD_SHORTCUTS = {
  TOGGLE_LISTEN: 'Space',
  SEND_MESSAGE: 'Enter',
  TOGGLE_MUTE: 'KeyM',
  TOGGLE_CAMERA: 'KeyC',
  OPEN_SETTINGS: 'Comma',
} as const;

// Animation durations (in ms)
export const ANIMATION = {
  FAST: 150,
  NORMAL: 300,
  SLOW: 500,
} as const;

// Metrics refresh interval (in ms)
export const METRICS_REFRESH_INTERVAL = 2000;

// Maximum messages to keep in history
export const MAX_MESSAGES = 100;

