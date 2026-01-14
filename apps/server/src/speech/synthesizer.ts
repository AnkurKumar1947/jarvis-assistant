/**
 * Speech Synthesizer - Multi-provider Text-to-Speech
 * Supports Piper (neural) and macOS (native) TTS with auto-detection
 */

import { logger } from '../utils/logger.js';
import { PiperProvider } from './providers/piperProvider.js';
import { MacOSProvider } from './providers/macosProvider.js';
import type { 
  TTSProvider, 
  TTSConfig, 
  TTSProviderInterface, 
  VoiceInfo,
  SpeechOptions 
} from '../core/types.js';

/**
 * Speech Synthesizer class with multi-provider support
 */
export class SpeechSynthesizer {
  private provider: TTSProviderInterface | null = null;
  private currentProviderType: TTSProvider;
  private piperProvider: PiperProvider | null = null;
  private macosProvider: MacOSProvider | null = null;
  private enabled: boolean;
  private ttsConfig: TTSConfig;

  constructor(config?: Partial<TTSConfig>) {
    // Default config
    this.ttsConfig = {
      provider: config?.provider ?? 'auto',
      voice: config?.voice ?? 'en_GB-alan-medium',
      rate: config?.rate ?? 1.0,
      enabled: config?.enabled ?? true,
      piper: config?.piper ?? {
        voicesPath: './voices/piper',
        defaultVoice: 'en_GB-alan-medium',
      },
      macos: config?.macos ?? {
        defaultVoice: 'Samantha',
        defaultRate: 200,
      },
    };

    this.enabled = this.ttsConfig.enabled;
    this.currentProviderType = this.ttsConfig.provider;

    // Initialize providers
    this.initializeProviders();
  }

  /**
   * Initialize TTS providers
   */
  private initializeProviders(): void {
    // Initialize Piper provider
    try {
      this.piperProvider = new PiperProvider(
        this.ttsConfig.piper?.voicesPath,
        this.ttsConfig.piper?.defaultVoice
      );
    } catch (error) {
      logger.debug('Failed to initialize Piper provider:', error);
    }

    // Initialize macOS provider
    try {
      this.macosProvider = new MacOSProvider(
        this.ttsConfig.macos?.defaultVoice,
        this.ttsConfig.macos?.defaultRate
      );
    } catch (error) {
      logger.debug('Failed to initialize macOS provider:', error);
    }

    // Select active provider based on config
    this.selectProvider();
  }

  /**
   * Select the active provider based on configuration and availability
   */
  private selectProvider(): void {
    if (this.currentProviderType === 'auto') {
      // Auto-detect: prefer Piper if available, fallback to macOS
      if (this.piperProvider?.isAvailable) {
        this.provider = this.piperProvider;
        logger.info('🎙️ TTS Provider: Piper (neural voices)');
      } else if (this.macosProvider?.isAvailable) {
        this.provider = this.macosProvider;
        logger.info('🎙️ TTS Provider: macOS (native voices)');
      } else {
        this.provider = null;
        logger.warn('⚠️ No TTS provider available');
      }
    } else if (this.currentProviderType === 'piper') {
      if (this.piperProvider?.isAvailable) {
        this.provider = this.piperProvider;
        logger.info('🎙️ TTS Provider: Piper');
      } else {
        logger.warn('Piper requested but not available, falling back to macOS');
        this.provider = this.macosProvider?.isAvailable ? this.macosProvider : null;
      }
    } else if (this.currentProviderType === 'macos') {
      if (this.macosProvider?.isAvailable) {
        this.provider = this.macosProvider;
        logger.info('🎙️ TTS Provider: macOS');
      } else {
        logger.warn('macOS TTS requested but not available');
        this.provider = null;
      }
    }

    // Apply initial voice/rate settings
    if (this.provider) {
      this.applySettings();
    }
  }

  /**
   * Apply current settings to active provider
   */
  private applySettings(): void {
    if (!this.provider) return;

    // Apply voice setting
    if (this.ttsConfig.voice) {
      this.provider.setVoice(this.ttsConfig.voice);
    }

    // Apply rate setting (normalize for provider)
    if (this.ttsConfig.rate !== undefined) {
      if (this.provider.name === 'piper') {
        // Piper uses 0.5-2.0 scale
        this.provider.setRate(this.ttsConfig.rate);
      } else if (this.provider.name === 'macos') {
        // macOS uses WPM (words per minute), typically 150-300
        // Convert from normalized rate if needed
        const wpm = this.ttsConfig.rate <= 2.0 
          ? Math.round(this.ttsConfig.rate * 200)  // Normalize from 0.5-2.0 to 100-400
          : this.ttsConfig.rate;  // Already in WPM
        this.provider.setRate(wpm);
      }
    }
  }

