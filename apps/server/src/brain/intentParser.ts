/**
 * Intent Parser - Classify user intents and extract entities
 * Uses pattern matching and LLM for intent classification
 */

import { logger } from '../utils/logger.js';
import type { ParsedIntent, EntityValue } from '../core/types.js';

/**
 * Known intent patterns
 */
interface IntentPattern {
  intent: string;
  patterns: RegExp[];
  entities?: string[];
}

/**
 * Built-in intent patterns
 */
const INTENT_PATTERNS: IntentPattern[] = [
  // Time & Date
  {
    intent: 'utilities.time',
    patterns: [
      /what(?:'s| is) the time/i,
      /what time is it/i,
      /tell me the time/i,
      /current time/i,
    ],
  },
  {
    intent: 'utilities.date',
    patterns: [
      /what(?:'s| is) (?:the )?date/i,
      /what day is (?:it|today)/i,
      /what(?:'s| is) today(?:'s)? date/i,
    ],
  },
  
  // Volume Control
  {
    intent: 'system.volume.set',
    patterns: [
      /set (?:the )?volume to (\d+)/i,
      /volume (?:to )?(\d+)/i,
    ],
    entities: ['level'],
  },
  {
    intent: 'system.volume.up',
    patterns: [
      /(?:turn|volume) up/i,
      /increase (?:the )?volume/i,
      /louder/i,
    ],
  },
  {
    intent: 'system.volume.down',
    patterns: [
      /(?:turn|volume) down/i,
      /decrease (?:the )?volume/i,
      /quieter/i,
      /lower (?:the )?volume/i,
    ],
  },
  {
    intent: 'system.volume.mute',
    patterns: [
      /mute/i,
      /silence/i,
    ],
  },
  {
    intent: 'system.volume.unmute',
    patterns: [
      /unmute/i,
    ],
  },
  
  // Application Control
  {
    intent: 'apps.open',
    patterns: [
      /open (.+)/i,
      /launch (.+)/i,
      /start (.+)/i,
    ],
    entities: ['app'],
  },
  {
    intent: 'apps.close',
    patterns: [
      /close (.+)/i,
      /quit (.+)/i,
      /exit (.+)/i,
    ],
    entities: ['app'],
  },
  
  // Music Control
  {
    intent: 'media.play',
    patterns: [
      /play (?:music|song)/i,
      /start (?:music|playing)/i,
    ],
  },
  {
    intent: 'media.pause',
    patterns: [
      /pause/i,
      /stop (?:music|playing)/i,
    ],
  },
  {
    intent: 'media.next',
    patterns: [
      /next (?:track|song)/i,
      /skip/i,
    ],
  },
  {
    intent: 'media.previous',
    patterns: [
      /previous (?:track|song)/i,
      /go back/i,
    ],
  },
  
  // System Commands
  {
    intent: 'system.sleep',
    patterns: [
      /(?:go to )?sleep/i,
      /put (?:the )?computer to sleep/i,
    ],
  },
  {
    intent: 'system.screenshot',
    patterns: [
      /(?:take a )?screenshot/i,
      /capture (?:the )?screen/i,
    ],
  },
  
  // Conversation
  {
    intent: 'conversation.greeting',
    patterns: [
      /^(?:hi|hello|hey)(?:\s|$)/i,
      /good (?:morning|afternoon|evening)/i,
    ],
  },
  {
    intent: 'conversation.goodbye',
    patterns: [
      /^(?:bye|goodbye|see you)/i,
      /good night/i,
    ],
  },
  {
    intent: 'conversation.thanks',
    patterns: [
      /thank(?:s| you)/i,
    ],
  },
  {
    intent: 'conversation.help',
    patterns: [
      /(?:what can you do|help|commands)/i,
    ],
  },
];

/**
 * Parse user input to extract intent and entities
 */
export function parseIntent(text: string): ParsedIntent {
  const normalized = text.toLowerCase().trim();
  
  // Try to match against known patterns
  for (const { intent, patterns, entities: entityNames } of INTENT_PATTERNS) {
    for (const pattern of patterns) {
      const match = normalized.match(pattern);
      if (match) {
        // Extract entities from capture groups
        const entities: Record<string, EntityValue> = {};
        
        if (entityNames && match.length > 1) {
          entityNames.forEach((name, index) => {
            const value = match[index + 1];
            if (value) {
              entities[name] = {
                value: parseEntityValue(value),
                type: detectEntityType(value),
                confidence: 0.9,
              };
            }
          });
        }
        
        logger.debug(`Intent matched: ${intent}`);
        return {
          intent,
          confidence: 0.9,
          entities,
          raw: text,
        };
      }
    }
  }
  
  // No pattern matched - return unknown intent
  return {
    intent: 'unknown',
    confidence: 0.0,
    entities: {},
    raw: text,
  };
}

/**
 * Parse entity value (convert to appropriate type)
 */
function parseEntityValue(value: string): string | number {
  // Try to parse as number
  const num = parseFloat(value);
  if (!isNaN(num)) {
    return num;
  }
  return value.trim();
}

/**
 * Detect entity type from value
 */
function detectEntityType(value: string): EntityValue['type'] {
  // Check for number
  if (!isNaN(parseFloat(value))) {
    if (value.includes('%')) {
      return 'percentage';
    }
    return 'number';
  }
  
  // Check for time pattern (e.g., "3:30", "15:00")
  if (/^\d{1,2}:\d{2}(?:\s*(?:am|pm))?$/i.test(value)) {
    return 'time';
  }
  
  // Check for date patterns
  if (/^\d{1,2}\/\d{1,2}(?:\/\d{2,4})?$/.test(value)) {
    return 'date';
  }
  
  // Check for known app names
  const knownApps = ['safari', 'chrome', 'firefox', 'spotify', 'slack', 'finder', 'terminal', 'notes', 'calendar', 'mail'];
  if (knownApps.includes(value.toLowerCase())) {
    return 'app';
  }
  
  return 'string';
}

/**
 * Extract numbers from text
 */
export function extractNumbers(text: string): number[] {
  const matches = text.match(/\d+(?:\.\d+)?/g);
  return matches ? matches.map(Number) : [];
}

/**
 * Extract app names from text
 */
export function extractAppName(text: string): string | null {
  // Common patterns for app names
  const patterns = [
    /(?:open|launch|start|close|quit)\s+(?:the\s+)?(.+?)(?:\s+app)?$/i,
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  
  return null;
}

/**
 * Check if text is a question
 */
export function isQuestion(text: string): boolean {
  const questionWords = ['what', 'who', 'when', 'where', 'why', 'how', 'is', 'are', 'can', 'could', 'would', 'will', 'do', 'does'];
  const normalized = text.toLowerCase().trim();
  
  // Check if starts with question word
  if (questionWords.some(word => normalized.startsWith(word))) {
    return true;
  }
  
  // Check for question mark
  if (text.trim().endsWith('?')) {
    return true;
  }
  
  return false;
}

/**
 * Check if text is a command
 */
export function isCommand(text: string): boolean {
  const commandWords = ['open', 'close', 'play', 'pause', 'stop', 'turn', 'set', 'increase', 'decrease', 'mute', 'unmute', 'take', 'show', 'hide'];
  const normalized = text.toLowerCase().trim();
  
  return commandWords.some(word => normalized.startsWith(word));
}

// Default export
export default {
  parseIntent,
  extractNumbers,
  extractAppName,
  isQuestion,
  isCommand,
};

