/**
 * Utility Commands - Time, date, calculations, and general utilities
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
// Time & Date Commands
// ============================================================================

export const timeCommand: Command = {
  name: 'time',
  description: 'Get the current time',
  category: 'utilities',
  patterns: [
    /what(?:'s| is) (?:the )?(?:current )?time/i,
    /(?:tell me )?the time/i,
    /what time is it/i,
    /^time$/i,
  ],
  examples: [
    'What time is it?',
    'What\'s the time?',
    'Time',
  ],
  execute: async (): Promise<CommandResult> => {
    try {
      const { time, timestamp } = macOS.getDateTime();
      return success(`It's ${time}`, { time, timestamp });
    } catch (error) {
      logger.error('Failed to get time:', error);
      return failure('Sorry, I couldn\'t get the current time.');
    }
  },
};

export const dateCommand: Command = {
  name: 'date',
  description: 'Get the current date',
  category: 'utilities',
  patterns: [
    /what(?:'s| is) (?:the )?(?:current )?date/i,
    /(?:tell me )?the date/i,
    /what(?:'s| is) today(?:'s)? date/i,
    /what day is (?:it|today)/i,
    /^date$/i,
  ],
  examples: [
    'What\'s the date?',
    'What day is it?',
    'Date',
  ],
  execute: async (): Promise<CommandResult> => {
    try {
      const { date, timestamp } = macOS.getDateTime();
      return success(`Today is ${date}`, { date, timestamp });
    } catch (error) {
      logger.error('Failed to get date:', error);
      return failure('Sorry, I couldn\'t get the current date.');
    }
  },
};

export const dateTimeCommand: Command = {
  name: 'datetime',
  description: 'Get the current date and time',
  category: 'utilities',
  patterns: [
    /what(?:'s| is) (?:the )?(?:current )?date and time/i,
    /date and time/i,
  ],
  examples: [
    'What\'s the date and time?',
    'Date and time',
  ],
  execute: async (): Promise<CommandResult> => {
    try {
      const { date, time, timestamp } = macOS.getDateTime();
      return success(`It's ${time} on ${date}`, { date, time, timestamp });
    } catch (error) {
      logger.error('Failed to get date/time:', error);
      return failure('Sorry, I couldn\'t get the date and time.');
    }
  },
};

// ============================================================================
// Search Commands
// ============================================================================

export const searchFilesCommand: Command = {
  name: 'search-files',
  description: 'Search for files using Spotlight',
  category: 'utilities',
  patterns: [
    /(?:search|find|look) (?:for )?(?:files? )?(?:named |called )?(.+)/i,
    /where (?:is|are) (?:the )?(.+)/i,
  ],
  examples: [
    'Search for documents',
    'Find files named report',
    'Where is my resume?',
  ],
  execute: async (args: CommandArgs): Promise<CommandResult> => {
    try {
      const query = args.matches?.[1]?.trim() || '';
      if (!query) {
        return failure('What would you like me to search for?');
      }
      
      const results = await macOS.spotlightSearch(query, 5);
      
      if (results.length === 0) {
        return success(`No files found matching "${query}"`, { query, results: [] });
      }
      
      const fileNames = results.map(path => path.split('/').pop()).join(', ');
      return success(`Found: ${fileNames}`, { query, results });
    } catch (error) {
      logger.error('Failed to search files:', error);
      return failure('Sorry, I couldn\'t search for files.');
    }
  },
};

// ============================================================================
// Web Commands
// ============================================================================

export const openUrlCommand: Command = {
  name: 'open-url',
  description: 'Open a URL in the default browser',
  category: 'utilities',
  patterns: [
    /(?:open|go to|visit) (?:the )?(?:website |url )?(.+\.(?:com|org|net|io|dev|co|app|ai).*)/i,
    /(?:open|browse to) (.+)/i,
  ],
  examples: [
    'Open google.com',
    'Go to github.com',
  ],
  execute: async (args: CommandArgs): Promise<CommandResult> => {
    try {
      let url = args.matches?.[1]?.trim() || '';
      if (!url) {
        return failure('Which website would you like me to open?');
      }
      
      // Add protocol if missing
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = `https://${url}`;
      }
      
      await macOS.openURL(url);
      return success(`Opening ${url}`, { url });
    } catch (error) {
      logger.error('Failed to open URL:', error);
      return failure('Sorry, I couldn\'t open that URL.');
    }
  },
};

// ============================================================================
// Calculation Commands
// ============================================================================

export const calculateCommand: Command = {
  name: 'calculate',
  description: 'Perform a mathematical calculation',
  category: 'utilities',
  patterns: [
    /(?:what(?:'s| is)|calculate|compute) (.+)/i,
    /(\d+(?:\.\d+)?\s*[+\-*/^%]\s*\d+(?:\.\d+)?(?:\s*[+\-*/^%]\s*\d+(?:\.\d+)?)*)/i,
  ],
  examples: [
    'What\'s 2 + 2?',
    'Calculate 15 * 8',
    '100 / 4',
  ],
  execute: async (args: CommandArgs): Promise<CommandResult> => {
    try {
      const expression = args.matches?.[1]?.trim() || '';
      if (!expression) {
        return failure('What would you like me to calculate?');
      }
      
      // Simple math expression evaluation
      // Only allow safe characters: digits, operators, parentheses, decimals, spaces
      const sanitized = expression.replace(/[^0-9+\-*/().%^ ]/g, '');
      
      if (!sanitized) {
        return failure('I couldn\'t understand that expression.');
      }
      
      // Replace ^ with ** for exponentiation
      const prepared = sanitized.replace(/\^/g, '**');
      
      // Evaluate the expression safely
      // eslint-disable-next-line no-eval
      const result = eval(prepared);
      
      if (typeof result === 'number' && !isNaN(result)) {
        const formattedResult = Number.isInteger(result) ? result : result.toFixed(4);
        return success(`${expression} equals ${formattedResult}`, { expression, result });
      }
      
      return failure('I couldn\'t calculate that expression.');
    } catch (error) {
      logger.error('Failed to calculate:', error);
      return failure('Sorry, I couldn\'t evaluate that expression.');
    }
  },
};

