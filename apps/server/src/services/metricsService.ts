/**
 * System Metrics Service
 * Provides real-time system metrics (CPU, RAM, Disk, Battery)
 */

import si from 'systeminformation';
import type { SystemMetrics } from '../core/types.js';
import { logger } from '../utils/logger.js';

class MetricsService {
  private intervalId: NodeJS.Timeout | null = null;
  private cachedMetrics: SystemMetrics | null = null;
  private listeners: Set<(metrics: SystemMetrics) => void> = new Set();

  /**
   * Get current system metrics
   */
  async getMetrics(): Promise<SystemMetrics> {
    try {
      const [cpu, mem, disk, battery, networkInterfaces] = await Promise.all([
        si.currentLoad(),
        si.mem(),
        si.fsSize(),
        si.battery(),
        si.networkInterfaces(),
      ]);

      // Calculate disk usage (average across all drives)
      const totalDisk = disk.reduce((acc, d) => acc + d.size, 0);
      const usedDisk = disk.reduce((acc, d) => acc + d.used, 0);
      const diskPercent = totalDisk > 0 ? (usedDisk / totalDisk) * 100 : 0;

      // Check if online (any interface has an IP)
      const activeInterfaces = Array.isArray(networkInterfaces) 
        ? networkInterfaces 
        : [networkInterfaces];
      const isOnline = activeInterfaces.some(
        (iface) => iface.ip4 && iface.ip4 !== '127.0.0.1' && iface.operstate === 'up'
      );

      const metrics: SystemMetrics = {
        cpu: cpu.currentLoad,
        ram: (mem.used / mem.total) * 100,
        disk: diskPercent,
        battery: battery.percent,
        isCharging: battery.isCharging,
        isOnline,
        uptime: process.uptime(),
      };

      this.cachedMetrics = metrics;
      return metrics;
    } catch (error) {
      logger.error('Failed to get system metrics:', error);
      
      // Return cached or default metrics
      return this.cachedMetrics ?? {
        cpu: 0,
        ram: 0,
        disk: 0,
        battery: 100,
        isCharging: false,
        isOnline: true,
        uptime: process.uptime(),
      };
    }
  }

  /**
   * Start periodic metrics updates
   */
  startPolling(intervalMs: number = 2000): void {
    if (this.intervalId) {
      this.stopPolling();
    }

    logger.info(`Starting metrics polling (interval: ${intervalMs}ms)`);

    const poll = async () => {
      const metrics = await this.getMetrics();
      this.notifyListeners(metrics);
    };

    // Initial poll
    poll();

    // Set up interval
    this.intervalId = setInterval(poll, intervalMs);
  }

  /**
   * Stop periodic metrics updates
   */
  stopPolling(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info('Stopped metrics polling');
    }
  }

  /**
   * Subscribe to metrics updates
   */
  subscribe(callback: (metrics: SystemMetrics) => void): () => void {
    this.listeners.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Notify all listeners of new metrics
   */
  private notifyListeners(metrics: SystemMetrics): void {
    this.listeners.forEach((listener) => {
      try {
        listener(metrics);
      } catch (error) {
        logger.error('Metrics listener error:', error);
      }
    });
  }

  /**
   * Get cached metrics (no async)
   */
  getCachedMetrics(): SystemMetrics | null {
    return this.cachedMetrics;
  }
}

// Export singleton
export const metricsService = new MetricsService();

