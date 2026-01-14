/**
 * macOS utilities for Jarvis Assistant
 * Provides AppleScript execution and system control functions
 */

import { exec, spawn, ChildProcess } from 'child_process';
import { promisify } from 'util';
import { logger } from './logger.js';

const execAsync = promisify(exec);

// ============================================================================
// AppleScript Execution
// ============================================================================

/**
 * Execute an AppleScript command
 */
export async function runAppleScript(script: string): Promise<string> {
  try {
    // Escape single quotes in the script
    const escapedScript = script.replace(/'/g, "'\\''");
    const { stdout } = await execAsync(`osascript -e '${escapedScript}'`);
    return stdout.trim();
  } catch (error) {
    logger.error('AppleScript error:', error);
    throw error;
  }
}

/**
 * Execute multiple AppleScript commands
 */
export async function runAppleScriptMulti(scripts: string[]): Promise<string> {
  const combined = scripts.join('\n');
  const escapedScript = combined.replace(/'/g, "'\\''");
  
  try {
    const { stdout } = await execAsync(`osascript -e '${escapedScript}'`);
    return stdout.trim();
  } catch (error) {
    logger.error('AppleScript error:', error);
    throw error;
  }
}

// ============================================================================
// Volume Control
// ============================================================================

/**
 * Set system volume (0-100)
 */
export async function setVolume(level: number): Promise<void> {
  const volume = Math.max(0, Math.min(100, Math.round(level)));
  await runAppleScript(`set volume output volume ${volume}`);
  logger.debug(`Volume set to ${volume}%`);
}

/**
 * Get current system volume
 */
export async function getVolume(): Promise<number> {
  const result = await runAppleScript('output volume of (get volume settings)');
  return parseInt(result, 10);
}

/**
 * Increase volume by amount
 */
export async function increaseVolume(amount: number = 10): Promise<number> {
  const current = await getVolume();
  const newVolume = Math.min(100, current + amount);
  await setVolume(newVolume);
  return newVolume;
}

/**
 * Decrease volume by amount
 */
export async function decreaseVolume(amount: number = 10): Promise<number> {
  const current = await getVolume();
  const newVolume = Math.max(0, current - amount);
  await setVolume(newVolume);
  return newVolume;
}

/**
 * Mute system audio
 */
export async function mute(): Promise<void> {
  await runAppleScript('set volume output muted true');
  logger.debug('Audio muted');
}

/**
 * Unmute system audio
 */
export async function unmute(): Promise<void> {
  await runAppleScript('set volume output muted false');
  logger.debug('Audio unmuted');
}

/**
 * Toggle mute state
 */
export async function toggleMute(): Promise<boolean> {
  const isMutedState = await runAppleScript('output muted of (get volume settings)');
  const newState = isMutedState === 'true' ? false : true;
  await runAppleScript(`set volume output muted ${newState}`);
  return newState;
}

/**
 * Check if audio is muted
 */
export async function isMuted(): Promise<boolean> {
  const result = await runAppleScript('output muted of (get volume settings)');
  return result === 'true';
}

// ============================================================================
// Screen Brightness (requires additional tool)
// ============================================================================

/**
 * Set screen brightness (0-100)
 * Note: Requires 'brightness' CLI tool: brew install brightness
 */
export async function setBrightness(level: number): Promise<void> {
  const brightness = Math.max(0, Math.min(100, Math.round(level))) / 100;
  try {
    await execAsync(`brightness ${brightness}`);
    logger.debug(`Brightness set to ${level}%`);
  } catch {
    logger.warn('Brightness control not available. Install with: brew install brightness');
    throw new Error('Brightness control not available');
  }
}

// ============================================================================
// Application Control
// ============================================================================

/**
 * Open/activate an application
 */
export async function openApp(appName: string): Promise<void> {
  await runAppleScript(`tell application "${appName}" to activate`);
  logger.debug(`Opened ${appName}`);
}

/**
 * Close/quit an application
 */
export async function closeApp(appName: string): Promise<void> {
  await runAppleScript(`tell application "${appName}" to quit`);
  logger.debug(`Closed ${appName}`);
}

/**
 * Hide an application
 */
export async function hideApp(appName: string): Promise<void> {
  await runAppleScript(`tell application "System Events" to set visible of process "${appName}" to false`);
  logger.debug(`Hidden ${appName}`);
}

/**
 * Get list of running applications
 */
export async function getRunningApps(): Promise<string[]> {
  const result = await runAppleScript(
    'tell application "System Events" to get name of every process whose background only is false'
  );
  return result.split(', ').map(app => app.trim());
}

/**
 * Check if an application is running
 */
export async function isAppRunning(appName: string): Promise<boolean> {
  const result = await runAppleScript(
    `tell application "System Events" to (name of processes) contains "${appName}"`
  );
  return result === 'true';
}

/**
 * Get frontmost application name
 */
export async function getFrontmostApp(): Promise<string> {
  return await runAppleScript(
    'tell application "System Events" to get name of first process whose frontmost is true'
  );
}

// ============================================================================
// Music Control (Apple Music)
// ============================================================================

/**
 * Play music
 */
export async function playMusic(): Promise<void> {
  await runAppleScript('tell application "Music" to play');
  logger.debug('Music playing');
}

/**
 * Pause music
 */
export async function pauseMusic(): Promise<void> {
  await runAppleScript('tell application "Music" to pause');
  logger.debug('Music paused');
}

/**
 * Toggle play/pause
 */
export async function togglePlayPause(): Promise<void> {
  await runAppleScript('tell application "Music" to playpause');
}

/**
 * Next track
 */
export async function nextTrack(): Promise<void> {
  await runAppleScript('tell application "Music" to next track');
  logger.debug('Skipped to next track');
}

/**
 * Previous track
 */
export async function previousTrack(): Promise<void> {
  await runAppleScript('tell application "Music" to previous track');
  logger.debug('Went to previous track');
}

/**
 * Get current track info
 */
export async function getCurrentTrack(): Promise<{ name: string; artist: string; album: string } | null> {
  try {
    const name = await runAppleScript('tell application "Music" to get name of current track');
    const artist = await runAppleScript('tell application "Music" to get artist of current track');
    const album = await runAppleScript('tell application "Music" to get album of current track');
    return { name, artist, album };
  } catch {
    return null;
  }
}

/**
 * Get player state
 */
export async function getMusicPlayerState(): Promise<'playing' | 'paused' | 'stopped'> {
  const state = await runAppleScript('tell application "Music" to get player state');
  return state as 'playing' | 'paused' | 'stopped';
}

// ============================================================================
// System Information
// ============================================================================

/**
 * Get battery level
 */
export async function getBatteryLevel(): Promise<number> {
  try {
    const { stdout } = await execAsync(
      "pmset -g batt | grep -Eo '\\d+%' | cut -d'%' -f1"
    );
    return parseInt(stdout.trim(), 10);
  } catch {
    return -1;
  }
}

/**
 * Check if charging
 */
export async function isCharging(): Promise<boolean> {
  try {
    const { stdout } = await execAsync('pmset -g batt');
    return stdout.includes('AC Power') || stdout.includes('charging');
  } catch {
    return false;
  }
}

/**
 * Get current date and time
 */
export function getDateTime(): { date: string; time: string; timestamp: Date } {
  const now = new Date();
  return {
    date: now.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
    time: now.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }),
    timestamp: now,
  };
}