// ============================================================================
// Conversation Commands
// ============================================================================

export const greetingCommand: Command = {
  name: 'greeting',
  description: 'Respond to greetings',
  category: 'utilities',
  patterns: [
    /^(?:hi|hello|hey)(?:\s+(?:jarvis|there))?$/i,
    /^good (?:morning|afternoon|evening)$/i,
    /^howdy$/i,
  ],
  examples: [
    'Hello',
    'Hi Jarvis',
    'Good morning',
  ],
  execute: async (): Promise<CommandResult> => {
    const greetings = [
      'Hello! How can I help you?',
      'Hi there! What can I do for you?',
      'Hey! Ready to assist.',
      'Hello! At your service.',
    ];
    const response = greetings[Math.floor(Math.random() * greetings.length)];
    return success(response);
  },
};

export const goodbyeCommand: Command = {
  name: 'goodbye',
  description: 'Respond to goodbyes',
  category: 'utilities',
  patterns: [
    /^(?:bye|goodbye|see you|later)$/i,
    /^good (?:bye|night)$/i,
  ],
  examples: [
    'Goodbye',
    'Bye',
    'See you',
  ],
  execute: async (): Promise<CommandResult> => {
    const farewells = [
      'Goodbye! Have a great day!',
      'See you later!',
      'Bye! Call me if you need anything.',
      'Take care!',
    ];
    const response = farewells[Math.floor(Math.random() * farewells.length)];
    return success(response);
  },
};

export const thanksCommand: Command = {
  name: 'thanks',
  description: 'Respond to thanks',
  category: 'utilities',
  patterns: [
    /^(?:thanks|thank you|thx)$/i,
    /^thanks? (?:a lot|very much|so much)$/i,
  ],
  examples: [
    'Thanks',
    'Thank you',
  ],
  execute: async (): Promise<CommandResult> => {
    const responses = [
      'You\'re welcome!',
      'Happy to help!',
      'Anytime!',
      'My pleasure!',
    ];
    const response = responses[Math.floor(Math.random() * responses.length)];
    return success(response);
  },
};

export const helpCommand: Command = {
  name: 'help',
  description: 'Show available commands',
  category: 'utilities',
  patterns: [
    /^(?:help|commands)$/i,
    /what can you do/i,
    /what are your (?:commands|capabilities)/i,
  ],
  examples: [
    'Help',
    'What can you do?',
    'Commands',
  ],
  execute: async (): Promise<CommandResult> => {
    const helpText = `I can help you with:
• System: volume, brightness, battery, notifications
• Apps: open, close, list running apps
• Media: play, pause, next/previous track
• Utilities: time, date, search files, calculations
• Conversation: greetings, farewells

Just tell me what you need!`;
    
    return success(helpText);
  },
};

// ============================================================================
// Export all utility commands
// ============================================================================

export const utilityCommands: Command[] = [
  timeCommand,
  dateCommand,
  dateTimeCommand,
  searchFilesCommand,
  openUrlCommand,
  calculateCommand,
  greetingCommand,
  goodbyeCommand,
  thanksCommand,
  helpCommand,
];

export default utilityCommands;

