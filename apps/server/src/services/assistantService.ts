/**
 * Assistant Service
 * Handles message processing and assistant state
 * Integrates with commands, LLM, memory, and speech modules
 */

import { EventEmitter } from 'events';
import type { 
  AssistantConfig, 
  AssistantState, 
  LLMMessage,
  VoiceInfo
} from '../core/types.js';
import { logger } from '../utils/logger.js';
import { executeCommand, findCommand } from '../commands/index.js';
import { ConversationMemory, getMemory } from '../brain/memory.js';
import { LLMClient, getLLMClient } from '../brain/llm.js';
import { parseIntent } from '../brain/intentParser.js';
import { SpeechSynthesizer } from '../speech/synthesizer.js';

// Message type for socket communication
export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    source?: 'voice' | 'text';
    processingTime?: number;
    intent?: string;
    command?: string;
  };
}

interface AssistantServiceEvents {
  stateChange: (state: AssistantState) => void;
  message: (message: Message) => void;
}

class AssistantService extends EventEmitter {
  private state: AssistantState = 'idle';
  private config: AssistantConfig | null = null;
  private messageHistory: Message[] = [];
  private memory: ConversationMemory;
  private llmClient: LLMClient | null = null;
  private synthesizer: SpeechSynthesizer | null = null;
  private useLLM: boolean = false;

  constructor() {
    super();
    this.memory = getMemory();
  }

  /**
   * Initialize the service with config
   */
  async initialize(config: AssistantConfig): Promise<void> {
    this.config = config;
    this.setState('initializing');
    
    logger.info(`Initializing ${config.assistant.name}...`);

    // Initialize TTS if enabled
    if (config.tts.enabled) {
      this.synthesizer = new SpeechSynthesizer(config.tts);
      const providerName = this.synthesizer.getActiveProviderName();
      const voice = this.synthesizer.getVoice();
      logger.info(`TTS initialized: provider=${providerName}, voice=${voice}`);
    }

    // Try to initialize LLM
    try {
      this.llmClient = getLLMClient({
        host: config.ollama.host,
        model: config.ollama.model,
        timeout: config.ollama.timeout,
      });
      
      // Check if Ollama is available
      const isAvailable = await this.llmClient.isAvailable();
      if (isAvailable) {
        this.useLLM = true;
        logger.success(`LLM connected: ${config.ollama.model}`);
      } else {
        logger.warn('Ollama not available - using rule-based responses');
        this.useLLM = false;
      }
    } catch (error) {
      logger.warn('Failed to initialize LLM:', error);
      this.useLLM = false;
    }

    this.setState('idle');
    logger.success(`${config.assistant.name} initialized!`);
  }

  /**
   * Get current state
   */
  getState(): AssistantState {
    return this.state;
  }

  /**
   * Set assistant state
   */
  setState(newState: AssistantState): void {
    const previousState = this.state;
    this.state = newState;
    logger.state(`${previousState} → ${newState}`);
    this.emit('stateChange', newState);
  }

