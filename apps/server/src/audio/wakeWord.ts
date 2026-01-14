/**
 * Wake Word Detector
 * Listens for "Hey Jarvis" or configured wake word using local Whisper
 */

import { EventEmitter } from 'events';
import { AudioRecorder } from './recorder.js';
import { SpeechTranscriber, WhisperModel } from '../speech/transcriber.js';
import { logger } from '../utils/logger.js';
import { playActivate } from '../utils/sounds.js';
import type { WakeWordResult, AudioBuffer } from '../core/types.js';

/**
 * Wake word variations to detect
 */
const WAKE_WORD_VARIATIONS = [
  'hey jarvis',
  'hey jarv',
  'hi jarvis',
  'hello jarvis',
  'ok jarvis',
  'okay jarvis',
  'jarvis',
  'hey travis', // Common misrecognition
  'hey jervis',
];

/**
 * Wake Word Detector configuration
 */
export interface WakeWordConfig {
  wakeWord: string;
  customVariations?: string[];
  sensitivity: number;          // 0-1, how strict the matching is
  listenDuration: number;       // How long to listen for wake word (ms)
  pauseBetweenListens: number;  // Pause between listen cycles (ms)
  model: WhisperModel;
}

const DEFAULT_CONFIG: WakeWordConfig = {
  wakeWord: 'jarvis',
  sensitivity: 0.6,
  listenDuration: 3000,
  pauseBetweenListens: 500,
  model: 'Xenova/whisper-tiny.en',
};

/**
 * Wake Word Detector class
 */
export class WakeWordDetector extends EventEmitter {
  private config: WakeWordConfig;
  private transcriber: SpeechTranscriber;
  private recorder: AudioRecorder;
  private isListening: boolean = false;
  private isProcessing: boolean = false;
  private listenLoop: NodeJS.Timeout | null = null;
  private variations: string[];

  constructor(config: Partial<WakeWordConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // Build wake word variations
    this.variations = this.buildVariations();
    
    // Initialize transcriber with small model for wake word (faster)
    this.transcriber = new SpeechTranscriber(this.config.model);
    
    // Initialize recorder
    this.recorder = new AudioRecorder(
      { sampleRate: 16000, channels: 1 },
      1500, // Shorter silence threshold for wake word
      200
    );
  }

  /**
   * Build list of wake word variations to detect
   */
  private buildVariations(): string[] {
    const variations = new Set<string>();
    
    // Add default variations
    WAKE_WORD_VARIATIONS.forEach(v => variations.add(v.toLowerCase()));
    
    // Add custom variations
    if (this.config.customVariations) {
      this.config.customVariations.forEach(v => variations.add(v.toLowerCase()));
    }
    
    // Add the configured wake word
    variations.add(this.config.wakeWord.toLowerCase());
    variations.add(`hey ${this.config.wakeWord.toLowerCase()}`);
    variations.add(`hi ${this.config.wakeWord.toLowerCase()}`);
    variations.add(`hello ${this.config.wakeWord.toLowerCase()}`);
    variations.add(`ok ${this.config.wakeWord.toLowerCase()}`);
    
    return Array.from(variations);
  }

  /**
   * Initialize the detector (load model)
   */
  async initialize(): Promise<void> {
    logger.info('Initializing wake word detector...');
    await this.transcriber.initialize();
    logger.success('Wake word detector ready');
  }

  /**
   * Start listening for wake word
   */
  async start(): Promise<void> {
    if (this.isListening) {
      logger.warn('Wake word detector already running');
      return;
    }

    // Ensure transcriber is initialized
    if (!this.transcriber.isReady()) {
      await this.initialize();
    }

    this.isListening = true;
    logger.info(`Listening for wake word: "${this.config.wakeWord}"`);
    logger.debug(`Variations: ${this.variations.join(', ')}`);

    // Start the listen loop
    this.startListenLoop();
  }

  /**
   * Stop listening for wake word
   */
  stop(): void {
    if (!this.isListening) return;

    this.isListening = false;
    
    if (this.listenLoop) {
      clearTimeout(this.listenLoop);
      this.listenLoop = null;
    }

    // Stop any ongoing recording
    if (this.recorder.getIsRecording()) {
      this.recorder.stop();
    }

    logger.info('Wake word detector stopped');
  }

  /**
   * Pause detection temporarily (while processing a command)
   */
  pause(): void {
    this.isProcessing = true;
    if (this.recorder.getIsRecording()) {
      this.recorder.stop();
    }
  }

