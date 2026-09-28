import { HostPcTelemetry } from '../types/index.js';

export type TelemetryCallback = (telemetry: HostPcTelemetry, isLiveDaemon: boolean, latencyMs: number) => void;
export type StatusCallback = (status: 'connected' | 'connecting' | 'disconnected' | 'error') => void;

export class TelemetryDaemonAdapter {
  private ws: WebSocket | null = null;
  private url: string;
  private onTelemetry: TelemetryCallback;
  private onStatus: StatusCallback;
  private reconnectTimer: number | null = null;
  private pingInterval: number | null = null;
  private simulatedInterval: number | null = null;
  private isSimulatedMode = false;
  private lastPingSent = 0;
  private currentLatency = 0;

  // Internal state for simulation if daemon is not running
  private simLoad = 24;
  private simGpu = 18;
  private simMem = 14.2;
  private simTemp = 48;
  private simRx = 384000;
  private simTx = 112000;

  constructor(
    url: string = 'ws://localhost:9123',
    onTelemetry: TelemetryCallback,
    onStatus: StatusCallback
  ) {
    this.url = url;
    this.onTelemetry = onTelemetry;
    this.onStatus = onStatus;
  }

  public connect(forceSimulation = false) {
    if (forceSimulation) {
      this.disconnect();
      this.startSimulation();
      return;
    }

    this.stopSimulation();
    this.onStatus('connecting');

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        this.onStatus('connected');
        this.startHeartbeat();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'PONG') {
            if (data.clientTimestamp) {
              this.currentLatency = Math.max(1, Date.now() - data.clientTimestamp);
            }
            return;
          }

          if (data.type === 'TELEMETRY_BROADCAST' || data.cpu) {
            this.onTelemetry(data as HostPcTelemetry, true, this.currentLatency);
          }
        } catch (e) {
          console.warn('[TelemetryAdapter] Error parsing daemon message:', e);
        }
      };

      this.ws.onerror = () => {
        this.onStatus('error');
      };

      this.ws.onclose = () => {
        this.onStatus('disconnected');
        this.stopHeartbeat();
        // Fallback to simulation smoothly so dashboard always has live visual data
        this.startSimulation();
      };
    } catch {
      this.onStatus('disconnected');
      this.startSimulation();
    }
  }

  public disconnect() {
    this.stopHeartbeat();
    this.stopSimulation();
    if (this.reconnectTimer) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.onStatus('disconnected');
  }

  public setEndpointUrl(newUrl: string) {
    this.url = newUrl;
    this.connect();
  }

  public triggerSimulationToggle(enableSimulation: boolean) {
    if (enableSimulation) {
      this.disconnect();
      this.startSimulation();
    } else {
      this.stopSimulation();
      this.connect();
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.pingInterval = window.setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.lastPingSent = Date.now();
        this.ws.send(JSON.stringify({
          action: 'ping',
          payload: { clientTimestamp: this.lastPingSent }
        }));
      }
    }, 2000);
  }

  private stopHeartbeat() {
    if (this.pingInterval) {
      window.clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private startSimulation() {
    this.isSimulatedMode = true;
    this.onStatus('connected');

    if (this.simulatedInterval) {
      window.clearInterval(this.simulatedInterval);
    }

    this.simulatedInterval = window.setInterval(() => {
      // Create organic, realistic fluctuating telemetry
      const delta = (Math.random() - 0.48) * 6;
      this.simLoad = Math.min(94, Math.max(12, Math.round(this.simLoad + delta)));
      this.simGpu = Math.min(98, Math.max(8, Math.round(this.simGpu + (Math.random() - 0.5) * 8)));
      this.simTemp = Math.round(44 + (this.simLoad / 100) * 36);
      this.simRx = Math.round(Math.max(10000, this.simRx + (Math.random() - 0.5) * 80000));
      this.simTx = Math.round(Math.max(5000, this.simTx + (Math.random() - 0.5) * 30000));

      const coreLoads = [
        this.simLoad,
        Math.min(100, Math.max(5, this.simLoad + Math.round((Math.random() - 0.5) * 15))),
        Math.min(100, Math.max(5, this.simLoad + Math.round((Math.random() - 0.5) * 12))),
        Math.min(100, Math.max(5, this.simLoad + Math.round((Math.random() - 0.5) * 20))),
        Math.min(100, Math.max(5, this.simLoad + Math.round((Math.random() - 0.5) * 10))),
        Math.min(100, Math.max(5, this.simLoad + Math.round((Math.random() - 0.5) * 18))),
        Math.min(100, Math.max(5, this.simLoad + Math.round((Math.random() - 0.5) * 8))),
        Math.min(100, Math.max(5, this.simLoad + Math.round((Math.random() - 0.5) * 14))),
      ];

      const simPayload: HostPcTelemetry = {
        system: {
          hostname: 'OmniRig-Pro-Station',
          platform: 'darwin',
          distro: 'OmniOS / Desktop Kernel 6.10',
          arch: 'arm64 / x86_64',
          uptimeSeconds: 74218
        },
        cpu: {
          model: 'AMD Ryzen 9 / Apple Silicon Ultra (16-Core)',
          speedGhz: 4.2,
          coresCount: 16,
          loadPercent: this.simLoad,
          coreLoads,
          temperatureCelsius: this.simTemp
        },
        memory: {
          totalBytes: 32 * 1024 * 1024 * 1024,
          usedBytes: Math.round(this.simMem * 1024 * 1024 * 1024),
          freeBytes: Math.round((32 - this.simMem) * 1024 * 1024 * 1024),
          activePercent: Math.round((this.simMem / 32) * 100),
          swapTotalBytes: 8 * 1024 * 1024 * 1024,
          swapUsedBytes: 1.2 * 1024 * 1024 * 1024
        },
        gpu: {
          vendor: 'NVIDIA / Apple M-Core',
          model: 'RTX 4090 / 64-Core GPU',
          utilizationPercent: this.simGpu,
          memoryTotalMb: 24576,
          memoryUsedMb: Math.round(6200 + (this.simGpu / 100) * 12000),
          temperatureCelsius: Math.round(48 + (this.simGpu / 100) * 28)
        },
        storage: [
          {
            fs: '/dev/nvme0n1',
            mount: '/',
            type: 'APFS / NVMe',
            sizeBytes: 2048 * 1024 * 1024 * 1024,
            usedBytes: 740 * 1024 * 1024 * 1024,
            usePercent: 36
          },
          {
            fs: '/dev/nvme1n1',
            mount: '/mnt/games-data',
            type: 'ext4 / SSD',
            sizeBytes: 4096 * 1024 * 1024 * 1024,
            usedBytes: 2950 * 1024 * 1024 * 1024,
            usePercent: 72
          }
        ],
        network: {
          rxBytesPerSec: this.simRx,
          txBytesPerSec: this.simTx,
          primaryInterface: 'en0 (2.5 GbE)',
          ip4: '192.168.1.185'
        },
        battery: {
          hasBattery: true,
          isCharging: true,
          percent: 94
        }
      };

      this.onTelemetry(simPayload, false, Math.floor(Math.random() * 4) + 1);
    }, 1000);
  }

  private stopSimulation() {
    if (this.simulatedInterval) {
      window.clearInterval(this.simulatedInterval);
      this.simulatedInterval = null;
    }
    this.isSimulatedMode = false;
  }
}
