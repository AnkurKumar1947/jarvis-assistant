/**
 * Speech Module Index
 * Exports speech synthesis and transcription functionality
 */

// Synthesizer (TTS - ElevenLabs)
export { SpeechSynthesizer, synthesizer } from './synthesizer.js';

// Transcriber (STT)
export { SpeechTranscriber, getTranscriber, transcribeAudio } from './transcriber.js';
export type { WhisperModel } from './transcriber.js';

// Provider
export { ElevenLabsProvider, ELEVENLABS_VOICES } from './providers/index.js';

// Re-export types
export type { 
  TTSConfig, 
  VoiceInfo, 
  TTSProviderInterface 
} from '../core/types.js';