  /**
   * Process a user message and generate response
   */
  async processMessage(content: string, source: 'voice' | 'text' = 'text'): Promise<Message> {
    const startTime = Date.now();
    
    // Log user message
    logger.user(content);

    // Add user message to memory
    this.memory.addUserMessage(content);

    // Add user message to history
    const userMessage: Message = {
      id: this.generateId(),
      role: 'user',
      content,
      timestamp: new Date(),
      metadata: { source },
    };
    this.messageHistory.push(userMessage);
    this.emit('message', userMessage);

    // Update state
    this.setState('processing');

    // Parse intent
    const intent = parseIntent(content);
    logger.debug(`Intent: ${intent.intent} (confidence: ${intent.confidence})`);

    // Process and generate response
    let response: string;
    let commandName: string | undefined;

    // Try to execute as command first
    const command = findCommand(content);
    if (command) {
      this.setState('executing');
      const result = await executeCommand(content, this.memory.getContext());
      response = result.response;
      commandName = command.name;
      logger.debug(`Command executed: ${command.name}`);
    } else if (this.useLLM && this.llmClient) {
      // Use LLM for unknown inputs
      this.setState('thinking');
      response = await this.generateLLMResponse(content);
    } else {
      // Fallback to rule-based
      this.setState('thinking');
      response = await this.generateRuleBasedResponse(content);
    }

    // Add assistant response to memory
    this.memory.addAssistantMessage(response);

    // Create assistant message
    const assistantMessage: Message = {
      id: this.generateId(),
      role: 'assistant',
      content: response,
      timestamp: new Date(),
      metadata: {
        processingTime: Date.now() - startTime,
        intent: intent.intent,
        command: commandName,
      },
    };
    this.messageHistory.push(assistantMessage);

    // Log and emit
    logger.assistant(response);
    this.emit('message', assistantMessage);

    // Update state to speaking
    this.setState('speaking');

    // Speak the response if TTS is enabled
    if (this.synthesizer && this.config?.tts.enabled) {
      try {
        await this.synthesizer.speak(response);
      } catch (error) {
        // Log TTS errors but don't crash - response still works via text
        const errorMsg = error instanceof Error ? error.message : 'Unknown TTS error';
        if (errorMsg.includes('credits') || errorMsg.includes('billing')) {
          logger.warn('TTS disabled - add credits at platform.openai.com');
        } else {
          logger.warn(`TTS error: ${errorMsg}`);
        }
      }
    }
    
    // Return to idle after speaking
    setTimeout(() => {
      this.setState('idle');
    }, 500);

    return assistantMessage;
  }

  /**
   * Generate response using LLM
   */
  private async generateLLMResponse(input: string): Promise<string> {
    if (!this.llmClient) {
      return this.generateRuleBasedResponse(input);
    }

    try {
      const name = this.config?.assistant.name ?? 'Jarvis';
      
      // Build conversation history for LLM
      const messages: LLMMessage[] = this.memory.getRecentMessages(10).map(m => ({
        role: m.role,
        content: m.content,
      }));

      // Add current message
      messages.push({ role: 'user', content: input });

      const systemPrompt = `You are ${name}, an intelligent AI assistant similar to JARVIS from Iron Man. 
You are helpful, witty, and sophisticated. Keep responses concise but informative.
You can help with:
- Answering questions
- Having conversations
- Providing information
- General assistance

If asked to do something you can't do (like control physical devices), politely explain your limitations.`;

      const llmResponse = await this.llmClient.chat(messages, {
        systemPrompt,
        temperature: 0.7,
        maxTokens: 300,
      });

      return llmResponse.content;
    } catch (error) {
      logger.error('LLM error:', error);
      return this.generateRuleBasedResponse(input);
    }
  }

  /**
   * Generate response using rule-based system (fallback)
   */
  private async generateRuleBasedResponse(input: string): Promise<string> {
    const lowerInput = input.toLowerCase().trim();
    const name = this.config?.assistant.name ?? 'Jarvis';

    // Time
    if (lowerInput.includes('time') || lowerInput.includes('what time')) {
      const time = new Date().toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
      return `The current time is ${time}.`;
    }

    // Date
    if (lowerInput.includes('date') || lowerInput.includes('what day') || lowerInput.includes('today')) {
      const date = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      return `Today is ${date}.`;
    }

    // Greetings
    if (lowerInput.match(/^(hello|hi|hey|good morning|good afternoon|good evening)/)) {
      const hour = new Date().getHours();
      let greeting = 'Good evening';
      if (hour < 12) greeting = 'Good morning';
      else if (hour < 17) greeting = 'Good afternoon';
      return `${greeting}! How may I assist you?`;
    }

    // Identity
    if (lowerInput.includes('who are you') || lowerInput.includes('your name')) {
      return `I am ${name} - Just A Rather Very Intelligent System. Your personal AI assistant, at your service.`;
    }

    // Help
    if (lowerInput === 'help' || lowerInput.includes('what can you do')) {
      return `I can help you with:
• System: volume, brightness, battery, notifications
• Apps: open, close, list running apps  
• Media: play, pause, next/previous track
• Utilities: time, date, search files, calculations
• Conversation: general chat and questions

Just tell me what you need!`;
    }

    // Exit/Bye
    if (lowerInput === 'exit' || lowerInput === 'bye' || lowerInput === 'goodbye') {
      return 'Goodbye! Have a great day!';
    }

    // Status
    if (lowerInput.includes('status') || lowerInput.includes('how are you')) {
      const llmStatus = this.useLLM ? 'LLM connected' : 'Rule-based mode';
      return `All systems operational! ${llmStatus}. Ready to assist.`;
    }

    // Default response
    return `I heard: "${input}". ${this.useLLM ? '' : "I'm in demo mode. Connect Ollama for full AI capabilities."}`;
  }

