/**
 * OpenAI TTS Provider
 * High-quality cloud-based text-to-speech using OpenAI's TTS API
 * https://platform.openai.com/docs/guides/text-to-speech
 */

import { spawn, ChildProcess } from 'child_process';
import { writeFile, unlink } from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../utils/logger.js';
import type { TTSProviderInterface, VoiceInfo } from '../../core/types.js';

// OpenAI TTS voices
const OPENAI_VOICES = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'] as const;
type OpenAIVoice = typeof OPENAI_VOICES[number];

// OpenAI TTS models
type OpenAIModel = 'tts-1' | 'tts-1-hd';

interface OpenAIProviderConfig {
  apiKey: string;
  model?: OpenAIModel;
  defaultVoice?: OpenAIVoice;
}

/**
 * OpenAI TTS Provider class
 */
export class OpenAIProvider implements TTSProviderInterface {
  readonly name = 'openai' as const;
  private _isAvailable: boolean = false;
  private apiKey: string;
  private model: OpenAIModel;
  private currentVoice: OpenAIVoice;
  private currentRate: number;
  private currentProcess: ChildProcess | null = null;

  constructor(config: OpenAIProviderConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model ?? 'tts-1';
    this.currentVoice = config.defaultVoice ?? 'nova';
    this.currentRate = 1.0;

    // Check availability
    this._isAvailable = this.checkAvailability();
    
    if (this._isAvailable) {
      logger.success(`OpenAI TTS available (model: ${this.model}, voice: ${this.currentVoice})`);
    }
  }

  /**
   * Check if OpenAI TTS is available (API key present)
   */
  private checkAvailability(): boolean {
    if (!this.apiKey || this.apiKey.trim() === '' || this.apiKey === 'sk-proj-your-key-here') {
      logger.debug('OpenAI API key not configured');
      return false;
    }

    if (!this.apiKey.startsWith('sk-')) {
      logger.warn('OpenAI API key appears invalid (should start with sk-)');
      return false;
    }

    return true;
  }

  /**
   * Check if provider is available
   */
  get isAvailable(): boolean {
    return this._isAvailable;
  }

