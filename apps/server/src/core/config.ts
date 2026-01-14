/**
 * Configuration loader for Jarvis Assistant Backend
 */

import { config as loadEnv } from 'dotenv';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { AssistantConfig, DeepPartial, LogLevel } from './types.js';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env file from multiple possible locations
const envPaths = [
  resolve(__dirname, '../../../../.env'),      // Project root (from src/core/)
  resolve(__dirname, '../../../.env'),         // apps/server/.env
  resolve(process.cwd(), '.env'),              // Current working directory
  resolve(process.cwd(), '../../.env'),        // Project root from apps/server
];

let envLoaded = false;
for (const envPath of envPaths) {
  if (existsSync(envPath)) {
    loadEnv({ path: envPath });
    envLoaded = true;
    console.log(`✅ Loaded .env from: ${envPath}`);
    break;
  }
}

if (!envLoaded) {
  console.warn('⚠️  No .env file found. Run "make setup-env" in project root.');
}

/**
 * Default configuration (inline fallback)
 */
const DEFAULT_CONFIG: AssistantConfig = {
  assistant: {
    name: 'Jarvis',
    wakeWord: 'jarvis',
    language: 'en-US',
  },
  ollama: {
    host: 'http://localhost:11434',
    model: 'llama3.2:3b',
    timeout: 30000,
  },
  tts: {
    voice: 'adam',
    rate: 1.0,
    enabled: true,
    elevenlabs: {
      apiKey: process.env.ELEVENLABS_API_KEY ?? '',
      voiceId: 'pNInz6obpgDQGcFmaJgB', // Adam - deep authoritative voice
      modelId: 'eleven_monolingual_v1',
      stability: 0.5,
      similarityBoost: 0.75,
    },
  },
  audio: {
    sampleRate: 16000,
    channels: 1,
    silenceThreshold: 2000,
    recordingTimeout: 10000,
  },
  logging: {
    level: 'info',
    showTimestamp: true,
    colorized: true,
  },
  commands: {
    enableSystem: true,
    enableApps: true,
    enableMedia: true,
    enableUtilities: true,
  },
};

/**
 * Load default configuration from JSON file or use inline defaults
 */
function loadDefaultConfig(): AssistantConfig {
  // Try multiple paths for config file
  const possiblePaths = [
    resolve(__dirname, '../../config/default.json'),
    resolve(__dirname, '../../../config/default.json'),
    resolve(process.cwd(), 'config/default.json'),
  ];

  for (const configPath of possiblePaths) {
    if (existsSync(configPath)) {
      try {
        const configContent = readFileSync(configPath, 'utf-8');
        return JSON.parse(configContent) as AssistantConfig;
      } catch {
        // Continue to next path
      }
    }
  }

  // Return inline defaults if no config file found
  return DEFAULT_CONFIG;
}

/**
 * Get environment variable with type conversion
 */
function getEnv(key: string): string | undefined {
  return process.env[key];
}

function getEnvNumber(key: string): number | undefined {
  const value = getEnv(key);
  return value ? parseInt(value, 10) : undefined;
}

function getEnvBoolean(key: string): boolean | undefined {
  const value = getEnv(key);
  if (value === undefined) return undefined;
  return value.toLowerCase() === 'true' || value === '1';
}

/**
 * Get environment variable as float
 */
function getEnvFloat(key: string): number | undefined {
  const value = getEnv(key);
  return value ? parseFloat(value) : undefined;
}

/**
 * Override default config with environment variables
 */
