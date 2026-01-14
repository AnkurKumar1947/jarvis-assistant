/**
 * Speech Transcriber - Speech-to-Text using local Whisper
 * Uses @xenova/transformers for local Whisper model inference
 */

import { pipeline, Pipeline } from '@xenova/transformers';
import { logger } from '../utils/logger.js';
import type { TranscriptionResult, AudioBuffer } from '../core/types.js';

// Available Whisper model sizes
export type WhisperModel = 
  | 'Xenova/whisper-tiny.en'      // ~40MB, English only, fastest
  | 'Xenova/whisper-base.en'      // ~75MB, English only
  | 'Xenova/whisper-small.en'     // ~250MB, English only
  | 'Xenova/whisper-tiny'         // ~40MB, multilingual
  | 'Xenova/whisper-base'         // ~75MB, multilingual
  | 'Xenova/whisper-small';       // ~250MB, multilingual

/**
 * Speech Transcriber class using local Whisper
 */
export class SpeechTranscriber {
  private model: WhisperModel;
  private transcriber: Pipeline | null = null;
  private isInitialized: boolean = false;
  private isInitializing: boolean = false;

  constructor(model: WhisperModel = 'Xenova/whisper-tiny.en') {
    this.model = model;
  }

  /**
   * Initialize the Whisper model (lazy loading)
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    if (this.isInitializing) {
      // Wait for initialization to complete
      while (this.isInitializing) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return;
    }

    this.isInitializing = true;
    logger.info(`Loading Whisper model: ${this.model}...`);
    logger.info('(This may take a minute on first run as the model downloads)');

    const startTime = Date.now();

    try {
      // Load the model
      this.transcriber = await pipeline(
        'automatic-speech-recognition',
        this.model,
        {
          // Progress callback for download
          progress_callback: (progress: { status: string; progress?: number }) => {
            if (progress.status === 'downloading' && progress.progress) {
              const percent = Math.round(progress.progress);
              if (percent % 20 === 0) {
                logger.debug(`Downloading model: ${percent}%`);
              }
            }
          },
        }
      );

      this.isInitialized = true;
      logger.timing('Model loaded', startTime);
      logger.success(`Whisper model ready: ${this.model}`);
    } catch (error) {
      logger.error('Failed to load Whisper model:', error);
      throw error;
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * Transcribe audio buffer to text
   */
  async transcribe(audioBuffer: AudioBuffer): Promise<TranscriptionResult> {
    // Ensure model is initialized
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.transcriber) {
      throw new Error('Transcriber not initialized');
    }

    if (audioBuffer.data.length === 0) {
      return {
        text: '',
        confidence: 0,
        language: 'en',
        duration: 0,
        processingTime: 0,
      };
    }

    const startTime = Date.now();
    logger.debug(`Transcribing ${audioBuffer.duration}ms of audio...`);

    try {
      // Convert raw audio buffer to Float32Array
      const float32Array = this.convertToFloat32(audioBuffer);

      // Run transcription
      const result = await this.transcriber(float32Array, {
        chunk_length_s: 30,
        stride_length_s: 5,
        language: 'english',
        task: 'transcribe',
        return_timestamps: false,
      });

      const processingTime = Date.now() - startTime;

      // Extract text from result
      const text = typeof result === 'string' 
        ? result 
        : (result as { text: string }).text || '';

      logger.timing('Transcription complete', startTime);
      logger.debug(`Transcribed: "${text}"`);

      return {
        text: text.trim(),
        confidence: 0.9, // Whisper doesn't provide confidence scores
        language: 'en',
        duration: audioBuffer.duration,
        processingTime,
      };
    } catch (error) {
      logger.error('Transcription error:', error);
      throw error;
    }
  }

  /**
   * Convert raw audio buffer to Float32Array for Whisper
   */
  private convertToFloat32(audioBuffer: AudioBuffer): Float32Array {
    const { data, sampleRate } = audioBuffer;
    
    // Read 16-bit PCM samples and normalize to [-1, 1]
    const samples = data.length / 2;
    const float32 = new Float32Array(samples);
    
    for (let i = 0; i < samples; i++) {
      const int16 = data.readInt16LE(i * 2);
      float32[i] = int16 / 32768.0;
    }

    // Resample to 16kHz if necessary (Whisper expects 16kHz)
    if (sampleRate !== 16000) {
      return this.resample(float32, sampleRate, 16000);
    }

    return float32;
  }

  /**
   * Simple linear resampling
   */
  private resample(
    input: Float32Array,
    fromRate: number,
    toRate: number
  ): Float32Array {
    if (fromRate === toRate) return input;

    const ratio = fromRate / toRate;
    const outputLength = Math.round(input.length / ratio);
    const output = new Float32Array(outputLength);

    for (let i = 0; i < outputLength; i++) {
      const srcIndex = i * ratio;
      const srcIndexFloor = Math.floor(srcIndex);
      const srcIndexCeil = Math.min(srcIndexFloor + 1, input.length - 1);
      const fraction = srcIndex - srcIndexFloor;
      
      output[i] = input[srcIndexFloor] * (1 - fraction) + input[srcIndexCeil] * fraction;
    }

    return output;
  }

  /**
   * Change the model
   */
  async setModel(model: WhisperModel): Promise<void> {
    if (model === this.model && this.isInitialized) {
      return;
    }

    this.model = model;
    this.isInitialized = false;
    this.transcriber = null;
    
    await this.initialize();
  }

  /**
   * Get current model
   */
  getModel(): WhisperModel {
    return this.model;
  }

  /**
   * Check if model is ready
   */
  isReady(): boolean {
    return this.isInitialized;
  }
}

// Default instance (lazy initialization)
let defaultTranscriber: SpeechTranscriber | null = null;

export function getTranscriber(model?: WhisperModel): SpeechTranscriber {
  if (!defaultTranscriber) {
    defaultTranscriber = new SpeechTranscriber(model);
  }
  return defaultTranscriber;
}

/**
 * Quick transcription function
 */
export async function transcribeAudio(
  audioBuffer: AudioBuffer,
  model?: WhisperModel
): Promise<TranscriptionResult> {
  const transcriber = getTranscriber(model);
  return transcriber.transcribe(audioBuffer);
}

// Default export
export default SpeechTranscriber;

