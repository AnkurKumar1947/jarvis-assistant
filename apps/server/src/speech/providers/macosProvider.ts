/**
 * macOS TTS Provider
 * Uses the native macOS 'say' command for text-to-speech
 */

import { spawn, ChildProcess, exec } from 'child_process';
import { promisify } from 'util';
import { logger } from '../../utils/logger.js';
import type { TTSProviderInterface, VoiceInfo } from '../../core/types.js';

const execAsync = promisify(exec);

// Track current speaking process
let currentSpeechProcess: ChildProcess | null = null;

// Known female voice names for gender detection
const FEMALE_VOICES = new Set([
  'Agnes', 'Allison', 'Ava', 'Fiona', 'Karen', 'Kate', 'Kathy',
  'Kyoko', 'Mei-Jia', 'Milena', 'Moira', 'Monica', 'Nicky',
  'Paulina', 'Samantha', 'Sara', 'Satu', 'Shelley', 'Sin-ji',
  'Tessa', 'Ting-Ting', 'Veena', 'Victoria', 'Yuna', 'Zosia',
]);

/**
 * macOS TTS Provider class
 */
export class MacOSProvider implements TTSProviderInterface {
  readonly name = 'macos' as const;
  private _isAvailable: boolean = false;
  private currentVoice: string;
  private currentRate: number;

  constructor(defaultVoice?: string, defaultRate?: number) {
    this.currentVoice = defaultVoice ?? 'Samantha';
    this.currentRate = defaultRate ?? 200;
    
    // Check availability on construction
    this.checkAvailability();
  }

  /**
   * Check if macOS TTS is available
   */
  get isAvailable(): boolean {
    return this._isAvailable;
  }

  /**
   * Check if we're on macOS and 'say' command is available
   */
  private async checkAvailability(): Promise<void> {
    if (process.platform !== 'darwin') {
      this._isAvailable = false;
      return;
    }

    try {
      await execAsync('which say');
      this._isAvailable = true;
      logger.debug('macOS TTS available');
    } catch {
      this._isAvailable = false;
      logger.debug('macOS TTS not available');
    }
  }

  /**
   * Speak text using macOS say command
   */
  async speak(text: string): Promise<void> {
    if (!this._isAvailable) {
      throw new Error('macOS TTS not available');
    }

    if (!text || text.trim().length === 0) {
      return;
    }

    logger.debug(`macOS speaking: "${text.substring(0, 50)}..." (voice: ${this.currentVoice}, rate: ${this.currentRate})`);

    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      // Sanitize text for shell
      const sanitizedText = text
        .replace(/"/g, '\\"')
        .replace(/`/g, '\\`')
        .replace(/\$/g, '\\$');

      currentSpeechProcess = spawn('say', [
        '-v', this.currentVoice,
        '-r', this.currentRate.toString(),
        sanitizedText,
      ]);

      currentSpeechProcess.on('close', (code) => {
        const duration = Date.now() - startTime;
        currentSpeechProcess = null;
        
        if (code === 0 || code === null) {
          logger.debug(`macOS speech completed in ${duration}ms`);
          resolve();
        } else if (code === 143) {
          // SIGTERM - speech was stopped intentionally
          resolve();
        } else {
          reject(new Error(`TTS process exited with code ${code}`));
        }
      });

      currentSpeechProcess.on('error', (error) => {
        currentSpeechProcess = null;
        reject(error);
      });
    });
  }

  /**
   * Stop current speech
   */
  async stop(): Promise<void> {
    if (currentSpeechProcess) {
      currentSpeechProcess.kill('SIGTERM');
      currentSpeechProcess = null;
    }

    // Also kill any orphaned say processes
    try {
      await execAsync('killall say 2>/dev/null || true');
    } catch {
      // Ignore errors
    }
  }

  /**
   * Check if currently speaking
   */
  isSpeaking(): boolean {
    return currentSpeechProcess !== null;
  }