function applyEnvOverrides(config: AssistantConfig): AssistantConfig {
  return {
    assistant: {
      name: getEnv('ASSISTANT_NAME') ?? config.assistant.name,
      wakeWord: getEnv('WAKE_WORD') ?? config.assistant.wakeWord,
      language: getEnv('LANGUAGE') ?? config.assistant.language,
    },
    ollama: {
      host: getEnv('OLLAMA_HOST') ?? config.ollama.host,
      model: getEnv('OLLAMA_MODEL') ?? config.ollama.model,
      timeout: getEnvNumber('OLLAMA_TIMEOUT') ?? config.ollama.timeout,
    },
    tts: {
      voice: getEnv('TTS_VOICE') ?? config.tts.voice,
      rate: getEnvFloat('TTS_RATE') ?? config.tts.rate,
      enabled: getEnvBoolean('TTS_ENABLED') ?? config.tts.enabled,
      elevenlabs: {
        apiKey: getEnv('ELEVENLABS_API_KEY') ?? config.tts.elevenlabs?.apiKey ?? '',
        voiceId: getEnv('TTS_VOICE_ID') ?? config.tts.elevenlabs?.voiceId ?? 'pNInz6obpgDQGcFmaJgB',
        modelId: (getEnv('TTS_MODEL') as 'eleven_monolingual_v1' | 'eleven_multilingual_v2' | 'eleven_turbo_v2') ?? config.tts.elevenlabs?.modelId ?? 'eleven_monolingual_v1',
        stability: getEnvFloat('TTS_STABILITY') ?? config.tts.elevenlabs?.stability ?? 0.5,
        similarityBoost: getEnvFloat('TTS_SIMILARITY_BOOST') ?? config.tts.elevenlabs?.similarityBoost ?? 0.75,
      },
    },
    audio: {
      sampleRate: getEnvNumber('AUDIO_SAMPLE_RATE') ?? config.audio.sampleRate,
      channels: getEnvNumber('AUDIO_CHANNELS') ?? config.audio.channels,
      silenceThreshold: getEnvNumber('AUDIO_SILENCE_THRESHOLD') ?? config.audio.silenceThreshold,
      recordingTimeout: getEnvNumber('AUDIO_RECORDING_TIMEOUT') ?? config.audio.recordingTimeout,
    },
    logging: {
      level: (getEnv('LOG_LEVEL') as LogLevel) ?? config.logging.level,
      showTimestamp: getEnvBoolean('LOG_TIMESTAMP') ?? config.logging.showTimestamp,
      colorized: getEnvBoolean('LOG_COLORIZED') ?? config.logging.colorized,
    },
    commands: {
      enableSystem: getEnvBoolean('ENABLE_SYSTEM_COMMANDS') ?? config.commands.enableSystem,
      enableApps: getEnvBoolean('ENABLE_APP_COMMANDS') ?? config.commands.enableApps,
      enableMedia: getEnvBoolean('ENABLE_MEDIA_COMMANDS') ?? config.commands.enableMedia,
      enableUtilities: getEnvBoolean('ENABLE_UTILITY_COMMANDS') ?? config.commands.enableUtilities,
    },
  };
}

/**
 * Deep merge two objects
 */
function deepMerge<T extends object>(target: T, source: DeepPartial<T>): T {
  const result = { ...target };

  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      const sourceValue = source[key];
      const targetValue = result[key];

      if (
        sourceValue !== undefined &&
        typeof sourceValue === 'object' &&
        sourceValue !== null &&
        !Array.isArray(sourceValue) &&
        typeof targetValue === 'object' &&
        targetValue !== null
      ) {
        (result as Record<string, unknown>)[key] = deepMerge(
          targetValue as object,
          sourceValue as DeepPartial<object>
        );
      } else if (sourceValue !== undefined) {
        (result as Record<string, unknown>)[key] = sourceValue;
      }
    }
  }

  return result;
}

/**
 * Validate configuration
 */
function validateConfig(config: AssistantConfig): void {
  if (!config.assistant.name || config.assistant.name.length === 0) {
    throw new Error('Assistant name is required');
  }

  if (!config.assistant.wakeWord || config.assistant.wakeWord.length === 0) {
    throw new Error('Wake word is required');
  }

  // TTS rate validation - maps to stability (0.5-1.5 reasonable range)
  const rate = config.tts.rate;
  if (rate < 0.5 || rate > 2.0) {
    throw new Error('TTS rate must be between 0.5 and 2.0');
  }

  // TTS voice validation (ElevenLabs voices)
  const validVoices = ['rachel', 'adam', 'antoni', 'elli', 'josh', 'arnold', 'domi', 'bella'];
  if (!validVoices.includes(config.tts.voice.toLowerCase())) {
    // Allow custom voice IDs - just log a warning
    console.log(`Note: Using custom voice "${config.tts.voice}"`);
  }

  if (config.audio.sampleRate < 8000 || config.audio.sampleRate > 48000) {
    throw new Error('Audio sample rate must be between 8000 and 48000');
  }

  if (config.audio.channels < 1 || config.audio.channels > 2) {
    throw new Error('Audio channels must be 1 or 2');
  }

  const validLevels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
  if (!validLevels.includes(config.logging.level)) {
    throw new Error(`Log level must be one of: ${validLevels.join(', ')}`);
  }
}

/**
 * Load and return the final configuration
 */
export function loadConfig(overrides?: DeepPartial<AssistantConfig>): AssistantConfig {
  const defaultConfig = loadDefaultConfig();
  let config = applyEnvOverrides(defaultConfig);

  if (overrides) {
    config = deepMerge(config, overrides);
  }

  validateConfig(config);
  return config;
}

// Singleton instance
let configInstance: AssistantConfig | null = null;

export function getConfig(): AssistantConfig {
  if (!configInstance) {
    configInstance = loadConfig();
  }
  return configInstance;
}

export function resetConfig(): void {
  configInstance = null;
}

export default {
  load: loadConfig,
  get: getConfig,
  reset: resetConfig,
};

