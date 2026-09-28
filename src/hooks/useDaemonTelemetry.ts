import { useEffect, useState } from 'react';
import { daemonAdapter, DaemonConnectionStatus, DaemonTelemetryEvent } from '../adapters/DaemonAdapter.js';
import { PCDevice } from '../types/index.js';

export interface UseDaemonTelemetryResult {
  pcDevice: PCDevice | null;
  status: DaemonConnectionStatus;
  isLive: boolean;
  latencyMs: number;
  mockMode: boolean;
  daemonUrl: string;
  toggleMockMode: (enabled: boolean) => void;
  reconnect: (url?: string) => void;
}

export function useDaemonTelemetry(): UseDaemonTelemetryResult {
  const [telemetryState, setTelemetryState] = useState<DaemonTelemetryEvent>({
    device: daemonAdapter.getLatestDevice()!,
    isLive: daemonAdapter.getStatus() === 'connected',
    latencyMs: daemonAdapter.getLatency(),
    mockMode: daemonAdapter.getIsMockMode()
  });

  const [status, setStatus] = useState<DaemonConnectionStatus>(daemonAdapter.getStatus());

  useEffect(() => {
    // Initial connect if not already connected
    if (daemonAdapter.getStatus() === 'disconnected') {
      daemonAdapter.connect();
    }

    const unsubTelemetry = daemonAdapter.subscribe((event) => {
      setTelemetryState(event);
    });

    const unsubStatus = daemonAdapter.subscribeStatus((newStatus) => {
      setStatus(newStatus);
    });

    return () => {
      unsubTelemetry();
      unsubStatus();
    };
  }, []);

  return {
    pcDevice: telemetryState.device,
    status,
    isLive: telemetryState.isLive,
    latencyMs: telemetryState.latencyMs,
    mockMode: telemetryState.mockMode,
    daemonUrl: daemonAdapter.getUrl(),
    toggleMockMode: (enabled: boolean) => daemonAdapter.toggleMockMode(enabled),
    reconnect: (url?: string) => daemonAdapter.connect(url)
  };
}
