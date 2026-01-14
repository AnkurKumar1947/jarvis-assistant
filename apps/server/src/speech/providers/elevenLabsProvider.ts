/**
 * ElevenLabs TTS Provider
 * High-quality cloud-based text-to-speech using ElevenLabs API
 * https://docs.elevenlabs.io/api-reference/text-to-speech
 * 
 * Free tier: 10,000 characters/month
 */

import { spawn, ChildProcess } from 'child_process';
import { writeFile, unlink } from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../utils/logger.js';
import type { TTSProviderInterface, VoiceInfo } from '../../core/types.js';

// ElevenLabs voice definitions
export const ELEVENLABS_VOICES = {
  rachel: { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', gender: 'female' as const, description: 'Calm, narrative' },
  adam: { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam', gender: 'male' as const, description: 'Deep, authoritative' },
  antoni: { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni', gender: 'male' as const, description: 'Warm, friendly' },
  elli: { id: 'MF3mGyEYCl7XYWbV9V6O', name: 'Elli', gender: 'female' as const, description: 'Young, cheerful' },
  josh: { id: 'TxGEqnHWrfWFTfGW9XjX', name: 'Josh', gender: 'male' as const, description: 'Energetic' },
  arnold: { id: 'VR6AewLTigWG4xSOukaG', name: 'Arnold', gender: 'male' as const, description: 'Crisp, clear' },
  domi: { id: 'AZnzlk1XvdvUeBnXmlld', name: 'Domi', gender: 'female' as const, description: 'Strong, confident' },
  bella: { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella', gender: 'female' as const, description: 'Soft, gentle' },
} as const;

export type ElevenLabsVoiceName = keyof typeof ELEVENLABS_VOICES;

interface ElevenLabsProviderConfig {
  apiKey: string;
  voiceId?: string;
  modelId?: string;
  stability?: number;
  similarityBoost?: number;
}

/**
 * ElevenLabs TTS Provider class
 */
export class ElevenLabsProvider implements TTSProviderInterface {
  readonly name = 'elevenlabs' as const;
  private _isAvailable: boolean = false;
  private apiKey: string;
  private modelId: string;
  private currentVoiceId: string;
  private currentVoiceName: string;
  private stability: number;
  private similarityBoost: number;
  private currentProcess: ChildProcess | null = null;

  constructor(config: ElevenLabsProviderConfig) {
    this.apiKey = config.apiKey;
    this.modelId = config.modelId ?? 'eleven_monolingual_v1';
    this.currentVoiceId = config.voiceId ?? ELEVENLABS_VOICES.adam.id; // Adam - deep authoritative voice
    this.currentVoiceName = this.getVoiceNameFromId(this.currentVoiceId);
    this.stability = config.stability ?? 0.5;
    this.similarityBoost = config.similarityBoost ?? 0.75;

    // Check availability
    this._isAvailable = this.checkAvailability();
    
    if (this._isAvailable) {
      logger.success(`ElevenLabs TTS available (voice: ${this.currentVoiceName})`);
    }
  }

  /**
   * Get voice name from ID
   */
  private getVoiceNameFromId(voiceId: string): string {
    for (const [name, voice] of Object.entries(ELEVENLABS_VOICES)) {
      if (voice.id === voiceId) {
        return voice.name;
      }
    }
    return 'Custom';
  }

  /**
   * Check if ElevenLabs TTS is available
   */
  private checkAvailability(): boolean {
    if (!this.apiKey || this.apiKey.trim() === '' || this.apiKey === 'your-elevenlabs-api-key') {
      logger.debug('ElevenLabs API key not configured');
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
   * Speak text using ElevenLabs TTS
   */
  async speak(text: string): Promise<void> {
    if (!this._isAvailable) {
      throw new Error('ElevenLabs TTS not available - check API key');
    }

    if (!text || text.trim().length === 0) {
      return;
    }

    const tempFile = `/tmp/jarvis-elevenlabs-${uuidv4()}.mp3`;
    
    logger.debug(`ElevenLabs speaking: "${text.substring(0, 50)}..." (voice: ${this.currentVoiceName})`);

    const startTime = Date.now();

    try {
      // Call ElevenLabs TTS API
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${this.currentVoiceId}`,
        {
          method: 'POST',
          headers: {
            'xi-api-key': this.apiKey,
            'Content-Type': 'application/json',
            'Accept': 'audio/mpeg',
          },
          body: JSON.stringify({
            text: text,
            model_id: this.modelId,
            voice_settings: {
              stability: this.stability,
              similarity_boost: this.similarityBoost,
            },
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `ElevenLabs TTS API error: ${response.status}`;
        
        try {
          const errorJson = JSON.parse(errorText);
          const detail = errorJson.detail?.message || errorJson.detail || errorText;
          
          if (response.status === 401) {
            errorMessage = '❌ ElevenLabs API key is invalid. Check ELEVENLABS_API_KEY in .env';
          } else if (response.status === 429) {
            errorMessage = '❌ ElevenLabs quota exceeded. Free tier: 10K chars/month.';
            this._isAvailable = false;
          } else if (response.status === 422) {
            errorMessage = `❌ ElevenLabs error: ${detail}`;
          } else {
            errorMessage = `❌ ElevenLabs error: ${detail}`;
          }
        } catch {
          errorMessage = `❌ ElevenLabs error: ${response.status} - ${errorText}`;
        }
        
        logger.error(errorMessage);
        throw new Error(errorMessage);
      }

      // Get audio buffer
      const audioBuffer = await response.arrayBuffer();
      const generationTime = Date.now() - startTime;
      logger.debug(`ElevenLabs TTS generation completed in ${generationTime}ms`);

      // Write to temp file
      await writeFile(tempFile, Buffer.from(audioBuffer));

      // Play the audio
      await this.playAudio(tempFile);

      const totalTime = Date.now() - startTime;
      logger.debug(`ElevenLabs speech completed in ${totalTime}ms`);

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
      // Use afplay on macOS, mpv on Linux
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
   * Set voice by name or ID
   */
  setVoice(voice: string): void {
    // Check if it's a voice name
    const voiceName = voice.toLowerCase() as ElevenLabsVoiceName;
    if (voiceName in ELEVENLABS_VOICES) {
      this.currentVoiceId = ELEVENLABS_VOICES[voiceName].id;
      this.currentVoiceName = ELEVENLABS_VOICES[voiceName].name;
      logger.debug(`ElevenLabs voice set to: ${this.currentVoiceName}`);
      return;
    }

    // Check if it's a voice ID
    for (const [name, v] of Object.entries(ELEVENLABS_VOICES)) {
      if (v.id === voice) {
        this.currentVoiceId = v.id;
        this.currentVoiceName = v.name;
        logger.debug(`ElevenLabs voice set to: ${this.currentVoiceName}`);
        return;
      }
    }

    // Assume it's a custom voice ID
    this.currentVoiceId = voice;
    this.currentVoiceName = 'Custom';
    logger.debug(`ElevenLabs voice set to custom ID: ${voice}`);
  }

  /**
   * Get current voice name
   */
  getVoice(): string {
    return this.currentVoiceName.toLowerCase();
  }

  /**
   * Set stability (0-1, lower = more expressive)
   */
  setRate(rate: number): void {
    // Map rate (0.5-2.0) to stability (0-1)
    // Higher rate = lower stability (more expressive/varied)
    this.stability = Math.max(0, Math.min(1, 1.5 - rate));
    logger.debug(`ElevenLabs stability set to: ${this.stability}`);
  }

  /**
   * Get current stability as rate
   */
  getRate(): number {
    return 1.5 - this.stability;
  }

  /**
   * Get available voices
   */
  async getAvailableVoices(): Promise<VoiceInfo[]> {
    return Object.entries(ELEVENLABS_VOICES).map(([key, voice]) => ({
      id: voice.id,
      name: voice.name,
      language: 'en-US',
      country: 'US',
      gender: voice.gender,
      provider: 'elevenlabs' as const,
      description: voice.description,
    }));
  }

  /**
   * Test a voice
   */
  async testVoice(voice: string, rate: number, text?: string): Promise<void> {
    const originalVoice = this.currentVoiceId;
    const originalStability = this.stability;

    try {
      this.setVoice(voice);
      this.setRate(rate);
      const testText = text ?? `Hello, I am ${this.currentVoiceName}. This is how I sound.`;
      await this.speak(testText);
    } finally {
      this.currentVoiceId = originalVoice;
      this.currentVoiceName = this.getVoiceNameFromId(originalVoice);
      this.stability = originalStability;
    }
  }
}
