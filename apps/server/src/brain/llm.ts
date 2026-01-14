/**
 * LLM Integration - Ollama local LLM
 * Handles communication with local Ollama instance
 */

import { logger } from '../utils/logger.js';
import type { LLMMessage, LLMRequestOptions, LLMResponse } from '../core/types.js';

// Default Ollama configuration
const DEFAULT_OLLAMA_HOST = 'http://localhost:11434';
const DEFAULT_MODEL = 'llama2';
const DEFAULT_TIMEOUT = 60000;

/**
 * LLM Client class for Ollama
 */
export class LLMClient {
  private host: string;
  private model: string;
  private timeout: number;

  constructor(options: {
    host?: string;
    model?: string;
    timeout?: number;
  } = {}) {
    this.host = options.host ?? DEFAULT_OLLAMA_HOST;
    this.model = options.model ?? DEFAULT_MODEL;
    this.timeout = options.timeout ?? DEFAULT_TIMEOUT;
  }

  /**
   * Check if Ollama is running
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.host}/api/tags`, {
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get list of available models
   */
  async listModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.host}/api/tags`);
      if (!response.ok) {
        throw new Error(`Failed to list models: ${response.statusText}`);
      }
      const data = await response.json() as { models: Array<{ name: string }> };
      return data.models.map(m => m.name);
    } catch (error) {
      logger.error('Failed to list models:', error);
      return [];
    }
  }

  /**
   * Generate a response from the LLM
   */
  async generate(
    prompt: string,
    options: LLMRequestOptions = {}
  ): Promise<LLMResponse> {
    const startTime = Date.now();
    const model = options.model ?? this.model;

    try {
      logger.debug(`Generating response with ${model}...`);

      const response = await fetch(`${this.host}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          prompt,
          stream: false,
          options: {
            temperature: options.temperature ?? 0.7,
            num_predict: options.maxTokens ?? 500,
          },
        }),
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        throw new Error(`Ollama error: ${response.statusText}`);
      }

      const data = await response.json() as {
        response: string;
        model: string;
        done: boolean;
        prompt_eval_count?: number;
        eval_count?: number;
      };

      const processingTime = Date.now() - startTime;
      logger.timing('LLM generation', startTime);

      return {
        content: data.response,
        model: data.model,
        finishReason: data.done ? 'stop' : 'length',
        usage: {
          promptTokens: data.prompt_eval_count ?? 0,
          completionTokens: data.eval_count ?? 0,
          totalTokens: (data.prompt_eval_count ?? 0) + (data.eval_count ?? 0),
        },
        processingTime,
      };
    } catch (error) {
      logger.error('LLM generation error:', error);
      throw error;
    }
  }

  /**
   * Chat with the LLM using message history
   */
  async chat(
    messages: LLMMessage[],
    options: LLMRequestOptions = {}
  ): Promise<LLMResponse> {
    const startTime = Date.now();
    const model = options.model ?? this.model;

    try {
      logger.debug(`Chatting with ${model}...`);

      // Build the messages array for Ollama
      const ollamaMessages = messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      }));

      // Add system prompt if provided
      if (options.systemPrompt) {
        ollamaMessages.unshift({
          role: 'system',
          content: options.systemPrompt,
        });
      }

      const response = await fetch(`${this.host}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: ollamaMessages,
          stream: false,
          options: {
            temperature: options.temperature ?? 0.7,
            num_predict: options.maxTokens ?? 500,
          },
        }),
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        throw new Error(`Ollama error: ${response.statusText}`);
      }

      const data = await response.json() as {
        message: { content: string };
        model: string;
        done: boolean;
        prompt_eval_count?: number;
        eval_count?: number;
      };

      const processingTime = Date.now() - startTime;
      logger.timing('LLM chat', startTime);

      return {
        content: data.message.content,
        model: data.model,
        finishReason: data.done ? 'stop' : 'length',
        usage: {
          promptTokens: data.prompt_eval_count ?? 0,
          completionTokens: data.eval_count ?? 0,
          totalTokens: (data.prompt_eval_count ?? 0) + (data.eval_count ?? 0),
        },
        processingTime,
      };
    } catch (error) {
      logger.error('LLM chat error:', error);
      throw error;
    }
  }

  /**
   * Set the model to use
   */
  setModel(model: string): void {
    this.model = model;
    logger.debug(`Model set to: ${model}`);
  }

  /**
   * Get current model
   */
  getModel(): string {
    return this.model;
  }

  /**
   * Pull a model from Ollama
   */
  async pullModel(model: string): Promise<void> {
    logger.info(`Pulling model: ${model}...`);

    const response = await fetch(`${this.host}/api/pull`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: model }),
    });

    if (!response.ok) {
      throw new Error(`Failed to pull model: ${response.statusText}`);
    }

    logger.success(`Model ${model} pulled successfully`);
  }
}

// Default LLM client instance
let defaultClient: LLMClient | null = null;

/**
 * Get or create the default LLM client
 */
export function getLLMClient(options?: {
  host?: string;
  model?: string;
  timeout?: number;
}): LLMClient {
  if (!defaultClient) {
    defaultClient = new LLMClient(options);
  }
  return defaultClient;
}

/**
 * Quick generate function
 */
export async function generate(
  prompt: string,
  options?: LLMRequestOptions
): Promise<string> {
  const client = getLLMClient();
  const response = await client.generate(prompt, options);
  return response.content;
}

/**
 * Quick chat function
 */
export async function chat(
  messages: LLMMessage[],
  options?: LLMRequestOptions
): Promise<string> {
  const client = getLLMClient();
  const response = await client.chat(messages, options);
  return response.content;
}

// Default export
export default LLMClient;

