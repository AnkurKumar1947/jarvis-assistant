/**
 * Conversation Memory - Store and retrieve conversation history
 * Provides context for LLM interactions
 */

import { logger } from '../utils/logger.js';
import type { ConversationMessage, ConversationContext } from '../core/types.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Memory configuration
 */
export interface MemoryConfig {
  maxMessages: number;       // Maximum messages to keep in memory
  maxTokens: number;         // Approximate max tokens for context
  sessionTimeout: number;    // Session timeout in ms
}

const DEFAULT_CONFIG: MemoryConfig = {
  maxMessages: 20,
  maxTokens: 2000,
  sessionTimeout: 30 * 60 * 1000, // 30 minutes
};

/**
 * Conversation Memory class
 */
export class ConversationMemory {
  private config: MemoryConfig;
  private messages: ConversationMessage[] = [];
  private sessionId: string;
  private startTime: Date;
  private lastInteraction: Date;
  private metadata: Record<string, unknown> = {};

  constructor(config: Partial<MemoryConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.sessionId = uuidv4();
    this.startTime = new Date();
    this.lastInteraction = new Date();
  }

  /**
   * Add a user message to memory
   */
  addUserMessage(content: string, metadata?: Record<string, unknown>): ConversationMessage {
    const message: ConversationMessage = {
      id: uuidv4(),
      role: 'user',
      content,
      timestamp: new Date(),
      metadata: metadata as ConversationMessage['metadata'],
    };

    this.messages.push(message);
    this.lastInteraction = new Date();
    this.trimMemory();
    
    logger.debug(`Added user message: "${content.substring(0, 50)}..."`);
    return message;
  }

  /**
   * Add an assistant message to memory
   */
  addAssistantMessage(content: string, metadata?: Record<string, unknown>): ConversationMessage {
    const message: ConversationMessage = {
      id: uuidv4(),
      role: 'assistant',
      content,
      timestamp: new Date(),
      metadata: metadata as ConversationMessage['metadata'],
    };

    this.messages.push(message);
    this.lastInteraction = new Date();
    this.trimMemory();
    
    logger.debug(`Added assistant message: "${content.substring(0, 50)}..."`);
    return message;
  }

  /**
   * Add a system message to memory
   */
  addSystemMessage(content: string): ConversationMessage {
    const message: ConversationMessage = {
      id: uuidv4(),
      role: 'system',
      content,
      timestamp: new Date(),
    };

    this.messages.unshift(message); // System messages go at the beginning
    return message;
  }

  /**
   * Get all messages
   */
  getMessages(): ConversationMessage[] {
    return [...this.messages];
  }

  /**
   * Get the last N messages
   */
  getRecentMessages(count: number): ConversationMessage[] {
    return this.messages.slice(-count);
  }

  /**
   * Get full conversation context
   */
  getContext(): ConversationContext {
    return {
      messages: this.getMessages(),
      sessionId: this.sessionId,
      startTime: this.startTime,
      lastInteraction: this.lastInteraction,
      metadata: { ...this.metadata },
    };
  }

  /**
   * Clear all messages
   */
  clear(): void {
    this.messages = [];
    logger.debug('Memory cleared');
  }

  /**
   * Start a new session
   */
  newSession(): void {
    this.messages = [];
    this.sessionId = uuidv4();
    this.startTime = new Date();
    this.lastInteraction = new Date();
    this.metadata = {};
    logger.debug(`New session started: ${this.sessionId}`);
  }

  /**
   * Check if session has expired
   */
  isSessionExpired(): boolean {
    const elapsed = Date.now() - this.lastInteraction.getTime();
    return elapsed > this.config.sessionTimeout;
  }

  /**
   * Get session info
   */
  getSessionInfo(): {
    sessionId: string;
    messageCount: number;
    duration: number;
    lastInteraction: Date;
  } {
    return {
      sessionId: this.sessionId,
      messageCount: this.messages.length,
      duration: Date.now() - this.startTime.getTime(),
      lastInteraction: this.lastInteraction,
    };
  }

  /**
   * Set metadata value
   */
  setMetadata(key: string, value: unknown): void {
    this.metadata[key] = value;
  }

  /**
   * Get metadata value
   */
  getMetadata(key: string): unknown {
    return this.metadata[key];
  }

  /**
   * Trim memory to stay within limits
   */
  private trimMemory(): void {
    // Keep system messages, trim others
    const systemMessages = this.messages.filter(m => m.role === 'system');
    const otherMessages = this.messages.filter(m => m.role !== 'system');

    // Trim to max messages
    if (otherMessages.length > this.config.maxMessages) {
      const trimmed = otherMessages.slice(-this.config.maxMessages);
      this.messages = [...systemMessages, ...trimmed];
      logger.debug(`Memory trimmed to ${this.config.maxMessages} messages`);
    }
  }

  /**
   * Get approximate token count for messages
   */
  getApproximateTokens(): number {
    // Rough estimate: 4 characters per token
    const totalChars = this.messages.reduce((sum, m) => sum + m.content.length, 0);
    return Math.ceil(totalChars / 4);
  }

  /**
   * Format messages for LLM prompt
   */
  formatForPrompt(): string {
    return this.messages
      .map(m => `${m.role.toUpperCase()}: ${m.content}`)
      .join('\n\n');
  }

  /**
   * Search messages by content
   */
  searchMessages(query: string): ConversationMessage[] {
    const lowerQuery = query.toLowerCase();
    return this.messages.filter(m => 
      m.content.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Get messages by role
   */
  getMessagesByRole(role: 'user' | 'assistant' | 'system'): ConversationMessage[] {
    return this.messages.filter(m => m.role === role);
  }

  /**
   * Export conversation for persistence
   */
  export(): {
    sessionId: string;
    messages: ConversationMessage[];
    startTime: string;
    lastInteraction: string;
    metadata: Record<string, unknown>;
  } {
    return {
      sessionId: this.sessionId,
      messages: this.messages,
      startTime: this.startTime.toISOString(),
      lastInteraction: this.lastInteraction.toISOString(),
      metadata: this.metadata,
    };
  }

  /**
   * Import conversation from persistence
   */
  import(data: {
    sessionId: string;
    messages: ConversationMessage[];
    startTime: string;
    lastInteraction: string;
    metadata?: Record<string, unknown>;
  }): void {
    this.sessionId = data.sessionId;
    this.messages = data.messages.map(m => ({
      ...m,
      timestamp: new Date(m.timestamp),
    }));
    this.startTime = new Date(data.startTime);
    this.lastInteraction = new Date(data.lastInteraction);
    this.metadata = data.metadata ?? {};
    logger.debug(`Imported session: ${this.sessionId}`);
  }
}

// Default memory instance
let defaultMemory: ConversationMemory | null = null;

/**
 * Get or create the default memory instance
 */
export function getMemory(config?: Partial<MemoryConfig>): ConversationMemory {
  if (!defaultMemory) {
    defaultMemory = new ConversationMemory(config);
  }
  return defaultMemory;
}

// Default export
export default ConversationMemory;