// ============================================================================
// Notifications
// ============================================================================

/**
 * Show system notification
 */
export async function showNotification(
  message: string,
  title: string = 'Jarvis',
  subtitle?: string,
  sound?: string
): Promise<void> {
  let script = `display notification "${message}" with title "${title}"`;
  
  if (subtitle) {
    script += ` subtitle "${subtitle}"`;
  }
  
  if (sound) {
    script += ` sound name "${sound}"`;
  }
  
  await runAppleScript(script);
}

// ============================================================================
// Text-to-Speech
// ============================================================================

// Track current speaking process
let currentSpeechProcess: ChildProcess | null = null;

/**
 * Speak text using macOS say command
 */
export function speak(
  text: string,
  voice: string = 'Alex',
  rate: number = 180
): Promise<void> {
  return new Promise((resolve, reject) => {
    // Stop any current speech
    if (currentSpeechProcess) {
      currentSpeechProcess.kill();
      currentSpeechProcess = null;
    }

    // Escape special characters in text
    const escapedText = text.replace(/"/g, '\\"');

    currentSpeechProcess = spawn('say', [
      '-v', voice,
      '-r', rate.toString(),
      escapedText,
    ]);

    currentSpeechProcess.on('close', (code) => {
      currentSpeechProcess = null;
      if (code === 0 || code === null) {
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
export async function stopSpeaking(): Promise<void> {
  if (currentSpeechProcess) {
    currentSpeechProcess.kill();
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
export function isSpeaking(): boolean {
  return currentSpeechProcess !== null;
}

/**
 * Voice information structure
 */
export interface VoiceInfo {
  name: string;
  languageCode: string;
  language: string;
  country: string;
  sampleText: string;
  gender: 'male' | 'female' | 'unknown';
}

// Language code to human-readable name mapping
const LANGUAGE_MAP: Record<string, { language: string; country: string }> = {
  'en_US': { language: 'English', country: 'United States' },
  'en_GB': { language: 'English', country: 'United Kingdom' },
  'en_AU': { language: 'English', country: 'Australia' },
  'en_IN': { language: 'English', country: 'India' },
  'en_IE': { language: 'English', country: 'Ireland' },
  'en_ZA': { language: 'English', country: 'South Africa' },
  'en_SC': { language: 'English', country: 'Scotland' },
  'fr_FR': { language: 'French', country: 'France' },
  'fr_CA': { language: 'French', country: 'Canada' },
  'de_DE': { language: 'German', country: 'Germany' },
  'es_ES': { language: 'Spanish', country: 'Spain' },
  'es_MX': { language: 'Spanish', country: 'Mexico' },
  'es_AR': { language: 'Spanish', country: 'Argentina' },
  'it_IT': { language: 'Italian', country: 'Italy' },
  'pt_BR': { language: 'Portuguese', country: 'Brazil' },
  'pt_PT': { language: 'Portuguese', country: 'Portugal' },
  'ja_JP': { language: 'Japanese', country: 'Japan' },
  'ko_KR': { language: 'Korean', country: 'South Korea' },
  'zh_CN': { language: 'Chinese', country: 'China (Mandarin)' },
  'zh_TW': { language: 'Chinese', country: 'Taiwan' },
  'zh_HK': { language: 'Chinese', country: 'Hong Kong (Cantonese)' },
  'ru_RU': { language: 'Russian', country: 'Russia' },
  'ar_SA': { language: 'Arabic', country: 'Saudi Arabia' },
  'hi_IN': { language: 'Hindi', country: 'India' },
  'nl_NL': { language: 'Dutch', country: 'Netherlands' },
  'nl_BE': { language: 'Dutch', country: 'Belgium' },
  'sv_SE': { language: 'Swedish', country: 'Sweden' },
  'da_DK': { language: 'Danish', country: 'Denmark' },
  'fi_FI': { language: 'Finnish', country: 'Finland' },
  'no_NO': { language: 'Norwegian', country: 'Norway' },
  'pl_PL': { language: 'Polish', country: 'Poland' },
  'cs_CZ': { language: 'Czech', country: 'Czech Republic' },
  'tr_TR': { language: 'Turkish', country: 'Turkey' },
  'el_GR': { language: 'Greek', country: 'Greece' },
  'he_IL': { language: 'Hebrew', country: 'Israel' },
  'th_TH': { language: 'Thai', country: 'Thailand' },
  'id_ID': { language: 'Indonesian', country: 'Indonesia' },
  'vi_VN': { language: 'Vietnamese', country: 'Vietnam' },
  'ro_RO': { language: 'Romanian', country: 'Romania' },
  'hu_HU': { language: 'Hungarian', country: 'Hungary' },
  'sk_SK': { language: 'Slovak', country: 'Slovakia' },
  'uk_UA': { language: 'Ukrainian', country: 'Ukraine' },
};

// Known female voice names
const FEMALE_VOICES = new Set([
  'Samantha', 'Victoria', 'Karen', 'Moira', 'Tessa', 'Fiona', 'Veena',
  'Alice', 'Alva', 'Amelie', 'Anna', 'Carmit', 'Damayanti', 'Ellen',
  'Ioana', 'Joana', 'Kanya', 'Kate', 'Kyoko', 'Laura', 'Lekha', 'Luciana',
  'Mariska', 'Mei-Jia', 'Melina', 'Milena', 'Monica', 'Nora', 'Paulina',
  'Sara', 'Satu', 'Sin-ji', 'Ting-Ting', 'Xander', 'Yelda', 'Yuna', 'Zosia',
  'Zuzana', 'Lesya', 'Linh', 'Montse', 'Kathy', 'Vicki', 'Allison', 'Ava',
  'Susan', 'Nicky', 'Rishi', 'Sangeeta', 'Agnes', 'Jill', 'Princess', 'Shelley',
  'Trinoids', 'Whisper',
]);

/**
 * Get available voices (simple list)
 */
export async function getAvailableVoices(): Promise<string[]> {
  try {
    const { stdout } = await execAsync('say -v "?"');
    const voices = stdout.split('\n')
      .filter(line => line.trim())
      .map(line => line.split(/\s+/)[0]);
    return voices;
  } catch {
    return ['Alex', 'Samantha', 'Victoria', 'Daniel'];
  }
}

/**
 * Get detailed voice information
 */
export async function getDetailedVoices(): Promise<VoiceInfo[]> {
  try {
    const { stdout } = await execAsync('say -v "?"');
    const voices: VoiceInfo[] = [];
    
    for (const line of stdout.split('\n')) {
      if (!line.trim()) continue;
      
      // Parse line format: "VoiceName    lang_CODE    # Sample text"
      const match = line.match(/^(\S+)\s+(\w{2}_\w{2})\s+#\s*(.*)$/);
      if (match) {
        const [, name, langCode, sampleText] = match;
        const langInfo = LANGUAGE_MAP[langCode] || { 
          language: langCode.split('_')[0], 
          country: langCode.split('_')[1] || 'Unknown' 
        };
        
        voices.push({
          name,
          languageCode: langCode,
          language: langInfo.language,
          country: langInfo.country,
          sampleText: sampleText.trim(),
          gender: FEMALE_VOICES.has(name) ? 'female' : 'male',
        });
      }
    }
    
    return voices;
  } catch (error) {
    logger.error('Failed to get detailed voices:', error);
    return [
      { name: 'Alex', languageCode: 'en_US', language: 'English', country: 'United States', sampleText: 'Hello, my name is Alex.', gender: 'male' },
      { name: 'Samantha', languageCode: 'en_US', language: 'English', country: 'United States', sampleText: 'Hello, my name is Samantha.', gender: 'female' },
      { name: 'Daniel', languageCode: 'en_GB', language: 'English', country: 'United Kingdom', sampleText: 'Hello, my name is Daniel.', gender: 'male' },
    ];
  }
}

/**
 * Test a voice by speaking sample text
 */
export async function testVoice(voiceName: string, rate: number = 180, text?: string): Promise<void> {
  const testText = text || `Hello, I am ${voiceName}. This is how I sound.`;
  await speak(testText, voiceName, rate);
}

// ============================================================================
// Spotlight / File Search
// ============================================================================

/**
 * Search files using Spotlight (mdfind)
 */
export async function spotlightSearch(query: string, limit: number = 10): Promise<string[]> {
  try {
    const { stdout } = await execAsync(`mdfind "${query}" | head -${limit}`);
    return stdout.split('\n').filter(line => line.trim());
  } catch {
    return [];
  }
}

/**
 * Open file or folder in Finder
 */
export async function openInFinder(path: string): Promise<void> {
  await execAsync(`open "${path}"`);
}

/**
 * Open URL in default browser
 */
export async function openURL(url: string): Promise<void> {
  await execAsync(`open "${url}"`);
}

// ============================================================================
// Do Not Disturb
// ============================================================================

/**
 * Enable Do Not Disturb
 */
export async function enableDND(): Promise<void> {
  // macOS Monterey and later uses Focus modes
  await runAppleScript(`
    tell application "System Events"
      tell process "Control Center"
        click menu bar item "Focus" of menu bar 1
        delay 0.5
        click checkbox "Do Not Disturb" of window 1
      end tell
    end tell
  `);
}

// ============================================================================
// Export all functions
// ============================================================================

export default {
  // AppleScript
  runAppleScript,
  runAppleScriptMulti,
  
  // Volume
  setVolume,
  getVolume,
  increaseVolume,
  decreaseVolume,
  mute,
  unmute,
  toggleMute,
  isMuted,
  
  // Brightness
  setBrightness,
  
  // Apps
  openApp,
  closeApp,
  hideApp,
  getRunningApps,
  isAppRunning,
  getFrontmostApp,
  
  // Music
  playMusic,
  pauseMusic,
  togglePlayPause,
  nextTrack,
  previousTrack,
  getCurrentTrack,
  getMusicPlayerState,
  
  // System
  getBatteryLevel,
  isCharging,
  getDateTime,
  
  // Notifications
  showNotification,
  
  // TTS
  speak,
  stopSpeaking,
  isSpeaking,
  getAvailableVoices,
  getDetailedVoices,
  testVoice,
  
  // Files
  spotlightSearch,
  openInFinder,
  openURL,
  
  // DND
  enableDND,
};

