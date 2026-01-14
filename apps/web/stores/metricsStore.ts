import { create } from 'zustand';

interface SystemMetrics {
  cpu: number;
  ram: number;
  disk: number;
  battery: number;
  isCharging: boolean;
  isOnline: boolean;
  temperature?: number;
  uptime?: number;
}

interface MetricsStore {
  // State
  metrics: SystemMetrics;
  lastUpdated: Date | null;
  isConnected: boolean;
  
  // Actions
  setMetrics: (metrics: Partial<SystemMetrics>) => void;
  setIsConnected: (connected: boolean) => void;
  reset: () => void;
}

const initialMetrics: SystemMetrics = {
  cpu: 0,
  ram: 0,
  disk: 0,
  battery: 100,
  isCharging: false,
  isOnline: true,
};

export const useMetricsStore = create<MetricsStore>((set) => ({
  metrics: initialMetrics,
  lastUpdated: null,
  isConnected: false,
  
  setMetrics: (newMetrics) => set((state) => ({
    metrics: { ...state.metrics, ...newMetrics },
    lastUpdated: new Date(),
  })),
  
  setIsConnected: (isConnected) => set({ isConnected }),
  
  reset: () => set({
    metrics: initialMetrics,
    lastUpdated: null,
    isConnected: false,
  }),
}));

