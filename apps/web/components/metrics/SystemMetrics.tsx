'use client';

import { useEffect, useState } from 'react';
import { Cpu, MemoryStick, HardDrive, Battery, Wifi, WifiOff, Thermometer } from 'lucide-react';
import { MetricCard } from './MetricCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface SystemMetricsData {
  cpu: number;
  ram: number;
  disk: number;
  battery: number;
  isCharging: boolean;
  isOnline: boolean;
  temperature?: number;
}

interface SystemMetricsProps {
  data?: SystemMetricsData;
  className?: string;
}

export function SystemMetrics({ data, className }: SystemMetricsProps) {
  const [metrics, setMetrics] = useState<SystemMetricsData>(
    data || {
      cpu: 45,
      ram: 62,
      disk: 38,
      battery: 85,
      isCharging: true,
      isOnline: true,
      temperature: 65,
    }
  );

  // Simulate live updates if no data provided
  useEffect(() => {
    if (data) {
      setMetrics(data);
      return;
    }

    const interval = setInterval(() => {
      setMetrics(prev => ({
        ...prev,
        cpu: Math.min(100, Math.max(0, prev.cpu + (Math.random() - 0.5) * 15)),
        ram: Math.min(100, Math.max(0, prev.ram + (Math.random() - 0.5) * 5)),
        temperature: prev.temperature 
          ? Math.min(100, Math.max(30, prev.temperature + (Math.random() - 0.5) * 3))
          : undefined,
      }));
    }, 2000);

    return () => clearInterval(interval);
  }, [data]);

  return (
    <Card glass className={cn('', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Cpu className="w-4 h-4 text-primary" />
          System Metrics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* CPU */}
        <MetricCard
          label="CPU"
          value={metrics.cpu}
          icon={<Cpu className="w-3.5 h-3.5" />}
          color="primary"
        />

        {/* RAM */}
        <MetricCard
          label="RAM"
          value={metrics.ram}
          icon={<MemoryStick className="w-3.5 h-3.5" />}
          color="success"
        />

        {/* Disk */}
        <MetricCard
          label="Disk"
          value={metrics.disk}
          icon={<HardDrive className="w-3.5 h-3.5" />}
          color="warning"
        />

        {/* Battery */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Battery className="w-3.5 h-3.5" />
              Battery
              {metrics.isCharging && (
                <span className="text-success text-[10px]">⚡</span>
              )}
            </span>
            <span className="font-mono font-medium">{Math.round(metrics.battery)}%</span>
          </div>
          <div className="h-2 bg-card rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                metrics.battery > 20
                  ? 'bg-gradient-to-r from-success to-success/70'
                  : 'bg-gradient-to-r from-destructive to-destructive/70'
              )}
              style={{ width: `${metrics.battery}%` }}
            />
          </div>
        </div>

        {/* Temperature (if available) */}
        {metrics.temperature !== undefined && (
          <MetricCard
            label="Temperature"
            value={metrics.temperature}
            icon={<Thermometer className="w-3.5 h-3.5" />}
            suffix="°C"
            color={metrics.temperature > 80 ? 'destructive' : metrics.temperature > 60 ? 'warning' : 'success'}
          />
        )}

        {/* Network Status */}
        <div className="flex items-center justify-between pt-3 border-t border-border">
          <span className="text-xs text-muted-foreground">Network</span>
          <Badge variant={metrics.isOnline ? 'success' : 'destructive'} className="text-[10px]">
            {metrics.isOnline ? (
              <span className="flex items-center gap-1">
                <Wifi className="w-3 h-3" />
                Connected
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <WifiOff className="w-3 h-3" />
                Offline
              </span>
            )}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

