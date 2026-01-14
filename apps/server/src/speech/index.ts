/**
 * Speech Module Index
 * Exports speech synthesis and transcription functionality
 */

// Synthesizer (TTS - Piper)
export { SpeechSynthesizer, synthesizer } from './synthesizer.js';

// Transcriber (STT)
export { SpeechTranscriber, getTranscriber, transcribeAudio } from './transcriber.js';
export type { WhisperModel } from './transcriber.js';

// Providers
export { PiperProvider } from './providers/index.js';

// Re-export types
export type { 
  TTSConfig, 
  VoiceInfo, 
  TTSProviderInterface 
} from '../core/types.js';
