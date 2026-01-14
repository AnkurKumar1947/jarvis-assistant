import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { setupSocketHandlers } from './socket/index.js';
import { setupRoutes } from './routes/api.js';
import { logger } from './utils/logger.js';
import { loadConfig } from './core/config.js';

// Load environment variables
dotenv.config();

// Configuration
const PORT = process.env.PORT || 3001;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';

async function main() {
  // Load configuration
  const config = loadConfig();
  logger.info('Configuration loaded');

  // Create Express app
  const app = express();
  
  // Middleware
  app.use(cors({
    origin: CORS_ORIGIN,
    methods: ['GET', 'POST'],
    credentials: true,
  }));
  app.use(express.json());

  // Create HTTP server
  const httpServer = createServer(app);

  // Create Socket.io server
  const io = new Server(httpServer, {
    cors: {
      origin: CORS_ORIGIN,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Setup REST routes
  setupRoutes(app, config);
  logger.info('REST routes initialized');

  // Setup Socket.io handlers
  setupSocketHandlers(io, config);
  logger.info('Socket.io handlers initialized');

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  // Start server
  httpServer.listen(PORT, () => {
    logger.success(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║     ██╗ █████╗ ██████╗ ██╗   ██╗██╗███████╗              ║
║     ██║██╔══██╗██╔══██╗██║   ██║██║██╔════╝              ║
║     ██║███████║██████╔╝██║   ██║██║███████╗              ║
║██   ██║██╔══██║██╔══██╗╚██╗ ██╔╝██║╚════██║              ║
║╚█████╔╝██║  ██║██║  ██║ ╚████╔╝ ██║███████║              ║
║ ╚════╝ ╚═╝  ╚═╝╚═╝  ╚═╝  ╚═══╝  ╚═╝╚══════╝              ║
║                                                           ║
║           Backend Server v1.0.0                          ║
║                                                           ║
╠═══════════════════════════════════════════════════════════╣
║  🚀 Server running on http://localhost:${PORT}              ║
║  🔌 WebSocket ready                                       ║
║  📡 CORS enabled for ${CORS_ORIGIN}             ║
╚═══════════════════════════════════════════════════════════╝
    `);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully...');
    httpServer.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    logger.info('SIGINT received, shutting down gracefully...');
    httpServer.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
  });
}

// Run
main().catch((error) => {
  logger.error('Failed to start server:', error);
  process.exit(1);
});

