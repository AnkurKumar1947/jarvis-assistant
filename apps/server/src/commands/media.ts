/**
 * Media Commands - Music playback and media control
 */

import { logger } from '../utils/logger.js';
import * as macOS from '../utils/macOS.js';
import type { Command, CommandResult } from '../core/types.js';

/**
 * Create a successful command result
 */
function success(response: string, data?: unknown): CommandResult {
  return { success: true, response, shouldSpeak: true, data };
}

/**
 * Create a failed command result
 */
function failure(response: string, error?: Error): CommandResult {
  return { success: false, response, shouldSpeak: true, error };
}

// ============================================================================
// Music Playback Commands
// ============================================================================

export const playMusicCommand: Command = {
  name: 'play-music',
  description: 'Play music in Apple Music',
  category: 'media',
  patterns: [
    /^play$/i,
    /play (?:music|song|songs)/i,
    /start (?:playing )?music/i,
    /resume (?:playing|music)/i,
  ],
  examples: [
    'Play music',
    'Start playing',
    'Resume',
  ],
  execute: async (): Promise<CommandResult> => {
    try {
      await macOS.playMusic();
      return success('Playing music');
    } catch (error) {
      logger.error('Failed to play music:', error);
      return failure('Sorry, I couldn\'t play music. Is Apple Music open?');
    }
  },
};

export const pauseMusicCommand: Command = {
  name: 'pause-music',
  description: 'Pause music playback',
  category: 'media',
  patterns: [
    /^pause$/i,
    /pause (?:the )?(?:music|song|playback)/i,
    /stop (?:the )?(?:music|playing)/i,
  ],
  examples: [
    'Pause',
    'Pause the music',
    'Stop playing',
  ],
  execute: async (): Promise<CommandResult> => {
    try {
      await macOS.pauseMusic();
      return success('Music paused');
    } catch (error) {
      logger.error('Failed to pause music:', error);
      return failure('Sorry, I couldn\'t pause the music.');
    }
  },
};

export const togglePlayPauseCommand: Command = {
  name: 'toggle-play-pause',
  description: 'Toggle play/pause',
  category: 'media',
  patterns: [
    /play(?:\/| or )pause/i,
    /toggle (?:play|music|playback)/i,
  ],
  examples: [
    'Play/pause',
    'Toggle playback',
  ],
  execute: async (): Promise<CommandResult> => {
    try {
      await macOS.togglePlayPause();
      return success('Toggled playback');
    } catch (error) {
      logger.error('Failed to toggle playback:', error);
      return failure('Sorry, I couldn\'t toggle playback.');
    }
  },
};

export const nextTrackCommand: Command = {
  name: 'next-track',
  description: 'Skip to the next track',
  category: 'media',
  patterns: [
    /next(?: track| song)?/i,
    /skip(?: (?:this )?(?:track|song))?/i,
    /play next/i,
  ],
  examples: [
    'Next track',
    'Skip',
    'Next song',
  ],
  execute: async (): Promise<CommandResult> => {
    try {
      await macOS.nextTrack();
      return success('Skipped to next track');
    } catch (error) {
      logger.error('Failed to skip track:', error);
      return failure('Sorry, I couldn\'t skip to the next track.');
    }
  },
};

export const previousTrackCommand: Command = {
  name: 'previous-track',
  description: 'Go to the previous track',
  category: 'media',
  patterns: [
    /previous(?: track| song)?/i,
    /(?:go )?back(?: (?:to )?(?:previous|last)(?: track| song)?)?/i,
    /last (?:track|song)/i,
  ],
  examples: [
    'Previous track',
    'Go back',
    'Play previous song',
  ],
  execute: async (): Promise<CommandResult> => {
    try {
      await macOS.previousTrack();
      return success('Playing previous track');
    } catch (error) {
      logger.error('Failed to go to previous track:', error);
      return failure('Sorry, I couldn\'t go to the previous track.');
    }
  },
};

export const currentTrackCommand: Command = {
  name: 'current-track',
  description: 'Get information about the current track',
  category: 'media',
  patterns: [
    /what(?:'s| is) (?:this|the current) (?:song|track)/i,
    /what(?:'s| is) playing/i,
    /(?:current|this) (?:song|track)/i,
    /what song is (?:this|playing)/i,
  ],
  examples: [
    'What\'s playing?',
    'What song is this?',
    'Current track',
  ],
  execute: async (): Promise<CommandResult> => {
    try {
      const track = await macOS.getCurrentTrack();
      
      if (!track) {
        return success('No track is currently playing');
      }
      
      const response = `Now playing: ${track.name} by ${track.artist} from ${track.album}`;
      return success(response, track);
    } catch (error) {
      logger.error('Failed to get current track:', error);
      return failure('Sorry, I couldn\'t get information about the current track.');
    }
  },
};

export const musicStatusCommand: Command = {
  name: 'music-status',
  description: 'Get the music player status',
  category: 'media',
  patterns: [
    /(?:music|player) status/i,
    /is music (?:playing|paused)/i,
    /(?:are|is) (?:you|the music) playing/i,
  ],
  examples: [
    'Music status',
    'Is music playing?',
  ],
  execute: async (): Promise<CommandResult> => {
    try {
      const state = await macOS.getMusicPlayerState();
      const track = await macOS.getCurrentTrack();
      
      let response = `Music is ${state}`;
      if (state === 'playing' && track) {
        response += `: ${track.name} by ${track.artist}`;
      }
      
      return success(response, { state, track });
    } catch (error) {
      logger.error('Failed to get music status:', error);
      return failure('Sorry, I couldn\'t get the music status.');
    }
  },
};

// ============================================================================
// Export all media commands
// ============================================================================

export const mediaCommands: Command[] = [
  playMusicCommand,
  pauseMusicCommand,
  togglePlayPauseCommand,
  nextTrackCommand,
  previousTrackCommand,
  currentTrackCommand,
  musicStatusCommand,
];

export default mediaCommands;

