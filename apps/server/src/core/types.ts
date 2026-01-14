/**
 * Core type definitions for Jarvis Assistant
 */

// ============================================================================
// Configuration Types
// ============================================================================

export interface AssistantConfig {
  assistant: {
    name: string;
    wakeWord: string;
    language: string;
  };
  ollama: {
    host: string;
    model: string;
    timeout: number;
  };
  tts: TTSConfig;
  audio: {
    sampleRate: number;
    channels: number;
    silenceThreshold: number;
    recordingTimeout: number;
  };
  logging: {
    level: LogLevel;
    showTimestamp: boolean;
    colorized: boolean;
  };
  commands: {
    enableSystem: boolean;
    enableApps: boolean;
    enableMedia: boolean;
    enableUtilities: boolean;
  };
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// ============================================================================
// TTS Provider Types (ElevenLabs)
// ============================================================================

/**
 * ElevenLabs voice names
 */
export type ElevenLabsVoice = 'rachel' | 'adam' | 'antoni' | 'elli' | 'josh' | 'arnold' | 'domi' | 'bella';

/**
 * ElevenLabs model options
 */
export type ElevenLabsModel = 'eleven_monolingual_v1' | 'eleven_multilingual_v2' | 'eleven_turbo_v2';

/**
 * TTS configuration (ElevenLabs)
 */
export interface TTSConfig {
  voice: string;
  rate: number;
  enabled: boolean;
  elevenlabs?: ElevenLabsConfig;
}

/**
 * ElevenLabs TTS specific configuration
 */
export interface ElevenLabsConfig {
  apiKey: string;
  voiceId: string;
  modelId: ElevenLabsModel;
  stability: number;        // 0-1, lower = more expressive
  similarityBoost: number;  // 0-1, higher = more consistent
}

/**
 * Voice information
 */
export interface VoiceInfo {
  id: string;
  name: string;
  language: string;
  country: string;
  gender: 'male' | 'female' | 'unknown';
  provider: 'elevenlabs';
  quality?: 'low' | 'medium' | 'high';
  description?: string;
}

/**
 * TTS Provider interface
 */
export interface TTSProviderInterface {
  readonly name: 'elevenlabs';
  readonly isAvailable: boolean;
  
  speak(text: string): Promise<void>;
  stop(): Promise<void>;
  isSpeaking(): boolean;
  
  setVoice(voice: string): void;
  getVoice(): string;
  setRate(rate: number): void;
  getRate(): number;
  
  getAvailableVoices(): Promise<VoiceInfo[]>;
  testVoice(voice: string, rate: number, text?: string): Promise<void>;
}

// ============================================================================
// State Management Types
// ============================================================================

/**
 * Possible states of the assistant
 */
export type AssistantState =
  | 'initializing'  // Starting up, loading modules
  | 'idle'          // Waiting for wake word
  | 'listening'     // Recording user speech
  | 'processing'    // Converting speech to text
  | 'thinking'      // LLM is generating response
  | 'executing'     // Running a command
  | 'speaking'      // TTS is playing
  | 'error'         // Error state
  | 'shutdown';     // Shutting down

/**
 * Event emitted when state changes
 */
export interface StateChangeEvent {
  previousState: AssistantState;
  currentState: AssistantState;
  timestamp: Date;
  data?: unknown;
}

// ============================================================================
// Conversation Types
// ============================================================================

/**
 * A single message in the conversation
 */
export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    intent?: string;
    confidence?: number;
    processingTime?: number;
  };
}

/**
 * Conversation context passed to commands and LLM
 */
export interface ConversationContext {
  messages: ConversationMessage[];
  sessionId: string;
  startTime: Date;
  lastInteraction: Date;
  metadata: Record<string, unknown>;
}

// ============================================================================
// Command Types
// ============================================================================

/**
 * Arguments passed to command executor
 */
export interface CommandArgs {
  raw: string;                           // Original transcribed text
  normalized: string;                    // Lowercase, trimmed text
  matches: RegExpMatchArray | null;      // Regex matches if pattern matched
  entities: Record<string, string>;      // Extracted entities (numbers, names, etc.)
  context: ConversationContext;          // Conversation context
}

/**
 * Result returned from command execution
 */
export interface CommandResult {
  success: boolean;
  response: string;                      // Text response to speak
  shouldSpeak: boolean;                  // Whether to speak the response
  action?: string;                       // Action that was taken
  data?: unknown;                        // Additional data
  error?: Error;                         // Error if failed
  followUp?: {                           // Optional follow-up action
    prompt: string;
    timeout: number;
  };
}

/**
 * Command definition
 */
export interface Command {
  name: string;
  description: string;
  category: CommandCategory;
  patterns: RegExp[];                    // Patterns to match
  examples: string[];                    // Example phrases
  execute: (args: CommandArgs) => Promise<CommandResult>;
}

