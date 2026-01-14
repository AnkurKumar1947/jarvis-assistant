/**
 * Speech Module Index
 * Exports speech synthesis and transcription functionality
 */

// Synthesizer (TTS)
export { SpeechSynthesizer, synthesizer } from './synthesizer.js';

// Transcriber (STT)
export { SpeechTranscriber, getTranscriber, transcribeAudio } from './transcriber.js';
export type { WhisperModel } from './transcriber.js';

// Providers
export { PiperProvider, MacOSProvider } from './providers/index.js';

// Re-export types
export type { 
  TTSProvider, 
  TTSConfig, 
  VoiceInfo, 
  TTSProviderInterface 
} from '../core/types.js';
