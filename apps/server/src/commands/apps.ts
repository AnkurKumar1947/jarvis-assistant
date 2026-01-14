/**
 * Application Commands - Open, close, and control apps
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

/**
 * Normalize app name (handle common variations)
 */
function normalizeAppName(name: string): string {
  const appMap: Record<string, string> = {
    'chrome': 'Google Chrome',
    'google chrome': 'Google Chrome',
    'firefox': 'Firefox',
    'safari': 'Safari',
    'code': 'Visual Studio Code',
    'vs code': 'Visual Studio Code',
    'vscode': 'Visual Studio Code',
    'visual studio code': 'Visual Studio Code',
    'terminal': 'Terminal',
    'iterm': 'iTerm',
    'finder': 'Finder',
    'spotify': 'Spotify',
    'slack': 'Slack',
    'discord': 'Discord',
    'zoom': 'zoom.us',
    'teams': 'Microsoft Teams',
    'outlook': 'Microsoft Outlook',
    'word': 'Microsoft Word',
    'excel': 'Microsoft Excel',
    'powerpoint': 'Microsoft PowerPoint',
    'notes': 'Notes',
    'reminders': 'Reminders',
    'calendar': 'Calendar',
    'mail': 'Mail',
    'messages': 'Messages',
    'facetime': 'FaceTime',
    'music': 'Music',
    'photos': 'Photos',
    'preview': 'Preview',
    'textedit': 'TextEdit',
    'calculator': 'Calculator',
    'system preferences': 'System Preferences',
    'system settings': 'System Settings',
    'settings': 'System Settings',
    'preferences': 'System Preferences',
    'activity monitor': 'Activity Monitor',
    'app store': 'App Store',
  };

  const normalized = name.toLowerCase().trim();
  return appMap[normalized] || name;
}

// ============================================================================
// Application Commands
// ============================================================================

export const openAppCommand: Command = {
  name: 'open-app',
  description: 'Open an application',
  category: 'apps',
  patterns: [
    /open (?:the )?(.+?)(?:\s+app)?$/i,
    /launch (?:the )?(.+?)(?:\s+app)?$/i,
    /start (?:the )?(.+?)(?:\s+app)?$/i,
  ],
  examples: [
    'Open Safari',
    'Launch Spotify',
    'Open the calculator app',
  ],
  execute: async (args: CommandArgs): Promise<CommandResult> => {
    try {
      const rawAppName = args.matches?.[1]?.trim() || '';
      if (!rawAppName) {
        return failure('Which app would you like me to open?');
      }
      
      const appName = normalizeAppName(rawAppName);
      await macOS.openApp(appName);
      return success(`Opening ${appName}`, { app: appName });
    } catch (error) {
      logger.error('Failed to open app:', error);
      const rawAppName = args.matches?.[1]?.trim() || 'the app';
      return failure(`Sorry, I couldn't open ${rawAppName}. Make sure it's installed.`);
    }
  },
};

export const closeAppCommand: Command = {
  name: 'close-app',
  description: 'Close/quit an application',
  category: 'apps',
  patterns: [
    /close (?:the )?(.+?)(?:\s+app)?$/i,
    /quit (?:the )?(.+?)(?:\s+app)?$/i,
    /exit (?:the )?(.+?)(?:\s+app)?$/i,
    /kill (?:the )?(.+?)(?:\s+app)?$/i,
  ],
  examples: [
    'Close Safari',
    'Quit Spotify',
    'Exit Terminal',
  ],
  execute: async (args: CommandArgs): Promise<CommandResult> => {
    try {
      const rawAppName = args.matches?.[1]?.trim() || '';
      if (!rawAppName) {
        return failure('Which app would you like me to close?');
      }
      
      const appName = normalizeAppName(rawAppName);
      await macOS.closeApp(appName);
      return success(`Closed ${appName}`, { app: appName });
    } catch (error) {
      logger.error('Failed to close app:', error);
      const rawAppName = args.matches?.[1]?.trim() || 'the app';
      return failure(`Sorry, I couldn't close ${rawAppName}.`);
    }
  },
};

