/**
 * Socket.io Event Types
 */

// Client to Server Events
export const CLIENT_EVENTS = {
  SEND_MESSAGE: 'send_message',
  START_LISTENING: 'start_listening',
  STOP_LISTENING: 'stop_listening',
  AUDIO_DATA: 'audio_data',
  GET_METRICS: 'get_metrics',
  GET_STATE: 'get_state',
  GET_HISTORY: 'get_history',
  CLEAR_HISTORY: 'clear_history',
} as const;

// Server to Client Events
export const SERVER_EVENTS = {
  MESSAGE: 'message',
  ASSISTANT_STATE: 'assistant_state',
  TRANSCRIPTION: 'transcription',
  METRICS_UPDATE: 'metrics_update',
  ERROR: 'error',
  CONNECTED: 'connected',
  HISTORY: 'history',
} as const;

export type ClientEventType = typeof CLIENT_EVENTS[keyof typeof CLIENT_EVENTS];
export type ServerEventType = typeof SERVER_EVENTS[keyof typeof SERVER_EVENTS];