  /**
   * Speak text using the active provider
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

    const providerName = this.provider.name;
    logger.info(`🔊 Speaking [${providerName}]: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
    
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
   * Set voice (provider-specific voice ID)
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
   * Set speaking rate
   * For Piper: 0.5-2.0 (1.0 = normal)
   * For macOS: 50-500 WPM (200 = normal)
   */
  setRate(rate: number): void {
    this.ttsConfig.rate = rate;
    
    if (this.provider) {
      if (this.provider.name === 'macos' && rate <= 2.0) {
        // Convert normalized rate to WPM for macOS
        this.provider.setRate(Math.round(rate * 200));
      } else {
        this.provider.setRate(rate);
      }
    }
    
    logger.debug(`Speaking rate set to: ${rate}`);
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
   * Get current provider type
   */
  getProvider(): TTSProvider {
    return this.provider?.name ?? 'auto';
  }

  /**
   * Get active provider name
   */
  getActiveProviderName(): string {
    return this.provider?.name ?? 'none';
  }

  /**
   * Check if a specific provider is available
   */
  isProviderAvailable(provider: TTSProvider): boolean {
    switch (provider) {
      case 'piper':
        return this.piperProvider?.isAvailable ?? false;
      case 'macos':
        return this.macosProvider?.isAvailable ?? false;
      case 'auto':
        return (this.piperProvider?.isAvailable || this.macosProvider?.isAvailable) ?? false;
      default:
        return false;
    }
  }

  /**
   * Switch to a different provider
   */
  setProvider(provider: TTSProvider): void {
    this.currentProviderType = provider;
    this.ttsConfig.provider = provider;
    this.selectProvider();
  }

  /**
   * Get list of available voices from all providers
   */
  async getAvailableVoices(): Promise<VoiceInfo[]> {
    const allVoices: VoiceInfo[] = [];

    // Get Piper voices
    if (this.piperProvider?.isAvailable) {
      const piperVoices = await this.piperProvider.getAvailableVoices();
      allVoices.push(...piperVoices);
    }

    // Get macOS voices
    if (this.macosProvider?.isAvailable) {
      const macosVoices = await this.macosProvider.getAvailableVoices();
      allVoices.push(...macosVoices);
    }

    return allVoices;
  }

  /**
   * Get voices from current provider only
   */
  async getCurrentProviderVoices(): Promise<VoiceInfo[]> {
    if (!this.provider) return [];
    return this.provider.getAvailableVoices();
  }

  /**
   * Get voices grouped by provider
   */
  async getVoicesByProvider(): Promise<Record<TTSProvider, VoiceInfo[]>> {
    const result: Record<TTSProvider, VoiceInfo[]> = {
      piper: [],
      macos: [],
      auto: [],
    };

    if (this.piperProvider?.isAvailable) {
      result.piper = await this.piperProvider.getAvailableVoices();
    }

    if (this.macosProvider?.isAvailable) {
      result.macos = await this.macosProvider.getAvailableVoices();
    }

    return result;
  }

  /**
   * Test a voice
   */
  async testVoice(voice: string, rate: number, text?: string): Promise<void> {
    // Stop any current speech
    await this.stop();

    // Determine which provider to use based on voice format
    const isPiperVoice = voice.match(/^[a-z]{2}_[A-Z]{2}-/);
    
    if (isPiperVoice && this.piperProvider?.isAvailable) {
      await this.piperProvider.testVoice(voice, rate, text);
    } else if (this.macosProvider?.isAvailable) {
      await this.macosProvider.testVoice(voice, rate, text);
    } else if (this.provider) {
      await this.provider.testVoice(voice, rate, text);
    }
  }

  /**
   * Get session info
   */
  getSessionInfo(): {
    provider: string;
    providerAvailable: boolean;
    voice: string;
    rate: number;
    enabled: boolean;
    piperAvailable: boolean;
    macosAvailable: boolean;
  } {
    return {
      provider: this.getActiveProviderName(),
      providerAvailable: this.provider !== null,
      voice: this.getVoice(),
      rate: this.getRate(),
      enabled: this.enabled,
      piperAvailable: this.piperProvider?.isAvailable ?? false,
      macosAvailable: this.macosProvider?.isAvailable ?? false,
    };
  }
}

// Default instance
export const synthesizer = new SpeechSynthesizer();

export default SpeechSynthesizer;
