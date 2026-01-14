/**
 * System Commands - Volume, brightness, and system control
 */

import { logger } from '../utils/logger.js';
import * as macOS from '../utils/macOS.js';
import type { Command, CommandArgs, CommandResult } from '../core/types.js';

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
// Volume Commands
// ============================================================================

export const setVolumeCommand: Command = {
  name: 'set-volume',
  description: 'Set the system volume to a specific level',
  category: 'system',
  patterns: [
    /set (?:the )?volume (?:to )?(\d+)/i,
    /volume (?:to )?(\d+)/i,
    /make (?:the )?volume (\d+)/i,
  ],
  examples: [
    'Set volume to 50',
    'Volume to 75',
    'Set the volume to 30',
  ],
  execute: async (args: CommandArgs): Promise<CommandResult> => {
    try {
      const level = parseInt(args.entities['level'] || args.matches?.[1] || '50', 10);
      await macOS.setVolume(level);
      return success(`Volume set to ${level}%`, { level });
    } catch (error) {
      logger.error('Failed to set volume:', error);
      return failure('Sorry, I couldn\'t set the volume.');
    }
  },
};

export const volumeUpCommand: Command = {
  name: 'volume-up',
  description: 'Increase the system volume',
  category: 'system',
  patterns: [
    /(?:turn|volume) up/i,
    /increase (?:the )?volume/i,
    /louder/i,
    /raise (?:the )?volume/i,
  ],
  examples: [
    'Turn up the volume',
    'Volume up',
    'Louder',
  ],
  execute: async (): Promise<CommandResult> => {
    try {
      const newLevel = await macOS.increaseVolume(10);
      return success(`Volume increased to ${newLevel}%`, { level: newLevel });
    } catch (error) {
      logger.error('Failed to increase volume:', error);
      return failure('Sorry, I couldn\'t increase the volume.');
    }
  },
};

export const volumeDownCommand: Command = {
  name: 'volume-down',
  description: 'Decrease the system volume',
  category: 'system',
  patterns: [
    /(?:turn|volume) down/i,
    /decrease (?:the )?volume/i,
    /quieter/i,
    /lower (?:the )?volume/i,
  ],
  examples: [
    'Turn down the volume',
    'Volume down',
    'Quieter',
  ],
  execute: async (): Promise<CommandResult> => {
    try {
      const newLevel = await macOS.decreaseVolume(10);
      return success(`Volume decreased to ${newLevel}%`, { level: newLevel });
    } catch (error) {
      logger.error('Failed to decrease volume:', error);
      return failure('Sorry, I couldn\'t decrease the volume.');
    }
  },
};

export const muteCommand: Command = {
  name: 'mute',
  description: 'Mute the system audio',
  category: 'system',
  patterns: [
    /^mute$/i,
    /mute (?:the )?(?:audio|sound|volume)/i,
    /silence/i,
  ],
  examples: [
    'Mute',
    'Mute the audio',
    'Silence',
  ],
  execute: async (): Promise<CommandResult> => {
    try {
      await macOS.mute();
      return success('Audio muted');
    } catch (error) {
      logger.error('Failed to mute:', error);
      return failure('Sorry, I couldn\'t mute the audio.');
    }
  },
};

export const unmuteCommand: Command = {
  name: 'unmute',
  description: 'Unmute the system audio',
  category: 'system',
  patterns: [
    /^unmute$/i,
    /unmute (?:the )?(?:audio|sound|volume)/i,
  ],
  examples: [
    'Unmute',
    'Unmute the audio',
  ],
  execute: async (): Promise<CommandResult> => {
    try {
      await macOS.unmute();
      return success('Audio unmuted');
    } catch (error) {
      logger.error('Failed to unmute:', error);
      return failure('Sorry, I couldn\'t unmute the audio.');
    }
  },
};

export const getVolumeCommand: Command = {
  name: 'get-volume',
  description: 'Get the current system volume level',
  category: 'system',
  patterns: [
    /what(?:'s| is) (?:the )?(?:current )?volume/i,
    /(?:current )?volume level/i,
    /how loud is (?:it|the volume)/i,
  ],
  examples: [
    'What\'s the volume?',
    'Current volume level',
  ],
  execute: async (): Promise<CommandResult> => {
    try {
      const level = await macOS.getVolume();
      return success(`The volume is at ${level}%`, { level });
    } catch (error) {
      logger.error('Failed to get volume:', error);
      return failure('Sorry, I couldn\'t check the volume level.');
    }
  },
};

// ============================================================================
// Brightness Commands
// ============================================================================

export const setBrightnessCommand: Command = {
  name: 'set-brightness',
  description: 'Set the screen brightness',
  category: 'system',
  patterns: [
    /set (?:the )?brightness (?:to )?(\d+)/i,
    /brightness (?:to )?(\d+)/i,
  ],
  examples: [
    'Set brightness to 50',
    'Brightness to 75',
  ],
  execute: async (args: CommandArgs): Promise<CommandResult> => {
    try {
      const level = parseInt(args.matches?.[1] || '50', 10);
      await macOS.setBrightness(level);
      return success(`Brightness set to ${level}%`, { level });
    } catch (error) {
      logger.error('Failed to set brightness:', error);
      return failure('Sorry, I couldn\'t set the brightness. You may need to install the brightness tool with: brew install brightness');
    }
  },
};

// ============================================================================
// Battery Commands
// ============================================================================

export const getBatteryCommand: Command = {
  name: 'get-battery',
  description: 'Get the current battery level',
  category: 'system',
  patterns: [
    /what(?:'s| is) (?:the )?(?:current )?battery/i,
    /battery (?:level|status)/i,
    /how much battery/i,
  ],
  examples: [
    'What\'s the battery level?',
    'Battery status',
  ],
  execute: async (): Promise<CommandResult> => {
    try {
      const level = await macOS.getBatteryLevel();
      const charging = await macOS.isCharging();
      
      if (level < 0) {
        return success('This device doesn\'t have a battery or I couldn\'t read it.');
      }
      
      const chargingStatus = charging ? 'and charging' : '';
      return success(`Battery is at ${level}% ${chargingStatus}`.trim(), { level, charging });
    } catch (error) {
      logger.error('Failed to get battery:', error);
      return failure('Sorry, I couldn\'t check the battery level.');
    }
  },
};

// ============================================================================
// Notification Command
// ============================================================================

export const notifyCommand: Command = {
  name: 'notify',
  description: 'Show a system notification',
  category: 'system',
  patterns: [
    /(?:show|send) (?:a )?notification (?:saying |that )?(.+)/i,
    /notify (?:me )?(?:with |about )?(.+)/i,
  ],
  examples: [
    'Show a notification saying Meeting in 5 minutes',
    'Notify me about the deadline',
  ],
  execute: async (args: CommandArgs): Promise<CommandResult> => {
    try {
      const message = args.matches?.[1] || 'Notification';
      await macOS.showNotification(message, 'Jarvis');
      return success(`Notification sent: ${message}`, { message });
    } catch (error) {
      logger.error('Failed to show notification:', error);
      return failure('Sorry, I couldn\'t show the notification.');
    }
  },
};

// ============================================================================
// Export all system commands
// ============================================================================

export const systemCommands: Command[] = [
  setVolumeCommand,
  volumeUpCommand,
  volumeDownCommand,
  muteCommand,
  unmuteCommand,
  getVolumeCommand,
  setBrightnessCommand,
  getBatteryCommand,
  notifyCommand,
];

export default systemCommands;

