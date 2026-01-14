/**
 * Speech Synthesizer - OpenAI TTS
 * High-quality cloud-based text-to-speech
 */

import { logger } from '../utils/logger.js';
import { OpenAIProvider } from './providers/openaiProvider.js';
import type { 
  TTSConfig, 
  VoiceInfo,
} from '../core/types.js';

/**
 * Speech Synthesizer class using OpenAI TTS
 */
export class SpeechSynthesizer {
  private provider: OpenAIProvider | null = null;
  private enabled: boolean;
  private ttsConfig: TTSConfig;

  constructor(config?: Partial<TTSConfig>) {
    // Default config
    this.ttsConfig = {
      voice: config?.voice ?? 'nova',
      rate: config?.rate ?? 1.0,
      enabled: config?.enabled ?? true,
      openai: config?.openai ?? {
        apiKey: process.env.OPENAI_API_KEY ?? '',
        model: 'tts-1',
        defaultVoice: 'nova',
      },
    };

    this.enabled = this.ttsConfig.enabled;

    // Initialize OpenAI provider
    this.initializeProvider();
  }

  /**
   * Initialize OpenAI TTS provider
   */
  private initializeProvider(): void {
    if (!this.ttsConfig.openai?.apiKey) {
      logger.warn('⚠️ OpenAI API key not configured - TTS disabled');
      logger.warn('  Set OPENAI_API_KEY in your .env file');
      this.provider = null;
      return;
    }

    try {
      this.provider = new OpenAIProvider({
        apiKey: this.ttsConfig.openai.apiKey,
        model: this.ttsConfig.openai.model,
        defaultVoice: this.ttsConfig.openai.defaultVoice,
      });

      if (this.provider.isAvailable) {
        logger.info('🎙️ TTS Provider: OpenAI (cloud)');
        this.applySettings();
      } else {
        logger.warn('⚠️ OpenAI TTS not available - check API key');
        this.provider = null;
      }
    } catch (error) {
      logger.error('Failed to initialize OpenAI provider:', error);
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

    // Apply rate setting
    if (this.ttsConfig.rate !== undefined) {
      this.provider.setRate(this.ttsConfig.rate);
    }
  }

  /**
   * Speak text using OpenAI TTS
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
      logger.warn('No TTS provider available - set OPENAI_API_KEY');
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
   * Set voice (alloy, echo, fable, onyx, nova, shimmer)
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
   * Set speaking rate (0.25-4.0, where 1.0 is normal)
   */
  setRate(rate: number): void {
    this.ttsConfig.rate = Math.max(0.25, Math.min(4.0, rate));
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
   * Check if OpenAI is available
   */
  isAvailable(): boolean {
    return this.provider?.isAvailable ?? false;
  }

  /**
   * Get active provider name
   */
  getActiveProviderName(): string {
    return this.provider?.name ?? 'none';
  }

  /**
   * Get list of available voices
   */
  async getAvailableVoices(): Promise<VoiceInfo[]> {
    if (!this.provider?.isAvailable) {
      return [];
    }
    return this.provider.getAvailableVoices();
  }

  /**
   * Test a voice
   */
  async testVoice(voice: string, rate: number, text?: string): Promise<void> {
    await this.stop();
    
    if (this.provider?.isAvailable) {
      await this.provider.testVoice(voice, rate, text);
    } else {
      logger.warn('Cannot test voice - OpenAI not available');
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