export const hideAppCommand: Command = {
  name: 'hide-app',
  description: 'Hide an application',
  category: 'apps',
  patterns: [
    /hide (?:the )?(.+?)(?:\s+app)?$/i,
    /minimize (?:the )?(.+?)(?:\s+app)?$/i,
  ],
  examples: [
    'Hide Safari',
    'Minimize Finder',
  ],
  execute: async (args: CommandArgs): Promise<CommandResult> => {
    try {
      const rawAppName = args.matches?.[1]?.trim() || '';
      if (!rawAppName) {
        return failure('Which app would you like me to hide?');
      }
      
      const appName = normalizeAppName(rawAppName);
      await macOS.hideApp(appName);
      return success(`Hidden ${appName}`, { app: appName });
    } catch (error) {
      logger.error('Failed to hide app:', error);
      const rawAppName = args.matches?.[1]?.trim() || 'the app';
      return failure(`Sorry, I couldn't hide ${rawAppName}.`);
    }
  },
};

export const listAppsCommand: Command = {
  name: 'list-apps',
  description: 'List currently running applications',
  category: 'apps',
  patterns: [
    /(?:list|show|what)(?:'s| are)? (?:the )?(?:running|open) apps/i,
    /what apps are (?:running|open)/i,
    /which apps are (?:running|open)/i,
  ],
  examples: [
    'List running apps',
    'What apps are open?',
    'Show open apps',
  ],
  execute: async (): Promise<CommandResult> => {
    try {
      const apps = await macOS.getRunningApps();
      const appList = apps.slice(0, 10).join(', '); // Limit to 10 apps
      const hasMore = apps.length > 10 ? ` and ${apps.length - 10} more` : '';
      
      return success(`Running apps: ${appList}${hasMore}`, { apps });
    } catch (error) {
      logger.error('Failed to list apps:', error);
      return failure('Sorry, I couldn\'t get the list of running apps.');
    }
  },
};

export const getFrontAppCommand: Command = {
  name: 'get-front-app',
  description: 'Get the currently active application',
  category: 'apps',
  patterns: [
    /what(?:'s| is) (?:the )?(?:current|active|front) app/i,
    /which app (?:is|am) (?:i )?(?:in|using)/i,
    /what app is (?:in )?(?:the )?(?:front|focus)/i,
  ],
  examples: [
    'What\'s the current app?',
    'Which app am I using?',
  ],
  execute: async (): Promise<CommandResult> => {
    try {
      const app = await macOS.getFrontmostApp();
      return success(`The active app is ${app}`, { app });
    } catch (error) {
      logger.error('Failed to get front app:', error);
      return failure('Sorry, I couldn\'t determine the active app.');
    }
  },
};

export const isAppRunningCommand: Command = {
  name: 'is-app-running',
  description: 'Check if an application is running',
  category: 'apps',
  patterns: [
    /is (.+?) (?:running|open)/i,
    /(?:check|see) if (.+?) is (?:running|open)/i,
  ],
  examples: [
    'Is Safari running?',
    'Check if Spotify is open',
  ],
  execute: async (args: CommandArgs): Promise<CommandResult> => {
    try {
      const rawAppName = args.matches?.[1]?.trim() || '';
      if (!rawAppName) {
        return failure('Which app would you like me to check?');
      }
      
      const appName = normalizeAppName(rawAppName);
      const isRunning = await macOS.isAppRunning(appName);
      
      const status = isRunning ? 'running' : 'not running';
      return success(`${appName} is ${status}`, { app: appName, isRunning });
    } catch (error) {
      logger.error('Failed to check app status:', error);
      const rawAppName = args.matches?.[1]?.trim() || 'the app';
      return failure(`Sorry, I couldn't check if ${rawAppName} is running.`);
    }
  },
};

// ============================================================================
// Export all app commands
// ============================================================================

export const appCommands: Command[] = [
  openAppCommand,
  closeAppCommand,
  hideAppCommand,
  listAppsCommand,
  getFrontAppCommand,
  isAppRunningCommand,
];

export default appCommands;

