/**
 * Speech Synthesizer - Piper TTS
 * High-quality neural text-to-speech using Piper
 */

import { logger } from '../utils/logger.js';
import { PiperProvider } from './providers/piperProvider.js';
import type { 
  TTSConfig, 
  TTSProviderInterface, 
  VoiceInfo,
} from '../core/types.js';

/**
 * Speech Synthesizer class using Piper TTS
 */
export class SpeechSynthesizer {
  private provider: TTSProviderInterface | null = null;
  private piperProvider: PiperProvider | null = null;
  private enabled: boolean;
  private ttsConfig: TTSConfig;

  constructor(config?: Partial<TTSConfig>) {
    // Default config
    this.ttsConfig = {
      voice: config?.voice ?? 'en_GB-alan-medium',
      rate: config?.rate ?? 1.0,
      enabled: config?.enabled ?? true,
      piper: config?.piper ?? {
        voicesPath: './voices/piper',
        defaultVoice: 'en_GB-alan-medium',
      },
    };

    this.enabled = this.ttsConfig.enabled;

    // Initialize Piper provider
    this.initializeProvider();
  }

  /**
   * Initialize Piper TTS provider
   */
  private initializeProvider(): void {
    try {
      this.piperProvider = new PiperProvider(
        this.ttsConfig.piper?.voicesPath,
        this.ttsConfig.piper?.defaultVoice
      );
      
      if (this.piperProvider.isAvailable) {
        this.provider = this.piperProvider;
        logger.info('🎙️ TTS Provider: Piper (neural voices)');
        this.applySettings();
      } else {
        this.provider = null;
        logger.warn('⚠️ Piper TTS not available - speech disabled');
        logger.warn('  Run "make voices" to download voice models');
      }
    } catch (error) {
      logger.error('Failed to initialize Piper provider:', error);
      this.provider = null;
    }
  }

  /**
   * Apply current settings to provider
   */
  private applySettings(): void {
    if (!this.provider) return;

    // Apply voice setting
    if (this.ttsConfig.voice) {
      this.provider.setVoice(this.ttsConfig.voice);
    }

    // Apply rate setting (Piper uses 0.5-2.0 scale)
    if (this.ttsConfig.rate !== undefined) {
      this.provider.setRate(this.ttsConfig.rate);
    }
  }

  /**
   * Speak text using Piper
   */
  async speak(text: string): Promise<void> {
    if (!this.enabled) {
      logger.debug('TTS disabled, skipping speech');
      return;
    }

    if (!text || text.trim().length === 0) {
      logger.debug('Empty text, skipping speech');
      return;
    }

    if (!this.provider) {
      logger.warn('No TTS provider available');
      return;
    }

    logger.info(`🔊 Speaking: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
    
    const startTime = Date.now();
    
    try {
      await this.provider.speak(text);
      const duration = Date.now() - startTime;
      logger.info(`🔊 Speech completed in ${duration}ms`);
    } catch (error) {
      logger.error('TTS error:', error);
      throw error;
    }
  }

  /**
   * Stop current speech
   */
  async stop(): Promise<void> {
    await this.provider?.stop();
  }

  /**
   * Check if currently speaking
   */
  isSpeaking(): boolean {
    return this.provider?.isSpeaking() ?? false;
  }

  /**
   * Set voice (Piper voice ID like "en_GB-alan-medium")
   */
  setVoice(voice: string): void {
    this.ttsConfig.voice = voice;
    this.provider?.setVoice(voice);
    logger.debug(`Voice set to: ${voice}`);
  }

  /**
   * Get current voice
   */
  getVoice(): string {
    return this.provider?.getVoice() ?? this.ttsConfig.voice;
  }

  /**
   * Set speaking rate (0.5-2.0, where 1.0 is normal)
   */
  setRate(rate: number): void {
    this.ttsConfig.rate = Math.max(0.5, Math.min(2.0, rate));
    this.provider?.setRate(this.ttsConfig.rate);
    logger.debug(`Speaking rate set to: ${this.ttsConfig.rate}`);
  }

  /**
   * Get current rate
   */
  getRate(): number {
    return this.provider?.getRate() ?? this.ttsConfig.rate;
  }

  /**
   * Enable/disable TTS
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.ttsConfig.enabled = enabled;
    logger.debug(`TTS ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Check if TTS is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Check if Piper is available
   */
  isAvailable(): boolean {
    return this.piperProvider?.isAvailable ?? false;
  }

  /**
   * Get active provider name
   */
  getActiveProviderName(): string {
    return this.provider?.name ?? 'none';
  }

  /**
   * Get list of available Piper voices
   */
  async getAvailableVoices(): Promise<VoiceInfo[]> {
    if (!this.piperProvider?.isAvailable) {
      return [];
    }
    return this.piperProvider.getAvailableVoices();
  }

  /**
   * Test a voice
   */
  async testVoice(voice: string, rate: number, text?: string): Promise<void> {
    await this.stop();
    
    if (this.piperProvider?.isAvailable) {
      await this.piperProvider.testVoice(voice, rate, text);
    } else {
      logger.warn('Cannot test voice - Piper not available');
    }
  }

  /**
   * Get session info
   */
  getSessionInfo(): {
    provider: string;
    available: boolean;
    voice: string;
    rate: number;
    enabled: boolean;
  } {
    return {
      provider: this.getActiveProviderName(),
      available: this.isAvailable(),
      voice: this.getVoice(),
      rate: this.getRate(),
      enabled: this.enabled,
    };
  }
}

// Default instance
export const synthesizer = new SpeechSynthesizer();

export default SpeechSynthesizer;
