/**
 * Socket.io Setup
 */

import type { Server } from 'socket.io';
import type { AssistantConfig } from '../core/types.js';
import { handleConnection } from './handlers.js';
import { assistantService } from '../services/assistantService.js';
import { metricsService } from '../services/metricsService.js';
import { logger } from '../utils/logger.js';

/**
 * Setup Socket.io server with all handlers
 */
export function setupSocketHandlers(io: Server, config: AssistantConfig): void {
  // Initialize services
  assistantService.initialize(config);
  
  // Start metrics polling
  metricsService.startPolling(2000);

  // Handle new connections
  io.on('connection', (socket) => {
    handleConnection(socket, config);
  });

  // Log connected clients periodically
  setInterval(() => {
    const clientCount = io.sockets.sockets.size;
    if (clientCount > 0) {
      logger.debug(`Active connections: ${clientCount}`);
    }
  }, 30000);

  logger.success('Socket.io handlers configured');
}

export { CLIENT_EVENTS, SERVER_EVENTS } from './events.js';