  /**
   * Speak text using OpenAI TTS
   */
  async speak(text: string): Promise<void> {
    if (!this._isAvailable) {
      throw new Error('OpenAI TTS not available - check API key');
    }

    if (!text || text.trim().length === 0) {
      return;
    }

    const tempFile = `/tmp/jarvis-openai-${uuidv4()}.mp3`;
    
    logger.debug(`OpenAI speaking: "${text.substring(0, 50)}..." (voice: ${this.currentVoice})`);

    const startTime = Date.now();

    try {
      // Call OpenAI TTS API
      const response = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          input: text,
          voice: this.currentVoice,
          speed: this.currentRate,
          response_format: 'mp3',
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `OpenAI TTS API error: ${response.status}`;
        
        // Parse and provide helpful error messages
        try {
          const errorJson = JSON.parse(errorText);
          const apiError = errorJson.error?.message || errorText;
          
          if (response.status === 401) {
            errorMessage = '❌ OpenAI API key is invalid. Check OPENAI_API_KEY in .env';
          } else if (response.status === 429) {
            errorMessage = '❌ OpenAI rate limit exceeded. Please wait and try again.';
          } else if (response.status === 402 || apiError.includes('quota') || apiError.includes('billing')) {
            errorMessage = '❌ OpenAI account has no credits. Add billing at platform.openai.com/settings/organization/billing';
            this._isAvailable = false; // Disable TTS to prevent repeated failures
          } else if (response.status === 500) {
            errorMessage = '❌ OpenAI server error. Try again later.';
          } else {
            errorMessage = `❌ OpenAI TTS error: ${apiError}`;
          }
        } catch {
          errorMessage = `❌ OpenAI TTS error: ${response.status} - ${errorText}`;
        }
        
        logger.error(errorMessage);
        throw new Error(errorMessage);
      }

      // Get audio buffer
      const audioBuffer = await response.arrayBuffer();
      const generationTime = Date.now() - startTime;
      logger.debug(`OpenAI TTS generation completed in ${generationTime}ms`);

      // Write to temp file
      await writeFile(tempFile, Buffer.from(audioBuffer));

      // Play the audio
      await this.playAudio(tempFile);

      const totalTime = Date.now() - startTime;
      logger.debug(`OpenAI speech completed in ${totalTime}ms`);

    } finally {
      // Cleanup temp file
      try {
        await unlink(tempFile);
      } catch {
        // Ignore cleanup errors
      }
    }
  }

  /**
   * Play audio file using system player
   */
  private async playAudio(filePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Use afplay on macOS, mpv/aplay on Linux
      const player = process.platform === 'darwin' ? 'afplay' : 'mpv';
      const args = process.platform === 'darwin' ? [filePath] : ['--no-video', filePath];
      
      const playProcess = spawn(player, args);
      this.currentProcess = playProcess;

      playProcess.on('close', (code) => {
        this.currentProcess = null;
        if (code === 0 || code === null) {
          resolve();
        } else {
          reject(new Error(`Audio player exited with code ${code}`));
        }
      });

      playProcess.on('error', (err) => {
        this.currentProcess = null;
        reject(err);
      });
    });
  }

  /**
   * Stop current speech
   */
  async stop(): Promise<void> {
    if (this.currentProcess) {
      this.currentProcess.kill('SIGTERM');
      this.currentProcess = null;
    }
  }

  /**
   * Check if currently speaking
   */
  isSpeaking(): boolean {
    return this.currentProcess !== null;
  }

  /**
   * Set current voice
   */
  setVoice(voice: string): void {
    if (OPENAI_VOICES.includes(voice as OpenAIVoice)) {
      this.currentVoice = voice as OpenAIVoice;
      logger.debug(`OpenAI voice set to: ${voice}`);
    } else {
      logger.warn(`Invalid OpenAI voice: ${voice}. Valid voices: ${OPENAI_VOICES.join(', ')}`);
    }
  }

  /**
   * Get current voice
   */
  getVoice(): string {
    return this.currentVoice;
  }

  /**
   * Set speaking rate (0.25 - 4.0, where 1.0 is normal)
   */
  setRate(rate: number): void {
    // OpenAI supports 0.25 to 4.0
    this.currentRate = Math.max(0.25, Math.min(4.0, rate));
    logger.debug(`OpenAI rate set to: ${this.currentRate}`);
  }

  /**
   * Get current rate
   */
  getRate(): number {
    return this.currentRate;
  }

  /**
   * Get list of available OpenAI voices
   */
  async getAvailableVoices(): Promise<VoiceInfo[]> {
    const voiceDescriptions: Record<OpenAIVoice, { gender: 'male' | 'female'; description: string }> = {
      alloy: { gender: 'female', description: 'Neutral and balanced' },
      echo: { gender: 'male', description: 'Warm and conversational' },
      fable: { gender: 'male', description: 'Expressive and dramatic' },
      onyx: { gender: 'male', description: 'Deep and authoritative' },
      nova: { gender: 'female', description: 'Friendly and upbeat' },
      shimmer: { gender: 'female', description: 'Clear and gentle' },
    };

    return OPENAI_VOICES.map(voice => ({
      id: voice,
      name: voice.charAt(0).toUpperCase() + voice.slice(1),
      language: 'en-US',
      country: 'United States',
      gender: voiceDescriptions[voice].gender,
      provider: 'openai' as const,
      quality: 'high' as const,
      description: voiceDescriptions[voice].description,
    }));
  }

  /**
   * Test a voice by speaking sample text
   */
  async testVoice(voice: string, rate: number, text?: string): Promise<void> {
    const originalVoice = this.currentVoice;
    const originalRate = this.currentRate;

    try {
      this.setVoice(voice);
      this.setRate(rate);

      const testText = text ?? `Hello, I am ${voice}. This is how I sound with OpenAI text to speech.`;
      await this.speak(testText);
    } finally {
      // Restore original settings
      this.currentVoice = originalVoice;
      this.currentRate = originalRate;
    }
  }
}

export default OpenAIProvider;