  /**
   * Set current voice
   */
  setVoice(voice: string): void {
    this.currentVoice = voice;
    logger.debug(`macOS voice set to: ${voice}`);
  }

  /**
   * Get current voice
   */
  getVoice(): string {
    return this.currentVoice;
  }

  /**
   * Set speaking rate (words per minute, typically 150-300)
   */
  setRate(rate: number): void {
    this.currentRate = Math.max(50, Math.min(500, rate));
    logger.debug(`macOS rate set to: ${this.currentRate}`);
  }

  /**
   * Get current rate
   */
  getRate(): number {
    return this.currentRate;
  }

  /**
   * Get list of available macOS voices
   */
  async getAvailableVoices(): Promise<VoiceInfo[]> {
    if (!this._isAvailable) {
      return [];
    }

    try {
      const { stdout } = await execAsync('say -v "?"');
      const voices: VoiceInfo[] = [];

      const lines = stdout.split('\n').filter(line => line.trim());

      for (const line of lines) {
        // Parse line format: "VoiceName    lang_CODE    # Sample text"
        const match = line.match(/^(\S+)\s+(\w+)_(\w+)\s+#\s*(.*)$/);
        
        if (match) {
          const [, name, lang, country, sampleText] = match;
          
          voices.push({
            id: name,
            name: name,
            language: `${lang}-${country}`,
            country: this.getCountryName(country),
            gender: FEMALE_VOICES.has(name) ? 'female' : 'male',
            provider: 'macos',
            description: sampleText || undefined,
          });
        }
      }

      return voices;
    } catch (error) {
      logger.error('Failed to get macOS voices:', error);
      return [];
    }
  }

  /**
   * Get detailed voice information (grouped by language)
   */
  async getDetailedVoices(): Promise<{
    voices: VoiceInfo[];
    grouped: Record<string, VoiceInfo[]>;
    total: number;
  }> {
    const voices = await this.getAvailableVoices();
    
    const grouped = voices.reduce((acc, voice) => {
      const key = `${voice.language} (${voice.country})`;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(voice);
      return acc;
    }, {} as Record<string, VoiceInfo[]>);

    return {
      voices,
      grouped,
      total: voices.length,
    };
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
      
      const testText = text ?? `Hello, I am ${voice}. This is how I sound.`;
      await this.speak(testText);
    } finally {
      // Restore original settings
      this.currentVoice = originalVoice;
      this.currentRate = originalRate;
    }
  }

  /**
   * Get country name from code
   */
  private getCountryName(code: string): string {
    const countries: Record<string, string> = {
      'US': 'United States',
      'GB': 'United Kingdom',
      'AU': 'Australia',
      'CA': 'Canada',
      'IN': 'India',
      'DE': 'Germany',
      'FR': 'France',
      'ES': 'Spain',
      'IT': 'Italy',
      'JP': 'Japan',
      'CN': 'China',
      'KR': 'Korea',
      'TW': 'Taiwan',
      'HK': 'Hong Kong',
      'MX': 'Mexico',
      'BR': 'Brazil',
      'PT': 'Portugal',
      'RU': 'Russia',
      'NL': 'Netherlands',
      'SE': 'Sweden',
      'NO': 'Norway',
      'DK': 'Denmark',
      'FI': 'Finland',
      'PL': 'Poland',
      'CZ': 'Czech Republic',
      'SK': 'Slovakia',
      'HU': 'Hungary',
      'RO': 'Romania',
      'GR': 'Greece',
      'TR': 'Turkey',
      'IL': 'Israel',
      'SA': 'Saudi Arabia',
      'AE': 'United Arab Emirates',
      'TH': 'Thailand',
      'VN': 'Vietnam',
      'ID': 'Indonesia',
      'MY': 'Malaysia',
      'PH': 'Philippines',
      'ZA': 'South Africa',
    };
    return countries[code] || code;
  }
}

// Default export
export default MacOSProvider;