  /**
   * Resume detection after processing
   */
  resume(): void {
    this.isProcessing = false;
  }

  /**
   * Main listen loop
   */
  private startListenLoop(): void {
    if (!this.isListening || this.isProcessing) {
      // Schedule next check
      this.listenLoop = setTimeout(
        () => this.startListenLoop(),
        this.config.pauseBetweenListens
      );
      return;
    }

    // Record audio for wake word detection
    this.recordAndCheck();
  }

  /**
   * Record a short audio clip and check for wake word
   */
  private async recordAndCheck(): Promise<void> {
    if (!this.isListening || this.isProcessing) return;

    try {
      // Record for a short duration
      const audioBuffer = await this.recordShort();
      
      if (!this.isListening || this.isProcessing) return;
      
      // Skip if no significant audio
      if (audioBuffer.data.length < 1000) {
        this.scheduleNextListen();
        return;
      }

      // Transcribe and check for wake word
      const result = await this.checkWakeWord(audioBuffer);
      
      if (result.detected) {
        logger.success(`Wake word detected: "${result.keyword}"`);
        
        // Play activation sound
        await playActivate();
        
        // Emit detection event
        this.emit('detected', result);
      } else {
        // Continue listening
        this.scheduleNextListen();
      }
    } catch (error) {
      logger.error('Wake word detection error:', error);
      this.scheduleNextListen();
    }
  }

  /**
   * Record a short audio clip
   */
  private recordShort(): Promise<AudioBuffer> {
    return new Promise((resolve) => {
      let resolved = false;
      
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          resolve(this.recorder.stop());
        }
      }, this.config.listenDuration);

      this.recorder.on('silence', () => {
        if (!resolved && this.recorder.getDuration() > 500) {
          resolved = true;
          clearTimeout(timeout);
          resolve(this.recorder.stop());
        }
      });

      this.recorder.start();
    });
  }

  /**
   * Check transcription for wake word
   */
  private async checkWakeWord(audioBuffer: AudioBuffer): Promise<WakeWordResult> {
    try {
      const transcription = await this.transcriber.transcribe(audioBuffer);
      const text = transcription.text.toLowerCase().trim();
      
      if (!text) {
        return { detected: false, keyword: '', confidence: 0, timestamp: new Date() };
      }

      logger.debug(`Heard: "${text}"`);

      // Check if any wake word variation is present
      for (const variation of this.variations) {
        if (this.matchWakeWord(text, variation)) {
          return {
            detected: true,
            keyword: variation,
            confidence: this.calculateConfidence(text, variation),
            timestamp: new Date(),
          };
        }
      }

      return { detected: false, keyword: '', confidence: 0, timestamp: new Date() };
    } catch (error) {
      logger.debug('Wake word check failed:', error);
      return { detected: false, keyword: '', confidence: 0, timestamp: new Date() };
    }
  }

  /**
   * Check if text matches wake word
   */
  private matchWakeWord(text: string, wakeWord: string): boolean {
    // Exact match
    if (text === wakeWord) return true;
    
    // Contains wake word
    if (text.includes(wakeWord)) return true;
    
    // Fuzzy match - check if most characters match
    const similarity = this.calculateSimilarity(text, wakeWord);
    return similarity >= this.config.sensitivity;
  }

  /**
   * Calculate string similarity (Levenshtein-based)
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    // Check if shorter string is contained in longer
    if (longer.includes(shorter)) {
      return shorter.length / longer.length + 0.3;
    }
    
    // Simple character overlap check
    let matches = 0;
    for (const char of shorter) {
      if (longer.includes(char)) matches++;
    }
    
    return matches / longer.length;
  }

  /**
   * Calculate detection confidence
   */
  private calculateConfidence(text: string, matched: string): number {
    if (text === matched) return 1.0;
    if (text.includes(matched)) return 0.9;
    return this.calculateSimilarity(text, matched);
  }

  /**
   * Schedule next listen cycle
   */
  private scheduleNextListen(): void {
    if (!this.isListening) return;
    
    this.listenLoop = setTimeout(
      () => this.startListenLoop(),
      this.config.pauseBetweenListens
    );
  }

  /**
   * Check if detector is running
   */
  getIsListening(): boolean {
    return this.isListening;
  }

  /**
   * Update wake word
   */
  setWakeWord(wakeWord: string): void {
    this.config.wakeWord = wakeWord;
    this.variations = this.buildVariations();
    logger.info(`Wake word updated to: "${wakeWord}"`);
  }
}

// Default export
export default WakeWordDetector;

