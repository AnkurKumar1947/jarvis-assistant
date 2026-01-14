/**
 * Audio feedback utilities for Jarvis Assistant
 * Handles playing notification sounds and audio feedback
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { logger } from './logger.js';

const execAsync = promisify(exec);

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Sound file paths
const SOUNDS_DIR = resolve(__dirname, '../../../sounds');

/**
 * Available sound types
 */
export type SoundType = 
  | 'activate'      // Wake word detected
  | 'deactivate'    // Done listening
  | 'success'       // Command succeeded
  | 'error'         // Error occurred
  | 'notification'  // General notification
  | 'thinking';     // Processing

/**
 * Sound configuration
 */
interface SoundConfig {
  file?: string;           // Custom sound file path
  systemSound?: string;    // macOS system sound name
  frequency?: number;      // For generated beep
  duration?: number;       // Duration in ms
}

/**
 * Default sound configurations
 */
const SOUND_CONFIGS: Record<SoundType, SoundConfig> = {
  activate: {
    systemSound: 'Ping',
    frequency: 800,
    duration: 100,
  },
  deactivate: {
    systemSound: 'Pop',
    frequency: 400,
    duration: 100,
  },
  success: {
    systemSound: 'Glass',
    frequency: 1000,
    duration: 150,
  },
  error: {
    systemSound: 'Basso',
    frequency: 200,
    duration: 200,
  },
  notification: {
    systemSound: 'Purr',
    frequency: 600,
    duration: 100,
  },
  thinking: {
    systemSound: 'Morse',
    frequency: 500,
    duration: 50,
  },
};

/**
 * Play a macOS system sound
 */
async function playSystemSound(soundName: string): Promise<void> {
  const soundPath = `/System/Library/Sounds/${soundName}.aiff`;
  
  if (existsSync(soundPath)) {
    await execAsync(`afplay "${soundPath}"`);
  } else {
    // Try alternative locations
    const altPath = `/System/Library/PrivateFrameworks/ToneLibrary.framework/Versions/A/Resources/AlertTones/${soundName}.caf`;
    if (existsSync(altPath)) {
      await execAsync(`afplay "${altPath}"`);
    } else {
      throw new Error(`System sound not found: ${soundName}`);
    }
  }
}

/**
 * Play a custom sound file
 */
async function playSoundFile(filePath: string): Promise<void> {
  if (!existsSync(filePath)) {
    throw new Error(`Sound file not found: ${filePath}`);
  }
  
  await execAsync(`afplay "${filePath}"`);
}

/**
 * Generate a beep sound using say command workaround
 */
async function playBeep(_frequency: number = 440, _duration: number = 100): Promise<void> {
  // Use osascript to play a beep
  await execAsync(`osascript -e 'beep'`);
}

/**
 * Play a sound by type
 */
export async function playSound(type: SoundType): Promise<void> {
  const config = SOUND_CONFIGS[type];
  
  try {
    // Check for custom sound file first
    const customSoundPath = resolve(SOUNDS_DIR, `${type}.wav`);
    if (existsSync(customSoundPath)) {
      await playSoundFile(customSoundPath);
      return;
    }
    
    const customSoundPathMp3 = resolve(SOUNDS_DIR, `${type}.mp3`);
    if (existsSync(customSoundPathMp3)) {
      await playSoundFile(customSoundPathMp3);
      return;
    }
    
    // Try system sound
    if (config.systemSound) {
      try {
        await playSystemSound(config.systemSound);
        return;
      } catch {
        // Fall through to beep
      }
    }
    
    // Fallback to beep
    await playBeep(config.frequency, config.duration);
    
  } catch (error) {
    logger.debug(`Failed to play sound '${type}':`, error);
    // Silently fail - sounds are not critical
  }
}

/**
 * Play activation sound (wake word detected)
 */
export async function playActivate(): Promise<void> {
  await playSound('activate');
}

/**
 * Play deactivation sound (done listening)
 */
export async function playDeactivate(): Promise<void> {
  await playSound('deactivate');
}

/**
 * Play success sound
 */
export async function playSuccess(): Promise<void> {
  await playSound('success');
}

/**
 * Play error sound
 */
export async function playError(): Promise<void> {
  await playSound('error');
}

/**
 * Play notification sound
 */
export async function playNotification(): Promise<void> {
  await playSound('notification');
}

/**
 * Play thinking/processing sound
 */
export async function playThinking(): Promise<void> {
  await playSound('thinking');
}

/**
 * Sound player class for more control
 */
export class SoundPlayer {
  private enabled: boolean = true;
  private volume: number = 100;
  private customSounds: Map<SoundType, string> = new Map();

  /**
   * Enable/disable sounds
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Check if sounds are enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Set volume (0-100)
   */
  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(100, volume));
  }

  /**
   * Get current volume
   */
  getVolume(): number {
    return this.volume;
  }

  /**
   * Register a custom sound file for a sound type
   */
  registerCustomSound(type: SoundType, filePath: string): void {
    if (!existsSync(filePath)) {
      throw new Error(`Sound file not found: ${filePath}`);
    }
    this.customSounds.set(type, filePath);
  }

  /**
   * Play a sound
   */
  async play(type: SoundType): Promise<void> {
    if (!this.enabled) return;

    // Check for registered custom sound
    const customPath = this.customSounds.get(type);
    if (customPath && existsSync(customPath)) {
      await playSoundFile(customPath);
      return;
    }

    // Play default sound
    await playSound(type);
  }

  /**
   * Play a custom sound file directly
   */
  async playFile(filePath: string): Promise<void> {
    if (!this.enabled) return;
    await playSoundFile(filePath);
  }

  /**
   * Play a sequence of sounds with delays
   */
  async playSequence(
    sounds: Array<{ type: SoundType; delay?: number }>
  ): Promise<void> {
    if (!this.enabled) return;

    for (const { type, delay = 200 } of sounds) {
      await this.play(type);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

/**
 * Default sound player instance
 */
export const soundPlayer = new SoundPlayer();

/**
 * List available system sounds
 */
export async function listSystemSounds(): Promise<string[]> {
  const soundsPath = '/System/Library/Sounds';
  
  try {
    const { stdout } = await execAsync(`ls "${soundsPath}"`);
    return stdout.split('\n')
      .filter(file => file.endsWith('.aiff'))
      .map(file => file.replace('.aiff', ''));
  } catch {
    return [];
  }
}

// Export default
export default {
  playSound,
  playActivate,
  playDeactivate,
  playSuccess,
  playError,
  playNotification,
  playThinking,
  SoundPlayer,
  soundPlayer,
  listSystemSounds,
};

