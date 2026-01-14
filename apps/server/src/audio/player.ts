/**
 * Audio Player - Play audio files and feedback sounds
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync, writeFileSync, unlinkSync } from 'fs';
import { logger } from '../utils/logger.js';

const execAsync = promisify(exec);

/**
 * Play an audio file using afplay (macOS)
 */
export async function playFile(filePath: string): Promise<void> {
  if (!existsSync(filePath)) {
    throw new Error(`Audio file not found: ${filePath}`);
  }
  
  try {
    await execAsync(`afplay "${filePath}"`);
  } catch (error) {
    logger.debug('Audio playback error:', error);
    throw error;
  }
}

/**
 * Play a buffer as audio
 * Note: This requires saving to a temp file first
 */
export async function playBuffer(buffer: Buffer, format: string = 'wav'): Promise<void> {
  const tempFile = `/tmp/jarvis_audio_${Date.now()}.${format}`;
  
  try {
    writeFileSync(tempFile, buffer);
    await playFile(tempFile);
    unlinkSync(tempFile);
  } catch (error) {
    logger.debug('Buffer playback error:', error);
    throw error;
  }
}

/**
 * Stop any currently playing audio
 */
export async function stopPlayback(): Promise<void> {
  try {
    await execAsync('killall afplay 2>/dev/null || true');
  } catch {
    // Ignore errors
  }
}

export default {
  playFile,
  playBuffer,
  stopPlayback,
};

