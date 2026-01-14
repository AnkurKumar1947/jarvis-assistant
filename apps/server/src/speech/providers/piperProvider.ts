/**
 * Piper TTS Provider
 * Neural text-to-speech using Piper (rhasspy/piper)
 * https://github.com/rhasspy/piper
 */

import { spawn, ChildProcess, exec } from 'child_process';
import { promisify } from 'util';
import { existsSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { unlink } from 'fs/promises';
import { logger } from '../../utils/logger.js';
import type { 
  TTSProviderInterface, 
  VoiceInfo, 
  PiperVoiceManifest 
} from '../../core/types.js';

const execAsync = promisify(exec);

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Default paths (relative to server root)
const SERVER_ROOT = resolve(__dirname, '../../..');
const DEFAULT_VOICES_PATH = resolve(SERVER_ROOT, 'voices/piper');
const DEFAULT_BIN_PATH = resolve(SERVER_ROOT, 'bin');

/**
 * Piper TTS Provider class
 */
export class PiperProvider implements TTSProviderInterface {
  readonly name = 'piper' as const;
  private _isAvailable: boolean = false;
  private voicesPath: string;
  private binPath: string;
  private piperBinary: string = 'piper';
  private currentVoice: string;
  private currentRate: number;
  private currentProcess: ChildProcess | null = null;
  private voiceManifest: PiperVoiceManifest[] = [];

  constructor(voicesPath?: string, defaultVoice?: string, binPath?: string) {
    this.voicesPath = voicesPath ?? DEFAULT_VOICES_PATH;
    this.binPath = binPath ?? DEFAULT_BIN_PATH;
    this.currentVoice = defaultVoice ?? 'en_GB-alan-medium';
    this.currentRate = 1.0; // Piper rate is a multiplier (0.5 - 2.0)
    
    // Check availability on construction
    this.checkAvailability();
  }

  /**
   * Check if Piper is available
   */
  get isAvailable(): boolean {
    return this._isAvailable;
  }

  /**
   * Check if Piper TTS is installed and voices are available
   */
  private async checkAvailability(): Promise<void> {
    try {
      // Check for piper binary - first in local bin, then system PATH
      const localPiper = resolve(this.binPath, 'piper');
      
      if (existsSync(localPiper)) {
        this.piperBinary = localPiper;
        logger.debug(`Found local Piper binary: ${localPiper}`);
      } else {
        // Try system PATH
        try {
          const { stdout } = await execAsync('which piper');
          this.piperBinary = stdout.trim();
          logger.debug(`Found system Piper binary: ${this.piperBinary}`);
        } catch {
          logger.debug('Piper not found in PATH or local bin');
          this._isAvailable = false;
          return;
        }
      }
      
      // Check if voices directory exists
      if (!existsSync(this.voicesPath)) {
        logger.warn(`Piper voices directory not found: ${this.voicesPath}`);
        this._isAvailable = false;
        return;
      }

      // Load voice manifest
      await this.loadVoiceManifest();
      
      // Check if at least one voice model exists
      const voices = await this.getAvailableVoices();
      this._isAvailable = voices.length > 0;

      if (this._isAvailable) {
        logger.success(`Piper TTS available with ${voices.length} voices (binary: ${this.piperBinary})`);
      } else {
        logger.warn('Piper installed but no voice models found');
      }
    } catch (error) {
      logger.debug('Piper TTS not available:', error);
      this._isAvailable = false;
    }
  }

  /**
   * Load voice manifest from JSON file
   */
  private async loadVoiceManifest(): Promise<void> {
    const manifestPath = resolve(this.voicesPath, 'manifest.json');
    
    if (existsSync(manifestPath)) {
      try {
        const content = readFileSync(manifestPath, 'utf-8');
        const manifest = JSON.parse(content);
        this.voiceManifest = manifest.voices || [];
        logger.debug(`Loaded ${this.voiceManifest.length} voices from manifest`);
      } catch (error) {
        logger.warn('Failed to load Piper voice manifest:', error);
        this.voiceManifest = [];
      }
    }
  }

  /**
   * Get model path for a voice
   */
  private getModelPath(voiceId: string): string {
    return resolve(this.voicesPath, `${voiceId}.onnx`);
  }

  /**
   * Check if a voice model exists
   */
  private voiceExists(voiceId: string): boolean {
    const modelPath = this.getModelPath(voiceId);
    const configPath = `${modelPath}.json`;
    return existsSync(modelPath) && existsSync(configPath);
  }

  /**
   * Speak text using Piper
   */
  async speak(text: string): Promise<void> {
    if (!this._isAvailable) {
      throw new Error('Piper TTS not available');
    }

    if (!text || text.trim().length === 0) {
      return;
    }

    // Validate voice exists
    if (!this.voiceExists(this.currentVoice)) {
      throw new Error(`Piper voice not found: ${this.currentVoice}`);
    }

    const modelPath = this.getModelPath(this.currentVoice);
    const tempFile = `/tmp/jarvis-piper-${uuidv4()}.wav`;

    logger.debug(`Piper speaking: "${text.substring(0, 50)}..." (voice: ${this.currentVoice})`);

    const startTime = Date.now();

    try {
      // Generate audio with Piper
      await new Promise<void>((resolvePromise, reject) => {
        const args = [
          '--model', modelPath,
          '--output_file', tempFile,
        ];

        // Add length scale for rate adjustment (inverted: lower = faster)
        if (this.currentRate !== 1.0) {
          const lengthScale = 1.0 / this.currentRate;
          args.push('--length_scale', lengthScale.toFixed(2));
        }

        // Set up environment with library paths for local piper
        const env = { ...process.env };
        if (this.piperBinary.includes(this.binPath)) {
          env.DYLD_LIBRARY_PATH = `${this.binPath}:${env.DYLD_LIBRARY_PATH || ''}`;
          env.LD_LIBRARY_PATH = `${this.binPath}:${env.LD_LIBRARY_PATH || ''}`;
        }

        const piper = spawn(this.piperBinary, args, { env });
        this.currentProcess = piper;

        let stderr = '';
        piper.stderr?.on('data', (data: Buffer) => {
          stderr += data.toString();
        });

        piper.stdin?.write(text);
        piper.stdin?.end();

        piper.on('close', (code) => {
          this.currentProcess = null;
          if (code === 0) {
            resolvePromise();
          } else {
            reject(new Error(`Piper exited with code ${code}: ${stderr}`));
          }
        });

        piper.on('error', (err) => {
          this.currentProcess = null;
          reject(err);
        });
      });

      const generationTime = Date.now() - startTime;
      logger.debug(`Piper generation completed in ${generationTime}ms`);

      // Play the audio file
      await this.playAudio(tempFile);

      const totalTime = Date.now() - startTime;
      logger.debug(`Piper speech completed in ${totalTime}ms`);

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
      // Use afplay on macOS, aplay on Linux
      const player = process.platform === 'darwin' ? 'afplay' : 'aplay';
      const playProcess = spawn(player, [filePath]);
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

    // Also kill any orphaned processes
    try {
      await execAsync('killall piper 2>/dev/null || true');
      await execAsync('killall afplay 2>/dev/null || true');
    } catch {
      // Ignore errors
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
    if (this.voiceExists(voice)) {
      this.currentVoice = voice;
      logger.debug(`Piper voice set to: ${voice}`);
    } else {
      logger.warn(`Piper voice not found: ${voice}`);
    }
  }

  /**
   * Get current voice
   */
  getVoice(): string {
    return this.currentVoice;
  }

  /**
   * Set speaking rate (0.5 - 2.0, where 1.0 is normal)
   */
  setRate(rate: number): void {
    // Piper uses length_scale which is inverse of rate
    // Accept rate in range 0.5-2.0
    this.currentRate = Math.max(0.5, Math.min(2.0, rate));
    logger.debug(`Piper rate set to: ${this.currentRate}`);
  }

  /**
   * Get current rate
   */
  getRate(): number {
    return this.currentRate;
  }

  /**
   * Get list of available Piper voices
   */
  async getAvailableVoices(): Promise<VoiceInfo[]> {
    const voices: VoiceInfo[] = [];

    // First try to use manifest
    if (this.voiceManifest.length > 0) {
      for (const manifest of this.voiceManifest) {
        if (this.voiceExists(manifest.id)) {
          voices.push({
            id: manifest.id,
            name: manifest.name,
            language: manifest.language,
            country: manifest.country,
            gender: manifest.gender,
            quality: manifest.quality,
            sampleRate: manifest.sampleRate,
            description: manifest.description,
            provider: 'piper',
          });
        }
      }
    }

    // Fallback: scan directory for .onnx files
    if (voices.length === 0 && existsSync(this.voicesPath)) {
      try {
        const { readdir } = await import('fs/promises');
        const files = await readdir(this.voicesPath);
        
        for (const file of files) {
          if (file.endsWith('.onnx') && !file.endsWith('.onnx.json')) {
            const voiceId = file.replace('.onnx', '');
            
            // Parse voice ID for metadata (format: lang_COUNTRY-name-quality)
            const match = voiceId.match(/^([a-z]{2})_([A-Z]{2})-(.+)-(low|medium|high)$/);
            
            if (match) {
              const [, lang, country, name, quality] = match;
              voices.push({
                id: voiceId,
                name: this.capitalizeFirst(name),
                language: `${lang}-${country}`,
                country: this.getCountryName(country),
                gender: 'unknown',
                quality: quality as 'low' | 'medium' | 'high',
                provider: 'piper',
              });
            }
          }
        }
      } catch (error) {
        logger.error('Failed to scan Piper voices directory:', error);
      }
    }

    return voices;
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
      
      const testText = text ?? `Hello, I am ${this.getVoiceName(voice)}. This is how I sound.`;
      await this.speak(testText);
    } finally {
      // Restore original settings
      this.currentVoice = originalVoice;
      this.currentRate = originalRate;
    }
  }

  /**
   * Get human-readable voice name
   */
  private getVoiceName(voiceId: string): string {
    const manifest = this.voiceManifest.find(v => v.id === voiceId);
    if (manifest) {
      return manifest.name;
    }
    
    // Extract from ID
    const match = voiceId.match(/^[a-z]{2}_[A-Z]{2}-(.+)-(?:low|medium|high)$/);
    return match ? this.capitalizeFirst(match[1]) : voiceId;
  }

  /**
   * Capitalize first letter
   */
  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
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
    };
    return countries[code] || code;
  }
}

// Default export
export default PiperProvider;

