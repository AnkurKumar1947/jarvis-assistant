/**
 * Socket.io Event Handlers
 */

import type { Server, Socket } from 'socket.io';
import type { AssistantConfig } from '../core/types.js';
import { assistantService } from '../services/assistantService.js';
import { metricsService } from '../services/metricsService.js';
import { logger } from '../utils/logger.js';
import { CLIENT_EVENTS, SERVER_EVENTS } from './events.js';

/**
 * Handle a single client connection
 */
export function handleConnection(socket: Socket, config: AssistantConfig): void {
  const sessionId = socket.id;
  logger.info(`Client connected: ${sessionId}`);

  // Send welcome message
  socket.emit(SERVER_EVENTS.CONNECTED, { sessionId });

  // Send current state
  socket.emit(SERVER_EVENTS.ASSISTANT_STATE, assistantService.getState());

  // Send initial metrics
  const cachedMetrics = metricsService.getCachedMetrics();
  if (cachedMetrics) {
    socket.emit(SERVER_EVENTS.METRICS_UPDATE, cachedMetrics);
  }

  // Subscribe to assistant state changes
  const handleStateChange = (state: string) => {
    socket.emit(SERVER_EVENTS.ASSISTANT_STATE, state);
  };
  assistantService.on('stateChange', handleStateChange);

  // Subscribe to assistant messages
  const handleMessage = (message: unknown) => {
    socket.emit(SERVER_EVENTS.MESSAGE, message);
  };
  assistantService.on('message', handleMessage);

  // Subscribe to metrics updates
  const unsubscribeMetrics = metricsService.subscribe((metrics) => {
    socket.emit(SERVER_EVENTS.METRICS_UPDATE, metrics);
  });

  // Handle send_message
  socket.on(CLIENT_EVENTS.SEND_MESSAGE, async (data: { content: string; source?: 'voice' | 'text' }) => {
    logger.socket(CLIENT_EVENTS.SEND_MESSAGE, 'in', { content: data.content?.slice(0, 50) });
    
    try {
      if (!data.content || typeof data.content !== 'string') {
        socket.emit(SERVER_EVENTS.ERROR, {
          code: 'INVALID_MESSAGE',
          message: 'Message content is required',
        });
        return;
      }

      await assistantService.processMessage(data.content, data.source || 'text');
    } catch (error) {
      logger.error('Error processing message:', error);
      socket.emit(SERVER_EVENTS.ERROR, {
        code: 'PROCESSING_ERROR',
        message: 'Failed to process message',
      });
    }
  });

  // Handle start_listening
  socket.on(CLIENT_EVENTS.START_LISTENING, () => {
    logger.socket(CLIENT_EVENTS.START_LISTENING, 'in');
    assistantService.startListening();
  });

  // Handle stop_listening
  socket.on(CLIENT_EVENTS.STOP_LISTENING, () => {
    logger.socket(CLIENT_EVENTS.STOP_LISTENING, 'in');
    assistantService.stopListening();
  });

  // Handle get_metrics
  socket.on(CLIENT_EVENTS.GET_METRICS, async () => {
    logger.socket(CLIENT_EVENTS.GET_METRICS, 'in');
    const metrics = await metricsService.getMetrics();
    socket.emit(SERVER_EVENTS.METRICS_UPDATE, metrics);
  });

  // Handle get_state
  socket.on(CLIENT_EVENTS.GET_STATE, () => {
    logger.socket(CLIENT_EVENTS.GET_STATE, 'in');
    socket.emit(SERVER_EVENTS.ASSISTANT_STATE, assistantService.getState());
  });

  // Handle get_history
  socket.on(CLIENT_EVENTS.GET_HISTORY, () => {
    logger.socket(CLIENT_EVENTS.GET_HISTORY, 'in');
    socket.emit(SERVER_EVENTS.HISTORY, assistantService.getMessageHistory());
  });

  // Handle clear_history
  socket.on(CLIENT_EVENTS.CLEAR_HISTORY, () => {
    logger.socket(CLIENT_EVENTS.CLEAR_HISTORY, 'in');
    assistantService.clearHistory();
  });

  // Handle disconnect
  socket.on('disconnect', (reason) => {
    logger.info(`Client disconnected: ${sessionId} (${reason})`);
    
    // Cleanup
    assistantService.off('stateChange', handleStateChange);
    assistantService.off('message', handleMessage);
    unsubscribeMetrics();
  });

  // Handle errors
  socket.on('error', (error) => {
    logger.error(`Socket error for ${sessionId}:`, error);
  });
}