export type CommandCategory = 'system' | 'apps' | 'media' | 'utilities' | 'conversation';

// ============================================================================
// Intent Types
// ============================================================================

/**
 * Parsed intent from user input
 */
export interface ParsedIntent {
  intent: string;                        // e.g., "system.volume", "apps.open"
  confidence: number;                    // 0-1 confidence score
  entities: Record<string, EntityValue>; // Extracted entities
  raw: string;                           // Original text
}

export interface EntityValue {
  value: string | number;
  type: 'string' | 'number' | 'app' | 'time' | 'date' | 'percentage';
  confidence: number;
}

// ============================================================================
// Speech Types
// ============================================================================

/**
 * Result from speech-to-text transcription
 */
export interface TranscriptionResult {
  text: string;
  confidence: number;
  language: string;
  duration: number;                      // Audio duration in ms
  processingTime: number;                // Time to transcribe in ms
  words?: TranscribedWord[];             // Individual word timings
}

export interface TranscribedWord {
  word: string;
  start: number;                         // Start time in ms
  end: number;                           // End time in ms
  confidence: number;
}

/**
 * Options for text-to-speech
 */
export interface SpeechOptions {
  voice?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
}

// ============================================================================
// Audio Types
// ============================================================================

/**
 * Audio recording options
 */
export interface RecordingOptions {
  sampleRate: number;
  channels: number;
  encoding: 'signed-integer' | 'unsigned-integer' | 'floating-point';
  bitDepth: 16 | 24 | 32;
}

/**
 * Audio buffer with metadata
 */
export interface AudioBuffer {
  data: Buffer;
  sampleRate: number;
  channels: number;
  duration: number;                      // Duration in ms
  format: string;
}

/**
 * Wake word detection result
 */
export interface WakeWordResult {
  detected: boolean;
  keyword: string;
  confidence: number;
  timestamp: Date;
}

// ============================================================================
// LLM Types
// ============================================================================

/**
 * Message format for LLM
 */
export interface LLMMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/**
 * Options for LLM request
 */
export interface LLMRequestOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  systemPrompt?: string;
}

/**
 * Response from LLM
 */
export interface LLMResponse {
  content: string;
  model: string;
  finishReason: 'stop' | 'length' | 'error';
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  processingTime: number;
}

// ============================================================================
// Event Types
// ============================================================================

/**
 * Events emitted by the assistant
 */
export type AssistantEventType =
  | 'stateChange'
  | 'wakeWordDetected'
  | 'recordingStarted'
  | 'recordingEnded'
  | 'transcriptionComplete'
  | 'responseGenerated'
  | 'commandExecuted'
  | 'speechStarted'
  | 'speechEnded'
  | 'error';

export interface AssistantEvent<T = unknown> {
  type: AssistantEventType;
  timestamp: Date;
  data: T;
}

/**
 * Event handler type
 */
export type EventHandler<T = unknown> = (event: AssistantEvent<T>) => void;

// ============================================================================
// Error Types
// ============================================================================

/**
 * Custom error for assistant
 */
export class AssistantError extends Error {
  constructor(
    message: string,
    public code: ErrorCode,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AssistantError';
  }
}

export type ErrorCode =
  | 'INITIALIZATION_FAILED'
  | 'AUDIO_ERROR'
  | 'TRANSCRIPTION_ERROR'
  | 'LLM_ERROR'
  | 'COMMAND_ERROR'
  | 'TTS_ERROR'
  | 'CONFIG_ERROR'
  | 'UNKNOWN_ERROR';

// ============================================================================
// System Metrics Types (Web specific)
// ============================================================================

/**
 * Simple flat metrics structure used by the metrics service
 * This format is consumed directly by the frontend
 */
export interface SystemMetrics {
  cpu: number;           // CPU usage percentage (0-100)
  ram: number;           // RAM usage percentage (0-100)
  disk: number;          // Disk usage percentage (0-100)
  battery: number;       // Battery level (0-100)
  isCharging: boolean;   // Whether device is charging
  isOnline: boolean;     // Network connectivity status
  uptime: number;        // Process uptime in seconds
}

/**
 * Detailed metrics structure (for future use)
 */
export interface DetailedSystemMetrics {
  cpu: {
    usage: number;
    temperature?: number;
    cores: number;
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  disk: {
    used: number;
    total: number;
    percentage: number;
  };
  battery?: {
    level: number;
    charging: boolean;
    timeRemaining?: number;
  };
  timestamp: Date;
}

// ============================================================================
// Socket Event Types (Web specific)
// ============================================================================

export interface SocketMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface SocketStateUpdate {
  state: AssistantState;
  message?: string;
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Make all properties optional recursively
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Async function result wrapper
 */
export type AsyncResult<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

/**
 * Cleanup function type
 */
export type CleanupFn = () => void | Promise<void>;