  /**
   * Get message history
   */
  getMessageHistory(): Message[] {
    return [...this.messageHistory];
  }

  /**
   * Clear message history
   */
  clearHistory(): void {
    this.messageHistory = [];
    this.memory.clear();
    logger.info('Message history cleared');
  }

  /**
   * Start listening (voice mode)
   */
  startListening(): void {
    this.setState('listening');
    logger.info('Listening started');
  }

  /**
   * Stop listening
   */
  stopListening(): void {
    this.setState('idle');
    logger.info('Listening stopped');
  }

  /**
   * Check if LLM is available
   */
  isLLMEnabled(): boolean {
    return this.useLLM;
  }

  /**
   * Set TTS voice
   */
  setVoice(voice: string): void {
    if (this.synthesizer) {
      this.synthesizer.setVoice(voice);
    }
    if (this.config) {
      this.config.tts.voice = voice;
    }
    logger.info(`Voice changed to: ${voice}`);
  }

  /**
   * Set TTS rate
   */
  setRate(rate: number): void {
    if (this.synthesizer) {
      this.synthesizer.setRate(rate);
    }
    if (this.config) {
      this.config.tts.rate = rate;
    }
    logger.info(`Speech rate changed to: ${rate}`);
  }

  /**
   * Enable/disable TTS
   */
  setTTSEnabled(enabled: boolean): void {
    if (this.synthesizer) {
      this.synthesizer.setEnabled(enabled);
    }
    if (this.config) {
      this.config.tts.enabled = enabled;
    }
    logger.info(`TTS ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Get current voice settings
   */
  getVoiceSettings(): { 
    voice: string; 
    rate: number; 
    enabled: boolean;
    available: boolean;
  } {
    const sessionInfo = this.synthesizer?.getSessionInfo();
    return {
      voice: this.synthesizer?.getVoice() ?? this.config?.tts.voice ?? 'en_GB-alan-medium',
      rate: this.synthesizer?.getRate() ?? this.config?.tts.rate ?? 1.0,
      enabled: this.synthesizer?.isEnabled() ?? this.config?.tts.enabled ?? true,
      available: sessionInfo?.available ?? false,
    };
  }

  /**
   * Get available voices
   */
  async getAvailableVoices(): Promise<VoiceInfo[]> {
    if (!this.synthesizer) return [];
    return this.synthesizer.getAvailableVoices();
  }

  /**
   * Test a voice
   */
  async testVoice(voice: string, rate: number, text?: string): Promise<void> {
    if (this.synthesizer) {
      await this.synthesizer.testVoice(voice, rate, text);
    }
  }

  /**
   * Stop current speech
   */
  async stopSpeaking(): Promise<void> {
    if (this.synthesizer) {
      await this.synthesizer.stop();
    }
  }

  /**
   * Get session info
   */
  getSessionInfo(): {
    state: AssistantState;
    messageCount: number;
    llmEnabled: boolean;
    ttsEnabled: boolean;
    sessionDuration: number;
  } {
    return {
      state: this.state,
      messageCount: this.messageHistory.length,
      llmEnabled: this.useLLM,
      ttsEnabled: this.config?.tts.enabled ?? false,
      sessionDuration: this.memory.getSessionInfo().duration,
    };
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }
}

// Export singleton
export const assistantService = new AssistantService();
