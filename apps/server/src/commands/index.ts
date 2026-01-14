/**
 * Command Registry - Central registry for all available commands
 */

import { logger } from '../utils/logger.js';
import { systemCommands } from './system.js';
import { appCommands } from './apps.js';
import { mediaCommands } from './media.js';
import { utilityCommands } from './utilities.js';
import type { Command, CommandArgs, CommandResult, CommandCategory } from '../core/types.js';

/**
 * All registered commands
 */
const allCommands: Command[] = [
  ...systemCommands,
  ...appCommands,
  ...mediaCommands,
  ...utilityCommands,
];

/**
 * Command registry by category
 */
const commandsByCategory: Record<CommandCategory, Command[]> = {
  system: systemCommands,
  apps: appCommands,
  media: mediaCommands,
  utilities: utilityCommands,
  conversation: utilityCommands.filter(c => 
    ['greeting', 'goodbye', 'thanks', 'help'].includes(c.name)
  ),
};

/**
 * Find a matching command for the given input
 */
export function findCommand(input: string): Command | null {
  const normalized = input.toLowerCase().trim();
  
  for (const command of allCommands) {
    for (const pattern of command.patterns) {
      if (pattern.test(normalized)) {
        logger.debug(`Matched command: ${command.name}`);
        return command;
      }
    }
  }
  
  return null;
}

/**
 * Execute a command with the given input
 */
export async function executeCommand(
  input: string,
  context?: CommandArgs['context']
): Promise<CommandResult> {
  const command = findCommand(input);
  
  if (!command) {
    return {
      success: false,
      response: `I'm not sure how to help with that. Say "help" for available commands.`,
      shouldSpeak: true,
    };
  }
  
  // Find matches for the command
  let matches: RegExpMatchArray | null = null;
  for (const pattern of command.patterns) {
    matches = input.toLowerCase().trim().match(pattern);
    if (matches) break;
  }
  
  // Build command args
  const args: CommandArgs = {
    raw: input,
    normalized: input.toLowerCase().trim(),
    matches,
    entities: extractEntities(input, matches),
    context: context ?? {
      messages: [],
      sessionId: '',
      startTime: new Date(),
      lastInteraction: new Date(),
      metadata: {},
    },
  };
  
  try {
    logger.debug(`Executing command: ${command.name}`);
    const startTime = Date.now();
    const result = await command.execute(args);
    logger.timing(`Command ${command.name}`, startTime);
    return result;
  } catch (error) {
    logger.error(`Command ${command.name} failed:`, error);
    return {
      success: false,
      response: `Sorry, something went wrong while processing that command.`,
      shouldSpeak: true,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

/**
 * Extract entities from command input
 */
function extractEntities(input: string, matches: RegExpMatchArray | null): Record<string, string> {
  const entities: Record<string, string> = {};
  
  if (matches) {
    // Store capture groups as entities
    matches.slice(1).forEach((value, index) => {
      if (value) {
        entities[`param${index + 1}`] = value;
        
        // Try to determine entity type
        if (/^\d+$/.test(value)) {
          entities['level'] = value;
          entities['number'] = value;
        } else {
          entities['text'] = value;
          entities['app'] = value;
        }
      }
    });
  }
  
  return entities;
}

/**
 * Get all commands
 */
export function getAllCommands(): Command[] {
  return [...allCommands];
}

/**
 * Get commands by category
 */
export function getCommandsByCategory(category: CommandCategory): Command[] {
  return commandsByCategory[category] ?? [];
}

/**
 * Get all command categories
 */
export function getCategories(): CommandCategory[] {
  return Object.keys(commandsByCategory) as CommandCategory[];
}

/**
 * Search commands by name or description
 */
export function searchCommands(query: string): Command[] {
  const lowerQuery = query.toLowerCase();
  return allCommands.filter(cmd => 
    cmd.name.toLowerCase().includes(lowerQuery) ||
    cmd.description.toLowerCase().includes(lowerQuery) ||
    cmd.examples.some(ex => ex.toLowerCase().includes(lowerQuery))
  );
}

/**
 * Get command help text
 */
export function getCommandHelp(commandName: string): string | null {
  const command = allCommands.find(c => c.name === commandName);
  if (!command) return null;
  
  return `
**${command.name}**
${command.description}

**Examples:**
${command.examples.map(ex => `• "${ex}"`).join('\n')}
`.trim();
}

/**
 * Get all help text
 */
export function getAllHelp(): string {
  const categories: Record<CommandCategory, string[]> = {
    system: [],
    apps: [],
    media: [],
    utilities: [],
    conversation: [],
  };
  
  for (const command of allCommands) {
    categories[command.category].push(`• ${command.name}: ${command.description}`);
  }
  
  return Object.entries(categories)
    .filter(([_, cmds]) => cmds.length > 0)
    .map(([category, cmds]) => `**${category.toUpperCase()}**\n${cmds.join('\n')}`)
    .join('\n\n');
}

// Export individual command modules
export { systemCommands } from './system.js';
export { appCommands } from './apps.js';
export { mediaCommands } from './media.js';
export { utilityCommands } from './utilities.js';

// Default export
export default {
  findCommand,
  executeCommand,
  getAllCommands,
  getCommandsByCategory,
  getCategories,
  searchCommands,
  getCommandHelp,
  getAllHelp,
};

