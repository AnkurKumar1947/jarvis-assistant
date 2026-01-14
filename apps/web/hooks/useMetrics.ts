'use client';

import { useEffect, useCallback } from 'react';
import { useSocket } from './useSocket';
import { useMetricsStore } from '@/stores/metricsStore';
import { SOCKET_EVENTS, METRICS_REFRESH_INTERVAL } from '@/lib/constants';

interface UseMetricsOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function useMetrics(options: UseMetricsOptions = {}) {
  const {
    autoRefresh = true,
    refreshInterval = METRICS_REFRESH_INTERVAL,
  } = options;

  const { socket, isConnected, emit, on, off } = useSocket();
  const { metrics, setMetrics, setIsConnected } = useMetricsStore();

  // Handle metrics updates from server
  useEffect(() => {
    if (!socket) return;

    const handleMetricsUpdate = (data: unknown) => {
      if (typeof data === 'object' && data !== null) {
        setMetrics(data as Parameters<typeof setMetrics>[0]);
      }
    };

    on(SOCKET_EVENTS.METRICS_UPDATE, handleMetricsUpdate);

    return () => {
      off(SOCKET_EVENTS.METRICS_UPDATE, handleMetricsUpdate);
    };
  }, [socket, on, off, setMetrics]);

  // Update connection status
  useEffect(() => {
    setIsConnected(isConnected);
  }, [isConnected, setIsConnected]);

  // Auto-refresh metrics
  useEffect(() => {
    if (!autoRefresh || !isConnected) return;

    const interval = setInterval(() => {
      emit(SOCKET_EVENTS.GET_METRICS);
    }, refreshInterval);

    // Initial fetch
    emit(SOCKET_EVENTS.GET_METRICS);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, isConnected, emit]);

  // Manual refresh
  const refresh = useCallback(() => {
    if (isConnected) {
      emit(SOCKET_EVENTS.GET_METRICS);
    }
  }, [isConnected, emit]);

  return {
    metrics,
    isConnected,
    refresh,
  };
}

