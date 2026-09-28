export interface CpuTelemetry {
  model: string;
  speedGhz: number;
  coresCount: number;
  loadPercent: number;
  coreLoads: number[];
  temperatureCelsius: number;
}

export interface MemoryTelemetry {
  totalBytes: number;
  usedBytes: number;
  freeBytes: number;
  activePercent: number;
  swapTotalBytes: number;
  swapUsedBytes: number;
}

export interface GpuTelemetry {
  vendor: string;
  model: string;
  utilizationPercent: number;
  memoryTotalMb: number;
  memoryUsedMb: number;
  temperatureCelsius: number;
}

export interface StorageVolumeTelemetry {
  fs: string;
  mount: string;
  type: string;
  sizeBytes: number;
  usedBytes: number;
  usePercent: number;
}

export interface NetworkTelemetry {
  rxBytesPerSec: number;
  txBytesPerSec: number;
  primaryInterface: string;
  ip4: string;
}

export interface SystemInfoTelemetry {
  hostname: string;
  platform: string;
  distro: string;
  arch: string;
  uptimeSeconds: number;
}

export interface HostTelemetryPayload {
  type: 'TELEMETRY_BROADCAST';
  version: '1.0.0';
  timestamp: number;
  system: SystemInfoTelemetry;
  cpu: CpuTelemetry;
  memory: MemoryTelemetry;
  gpu: GpuTelemetry;
  storage: StorageVolumeTelemetry[];
  network: NetworkTelemetry;
  battery?: {
    hasBattery: boolean;
    isCharging: boolean;
    percent: number;
  };
}

export interface ClientCommand {
  action: 'ping' | 'request_metrics' | 'set_interval' | 'execute_action';
  payload?: Record<string, unknown>;
}
