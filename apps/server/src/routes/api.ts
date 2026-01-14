/**
 * REST API Routes
 */

import { Router, type Express } from 'express';
import type { AssistantConfig, TTSProvider } from '../core/types.js';
import { assistantService } from '../services/assistantService.js';
import { metricsService } from '../services/metricsService.js';
import { logger } from '../utils/logger.js';

/**
 * Setup REST API routes
 */
export function setupRoutes(app: Express, config: AssistantConfig): void {
  const router = Router();

  // GET /api/status - Server status
  router.get('/status', (req, res) => {
    const voiceSettings = assistantService.getVoiceSettings();
    res.json({
      status: 'ok',
      assistant: {
        name: config.assistant.name,
        state: assistantService.getState(),
      },
      tts: {
        provider: voiceSettings.provider,
        voice: voiceSettings.voice,
        enabled: voiceSettings.enabled,
        piperAvailable: voiceSettings.piperAvailable,
        macosAvailable: voiceSettings.macosAvailable,
      },
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  // GET /api/metrics - Current system metrics
  router.get('/metrics', async (req, res) => {
    try {
      const metrics = await metricsService.getMetrics();
      res.json(metrics);
    } catch (error) {
      logger.error('Failed to get metrics:', error);
      res.status(500).json({ error: 'Failed to get metrics' });
    }
  });

  // GET /api/state - Assistant state
  router.get('/state', (req, res) => {
    res.json({
      state: assistantService.getState(),
      timestamp: new Date().toISOString(),
    });
  });

  // GET /api/history - Message history
  router.get('/history', (req, res) => {
    res.json({
      messages: assistantService.getMessageHistory(),
      count: assistantService.getMessageHistory().length,
    });
  });

  // POST /api/message - Send a message
  router.post('/message', async (req, res) => {
    try {
      const { content, source = 'text' } = req.body;

      if (!content || typeof content !== 'string') {
        res.status(400).json({ error: 'Message content is required' });
        return;
      }

      const response = await assistantService.processMessage(content, source);
      res.json(response);
    } catch (error) {
      logger.error('Failed to process message:', error);
      res.status(500).json({ error: 'Failed to process message' });
    }
  });

  // DELETE /api/history - Clear message history
  router.delete('/history', (req, res) => {
    assistantService.clearHistory();
    res.json({ success: true, message: 'History cleared' });
  });

  // GET /api/config - Get current config (sanitized)
  router.get('/config', (req, res) => {
    const voiceSettings = assistantService.getVoiceSettings();
    res.json({
      assistant: {
        name: config.assistant.name,
        language: config.assistant.language,
      },
      tts: {
        provider: voiceSettings.provider,
        voice: voiceSettings.voice,
        rate: voiceSettings.rate,
        enabled: voiceSettings.enabled,
        piperAvailable: voiceSettings.piperAvailable,
        macosAvailable: voiceSettings.macosAvailable,
      },
    });
  });

  // ============================================================================
  // Voice Settings Routes
  // ============================================================================

  // GET /api/voices - Get all available voices from all providers
  router.get('/voices', async (req, res) => {
    try {
      const voices = await assistantService.getAvailableVoices();
      const voicesByProvider = await assistantService.getVoicesByProvider();
      const voiceSettings = assistantService.getVoiceSettings();
      
      // Group by language/country
      const grouped = voices.reduce((acc, voice) => {
        const key = `${voice.language} (${voice.country})`;
        if (!acc[key]) {
          acc[key] = [];
        }
        acc[key].push(voice);
        return acc;
      }, {} as Record<string, typeof voices>);

      res.json({
        voices,
        grouped,
        byProvider: voicesByProvider,
        total: voices.length,
        currentProvider: voiceSettings.provider,
        currentVoice: voiceSettings.voice,
        providers: {
          piper: {
            available: voiceSettings.piperAvailable,
            voiceCount: voicesByProvider.piper?.length ?? 0,
          },
          macos: {
            available: voiceSettings.macosAvailable,
            voiceCount: voicesByProvider.macos?.length ?? 0,
          },
        },
      });
    } catch (error) {
      logger.error('Failed to get voices:', error);
      res.status(500).json({ error: 'Failed to get voices' });
    }
  });

  // GET /api/voices/piper - Get Piper voices only
  router.get('/voices/piper', async (req, res) => {
    try {
      const voicesByProvider = await assistantService.getVoicesByProvider();
      res.json({
        voices: voicesByProvider.piper,
        total: voicesByProvider.piper?.length ?? 0,
      });
    } catch (error) {
      logger.error('Failed to get Piper voices:', error);
      res.status(500).json({ error: 'Failed to get Piper voices' });
    }
  });

  // GET /api/voices/macos - Get macOS voices only
  router.get('/voices/macos', async (req, res) => {
    try {
      const voicesByProvider = await assistantService.getVoicesByProvider();
      res.json({
        voices: voicesByProvider.macos,
        total: voicesByProvider.macos?.length ?? 0,
      });
    } catch (error) {
      logger.error('Failed to get macOS voices:', error);
      res.status(500).json({ error: 'Failed to get macOS voices' });
    }
  });

  // POST /api/voices/test - Test a voice
  router.post('/voices/test', async (req, res) => {
    try {
      const { voice, rate = 1.0, text } = req.body;

      if (!voice || typeof voice !== 'string') {
        res.status(400).json({ error: 'Voice name is required' });
        return;
      }

      // Stop any current speech first
      await assistantService.stopSpeaking();
      
      // Test the voice
      await assistantService.testVoice(voice, rate, text);
      
      res.json({ success: true, voice, rate });
    } catch (error) {
      logger.error('Failed to test voice:', error);
      res.status(500).json({ error: 'Failed to test voice' });
    }
  });

  // POST /api/voices/stop - Stop current speech
  router.post('/voices/stop', async (req, res) => {
    try {
      await assistantService.stopSpeaking();
      res.json({ success: true });
    } catch (error) {
      logger.error('Failed to stop speech:', error);
      res.status(500).json({ error: 'Failed to stop speech' });
    }
  });

  // POST /api/settings/voice - Update voice settings
  router.post('/settings/voice', async (req, res) => {
    try {
      const { provider, voice, rate, enabled } = req.body;

      // Update provider first (if specified)
      if (provider !== undefined) {
        const validProviders: TTSProvider[] = ['auto', 'piper', 'macos'];
        if (!validProviders.includes(provider)) {
          res.status(400).json({ 
            error: `Invalid provider. Must be one of: ${validProviders.join(', ')}` 
          });
          return;
        }
        assistantService.setProvider(provider);
        config.tts.provider = provider;
      }

      // Update voice
      if (voice !== undefined) {
        assistantService.setVoice(voice);
        config.tts.voice = voice;
      }

      // Update rate
      if (rate !== undefined) {
        assistantService.setRate(rate);
        config.tts.rate = rate;
      }

      // Update enabled
      if (enabled !== undefined) {
        assistantService.setTTSEnabled(enabled);
        config.tts.enabled = enabled;
      }

      const newSettings = assistantService.getVoiceSettings();
      logger.info(`Voice settings updated: provider=${newSettings.provider}, voice=${newSettings.voice}, rate=${newSettings.rate}, enabled=${newSettings.enabled}`);

      res.json({
        success: true,
        settings: newSettings,
      });
    } catch (error) {
      logger.error('Failed to update voice settings:', error);
      res.status(500).json({ error: 'Failed to update voice settings' });
    }
  });

  // GET /api/settings/voice - Get current voice settings
  router.get('/settings/voice', (req, res) => {
    const settings = assistantService.getVoiceSettings();
    res.json(settings);
  });

  // POST /api/settings/provider - Switch TTS provider
  router.post('/settings/provider', (req, res) => {
    try {
      const { provider } = req.body;

      const validProviders: TTSProvider[] = ['auto', 'piper', 'macos'];
      if (!provider || !validProviders.includes(provider)) {
        res.status(400).json({ 
          error: `Invalid provider. Must be one of: ${validProviders.join(', ')}` 
        });
        return;
      }

      assistantService.setProvider(provider);
      config.tts.provider = provider;

      const newSettings = assistantService.getVoiceSettings();
      logger.info(`TTS provider switched to: ${provider}`);

      res.json({
        success: true,
        provider: newSettings.provider,
        voice: newSettings.voice,
      });
    } catch (error) {
      logger.error('Failed to switch provider:', error);
      res.status(500).json({ error: 'Failed to switch provider' });
    }
  });

  // Mount router
  app.use('/api', router);

  logger.success('REST API routes configured');
}
