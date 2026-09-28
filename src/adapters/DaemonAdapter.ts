/**
 * OmniHub Daemon WebSocket Client Adapter
 * Singleton WebSocket client manager connecting to VITE_DAEMON_URL with exponential
 * backoff auto-reconnect, ping/latency calculation, and a standalone mock telemetry engine.
 */

import { PCDevice, HostPcTelemetry, DiskSpec } from '../types/index.js';

export type DaemonConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'error';

export interface DaemonTelemetryEvent {
  device: PCDevice;
  isLive: boolean;
  latencyMs: number;
  mockMode: boolean;
}

export type TelemetryListener = (event: DaemonTelemetryEvent) => void;
export type StatusListener = (status: DaemonConnectionStatus) => void;

export interface ActionExecutionResult {
  id: string;
  action: string;
  timestamp: number;
  success: boolean;
  message: string;
  params?: Record<string, string | number | boolean>;
}

export type ActionListener = (result: ActionExecutionResult) => void;

const DEFAULT_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_DAEMON_URL) ||
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_DAEMON_WS_URL) ||
  'ws://localhost:8080';

export class DaemonAdapter {
  private static instance: DaemonAdapter | null = null;

  private ws: WebSocket | null = null;
  private url: string = DEFAULT_URL;
  private status: DaemonConnectionStatus = 'disconnected';

  // Subscriptions
  private telemetryListeners: Set<TelemetryListener> = new Set();
  private statusListeners: Set<StatusListener> = new Set();

  // Exponential Backoff Reconnect State
  private reconnectTimer: number | null = null;
  private reconnectAttempts = 0;
  private readonly baseBackoffMs = 1000;
  private readonly maxBackoffMs = 15000;
  private shouldAutoReconnect = true;

  // Latency & Heartbeat
  private pingTimer: number | null = null;
  private lastPingSent = 0;
  private currentLatencyMs = 1;

  // Mock Telemetry Engine
  private isMockEnabled = true;
  private mockIntervalTimer: number | null = null;
  private mockStep = 0;
  private mockCpuLoad = 26;
  private mockGpuUtil = 20;
  private mockRamUsedGb = 14.2;
  private mockDownBytes = 420000;
  private mockUpBytes = 150000;

  // Latest emitted state
  private latestPCDevice: PCDevice | null = null;

  private constructor() {
    // Generate initial baseline mock device so dashboard never starts empty
    this.latestPCDevice = this.createMockPCDevice();
  }

  public static getInstance(): DaemonAdapter {
    if (!DaemonAdapter.instance) {
      DaemonAdapter.instance = new DaemonAdapter();
    }
    return DaemonAdapter.instance;
  }

  /**
   * Initializes connection to the WebSocket daemon.
   * If the daemon is offline, exponential backoff will attempt reconnecting
   * while the standalone mock telemetry engine animates the UI.
   */
  public connect(url?: string): void {
    if (url) {
      this.url = url;
    }

    this.clearTimers();
    this.shouldAutoReconnect = true;
    this.setStatus('connecting');

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        console.log(`[DaemonAdapter] Connected to hardware daemon at ${this.url}`);
        this.setStatus('connected');
        this.reconnectAttempts = 0;
        this.stopMockEngine();
        this.startHeartbeat();
      };

      this.ws.onmessage = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'PONG') {
            if (data.clientTimestamp) {
              this.currentLatencyMs = Math.max(1, Date.now() - data.clientTimestamp);
            }
            return;
          }

          if (data.type === 'TELEMETRY_BROADCAST' || data.category === 'host_pc' || data.cpu) {
            const pcDevice = this.normalizeToPCDevice(data);
            this.latestPCDevice = pcDevice;
            this.emitTelemetry({
              device: pcDevice,
              isLive: true,
              latencyMs: this.currentLatencyMs,
              mockMode: false
            });
          }
        } catch (parseErr) {
          console.warn('[DaemonAdapter] Failed to parse message from daemon:', parseErr);
        }
      };

      this.ws.onerror = () => {
        // Will trigger onclose and schedule reconnect
        this.setStatus('error');
      };

      this.ws.onclose = () => {
        this.setStatus('disconnected');
        this.stopHeartbeat();
        // Fall back to standalone mock engine so UI stays interactive
        this.startMockEngine();
        this.scheduleReconnect();
      };
    } catch {
      this.setStatus('disconnected');
      this.startMockEngine();
      this.scheduleReconnect();
    }
  }

  /**
   * Disconnects from daemon and stops automatic reconnects.
   */
  public disconnect(): void {
    this.shouldAutoReconnect = false;
    this.clearTimers();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.setStatus('disconnected');
  }

  /**
   * Exponential backoff reconnection scheduler:
   * Delay = min(base * (1.6 ^ attempts), maxBackoff) + jitter
   */
  private scheduleReconnect(): void {
    if (!this.shouldAutoReconnect) return;
    if (this.reconnectTimer) return;

    this.reconnectAttempts++;
    const factor = Math.pow(1.6, Math.min(this.reconnectAttempts, 8));
    const rawDelay = this.baseBackoffMs * factor;
    const jitter = Math.random() * 500;
    const delay = Math.min(this.maxBackoffMs, Math.round(rawDelay + jitter));

    console.info(`[DaemonAdapter] Daemon offline. Reconnect attempt #${this.reconnectAttempts} in ${delay}ms...`);

    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      if (this.shouldAutoReconnect && this.status !== 'connected') {
        this.connect();
      }
    }, delay);
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.pingTimer = window.setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.lastPingSent = Date.now();
        this.ws.send(JSON.stringify({
          action: 'ping',
          payload: { clientTimestamp: this.lastPingSent }
        }));
      }
    }, 2500);
  }

  private stopHeartbeat(): void {
    if (this.pingTimer) {
      window.clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  private clearTimers(): void {
    this.stopHeartbeat();
    if (this.reconnectTimer) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  // -------------------------------------------------------------
  // Mock Engine (Toggleable)
  // -------------------------------------------------------------

  public toggleMockMode(enabled: boolean): void {
    this.isMockEnabled = enabled;
    if (enabled) {
      // Disconnect socket and force mock engine
      this.shouldAutoReconnect = false;
      this.clearTimers();
      if (this.ws) {
        this.ws.close();
        this.ws = null;
      }
      this.setStatus('connected');
      this.startMockEngine();
    } else {
      this.stopMockEngine();
      this.connect();
    }
  }

  public getIsMockMode(): boolean {
    return this.isMockEnabled && this.status !== 'connected';
  }

  public startMockEngine(): void {
    if (this.mockIntervalTimer) return;

    // Immediately emit an initial frame
    const initialMock = this.createMockPCDevice();
    this.latestPCDevice = initialMock;
    this.emitTelemetry({
      device: initialMock,
      isLive: false,
      latencyMs: 1,
      mockMode: true
    });

    this.mockIntervalTimer = window.setInterval(() => {
      const mockDevice = this.createMockPCDevice();
      this.latestPCDevice = mockDevice;
      this.emitTelemetry({
        device: mockDevice,
        isLive: false,
        latencyMs: Math.floor(Math.random() * 3) + 1,
        mockMode: true
      });
    }, 1000);
  }

  public stopMockEngine(): void {
    if (this.mockIntervalTimer) {
      window.clearInterval(this.mockIntervalTimer);
      this.mockIntervalTimer = null;
    }
  }

  private createMockPCDevice(): PCDevice {
    this.mockStep += 0.08;

    // Organic fluctuating CPU load
    const cpuSine = Math.sin(this.mockStep) * 16;
    const cpuJitter = (Math.random() - 0.48) * 8;
    this.mockCpuLoad = Math.min(94, Math.max(12, Math.round(28 + cpuSine + cpuJitter)));

    // Organic GPU utilization
    const gpuBurst = Math.sin(this.mockStep * 0.5) > 0.7 ? 25 : 0;
    this.mockGpuUtil = Math.min(98, Math.max(8, Math.round(18 + Math.cos(this.mockStep * 0.7) * 12 + gpuBurst)));

    // RAM usage cycle
    const ramCycle = Math.sin(this.mockStep * 0.2) * 1.5;
    this.mockRamUsedGb = Number((14.0 + ramCycle + (Math.random() - 0.5) * 0.2).toFixed(2));

    // Network throughput burst
    const isSurge = Math.sin(this.mockStep * 1.2) > 0.6;
    this.mockDownBytes = Math.round(isSurge ? 7800000 + Math.random() * 4200000 : 380000 + Math.random() * 220000);
    this.mockUpBytes = Math.round(isSurge ? 1900000 + Math.random() * 850000 : 110000 + Math.random() * 80000);

    const totalRamBytes = 32 * 1024 * 1024 * 1024;
    const usedRamBytes = Math.round(this.mockRamUsedGb * 1024 * 1024 * 1024);
    const activePercent = Math.round((usedRamBytes / totalRamBytes) * 100);

    const cpuTemp = Math.round(44 + (this.mockCpuLoad / 100) * 34);
    const gpuTemp = Math.round(46 + (this.mockGpuUtil / 100) * 28);

    const coreLoads = [
      this.mockCpuLoad,
      Math.min(100, Math.max(5, Math.round(this.mockCpuLoad + (Math.random() - 0.5) * 18))),
      Math.min(100, Math.max(5, Math.round(this.mockCpuLoad + (Math.random() - 0.5) * 14))),
      Math.min(100, Math.max(5, Math.round(this.mockCpuLoad + (Math.random() - 0.5) * 22))),
      Math.min(100, Math.max(5, Math.round(this.mockCpuLoad + (Math.random() - 0.5) * 10))),
      Math.min(100, Math.max(5, Math.round(this.mockCpuLoad + (Math.random() - 0.5) * 16))),
      Math.min(100, Math.max(5, Math.round(this.mockCpuLoad + (Math.random() - 0.5) * 12))),
      Math.min(100, Math.max(5, Math.round(this.mockCpuLoad + (Math.random() - 0.5) * 20))),
    ];

    const coreThermals = coreLoads.map(load => Math.round(cpuTemp + (load - this.mockCpuLoad) * 0.25));

    const networkDownRateMBps = Number((this.mockDownBytes / (1024 * 1024)).toFixed(2));
    const networkUpRateMBps = Number((this.mockUpBytes / (1024 * 1024)).toFixed(2));

    const disks: DiskSpec[] = [
      {
        fs: '/dev/nvme0n1p2',
        mount: '/',
        type: 'ext4',
        sizeBytes: 2048 * 1024 * 1024 * 1024,
        usedBytes: 740 * 1024 * 1024 * 1024,
        usePercent: 36,
        isRemovable: false
      },
      {
        fs: '/dev/nvme1n1',
        mount: '/mnt/storage',
        type: 'btrfs',
        sizeBytes: 4096 * 1024 * 1024 * 1024,
        usedBytes: 1980 * 1024 * 1024 * 1024,
        usePercent: 48,
        isRemovable: false
      }
    ];

    const now = Date.now();

    return {
      id: 'dev-host-workstation',
      name: 'OmniRig Station (Primary Host)',
      category: 'host_pc',
      connectionType: 'daemon_ws',
      status: 'connected',
      lastSeen: now,
      latencyMs: this.currentLatencyMs,
      daemonOnline: false,
      endpointUrl: this.url,
      coreLoads,
      coreThermals,
      gpuUtilization: this.mockGpuUtil,
      gpuVramUsedMb: Math.round(5200 + (this.mockGpuUtil / 100) * 14000),
      gpuVramTotalMb: 24576,
      gpuTemperatureCelsius: gpuTemp,
      ramUsedBytes: usedRamBytes,
      ramTotalBytes: totalRamBytes,
      ramActivePercent: activePercent,
      networkDownRateBytesPerSec: this.mockDownBytes,
      networkUpRateBytesPerSec: this.mockUpBytes,
      networkDownRateMBps,
      networkUpRateMBps,
      disks,
      telemetry: {
        system: {
          hostname: 'OmniRig-Pro-Station',
          platform: 'linux',
          distro: 'OmniOS Realtime Kernel 6.10',
          arch: 'x86_64',
          uptimeSeconds: 84210 + Math.round(this.mockStep * 10)
        },
        cpu: {
          model: 'AMD Ryzen 9 7950X3D (16-Core)',
          speedGhz: 4.8,
          coresCount: 16,
          loadPercent: this.mockCpuLoad,
          coreLoads,
          temperatureCelsius: cpuTemp
        },
        memory: {
          totalBytes: totalRamBytes,
          usedBytes: usedRamBytes,
          freeBytes: totalRamBytes - usedRamBytes,
          activePercent,
          swapTotalBytes: 8 * 1024 * 1024 * 1024,
          swapUsedBytes: 1.2 * 1024 * 1024 * 1024
        },
        gpu: {
          vendor: 'NVIDIA Corporation',
          model: 'GeForce RTX 4090 OC (24GB)',
          utilizationPercent: this.mockGpuUtil,
          memoryTotalMb: 24576,
          memoryUsedMb: Math.round(5200 + (this.mockGpuUtil / 100) * 14000),
          temperatureCelsius: gpuTemp
        },
        storage: disks,
        network: {
          rxBytesPerSec: this.mockDownBytes,
          txBytesPerSec: this.mockUpBytes,
          primaryInterface: 'enp5s0 (10GbE LAN)',
          ip4: '192.168.1.185'
        },
        battery: {
          hasBattery: true,
          isCharging: true,
          percent: 96
        }
      }
    };
  }

  // -------------------------------------------------------------
  // Data Normalization (Payload to PCDevice)
  // -------------------------------------------------------------

  private normalizeToPCDevice(data: any): PCDevice {
    // If incoming packet already matches top-level PCDevice format
    if (data.coreLoads && data.ramUsedBytes !== undefined && data.telemetry) {
      return {
        id: data.id || 'dev-host-workstation',
        name: data.name || 'OmniRig Station (Primary Host)',
        category: 'host_pc',
        connectionType: 'daemon_ws',
        status: 'connected',
        lastSeen: data.timestamp || Date.now(),
        latencyMs: this.currentLatencyMs,
        daemonOnline: true,
        endpointUrl: this.url,
        coreLoads: [...data.coreLoads],
        coreThermals: [...(data.coreThermals || data.coreLoads.map(() => 48))],
        gpuUtilization: data.gpuUtilization ?? data.gpu?.utilizationPercent ?? 20,
        gpuVramUsedMb: data.gpuVramUsedMb ?? data.gpu?.memoryUsedMb ?? 4000,
        gpuVramTotalMb: data.gpuVramTotalMb ?? data.gpu?.memoryTotalMb ?? 24576,
        gpuTemperatureCelsius: data.gpuTemperatureCelsius ?? data.gpu?.temperatureCelsius ?? 50,
        ramUsedBytes: data.ramUsedBytes ?? data.memory?.usedBytes ?? 14e9,
        ramTotalBytes: data.ramTotalBytes ?? data.memory?.totalBytes ?? 32e9,
        ramActivePercent: data.ramActivePercent ?? data.memory?.activePercent ?? 44,
        networkDownRateBytesPerSec: data.networkDownRateBytesPerSec ?? data.network?.rxBytesPerSec ?? 300000,
        networkUpRateBytesPerSec: data.networkUpRateBytesPerSec ?? data.network?.txBytesPerSec ?? 100000,
        networkDownRateMBps: data.networkDownRateMBps ?? Number(((data.network?.rxBytesPerSec || 300000) / (1024 * 1024)).toFixed(2)),
        networkUpRateMBps: data.networkUpRateMBps ?? Number(((data.network?.txBytesPerSec || 100000) / (1024 * 1024)).toFixed(2)),
        disks: data.disks || data.storage || [],
        telemetry: data.telemetry || {
          system: data.system,
          cpu: data.cpu,
          memory: data.memory,
          gpu: data.gpu,
          storage: data.storage,
          network: data.network,
          battery: data.battery
        }
      };
    }

    // Direct HostPcTelemetry packet
    const tel: HostPcTelemetry = data.cpu ? data : data.telemetry;
    const rxBytes = tel.network?.rxBytesPerSec || 0;
    const txBytes = tel.network?.txBytesPerSec || 0;

    return {
      id: 'dev-host-workstation',
      name: 'OmniRig Station (Primary Host)',
      category: 'host_pc',
      connectionType: 'daemon_ws',
      status: 'connected',
      lastSeen: Date.now(),
      latencyMs: this.currentLatencyMs,
      daemonOnline: true,
      endpointUrl: this.url,
      coreLoads: [...(tel.cpu?.coreLoads || [tel.cpu?.loadPercent || 20])],
      coreThermals: (tel.cpu?.coreLoads || [20]).map(() => tel.cpu?.temperatureCelsius || 48),
      gpuUtilization: tel.gpu?.utilizationPercent || 20,
      gpuVramUsedMb: tel.gpu?.memoryUsedMb || 4000,
      gpuVramTotalMb: tel.gpu?.memoryTotalMb || 24576,
      gpuTemperatureCelsius: tel.gpu?.temperatureCelsius || 48,
      ramUsedBytes: tel.memory?.usedBytes || 14e9,
      ramTotalBytes: tel.memory?.totalBytes || 32e9,
      ramActivePercent: tel.memory?.activePercent || 44,
      networkDownRateBytesPerSec: rxBytes,
      networkUpRateBytesPerSec: txBytes,
      networkDownRateMBps: Number((rxBytes / (1024 * 1024)).toFixed(2)),
      networkUpRateMBps: Number((txBytes / (1024 * 1024)).toFixed(2)),
      disks: [...(tel.storage || [])],
      telemetry: tel
    };
  }

  // -------------------------------------------------------------
  // Subscription & State Accessors
  // -------------------------------------------------------------

  public subscribe(listener: TelemetryListener): () => void {
    this.telemetryListeners.add(listener);
    if (this.latestPCDevice) {
      listener({
        device: this.latestPCDevice,
        isLive: this.status === 'connected',
        latencyMs: this.currentLatencyMs,
        mockMode: this.status !== 'connected' || this.isMockEnabled
      });
    }
    return () => {
      this.telemetryListeners.delete(listener);
    };
  }

  public subscribeStatus(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    listener(this.status);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  public getStatus(): DaemonConnectionStatus {
    return this.status;
  }

  public getLatency(): number {
    return this.currentLatencyMs;
  }

  public getLatestDevice(): PCDevice | null {
    return this.latestPCDevice;
  }

  private actionListeners: Set<ActionListener> = new Set();
  private recentActionResults: ActionExecutionResult[] = [];
  private isSystemAudioMuted = false;
  private isWorkstationLocked = false;
  private isScreensaverActive = false;
  private powerGovernor: 'performance' | 'balanced' | 'powersave' = 'balanced';

  public executeAction(action: string, params?: Record<string, string | number | boolean>): boolean {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(
          JSON.stringify({
            action: 'execute_action',
            payload: {
              targetAction: action,
              params: params || {}
            }
          })
        );
      } catch (err) {
        console.error('[DaemonAdapter] Failed to send execute_action:', err);
      }
    }

    // Side-effects & local simulation
    this.handleLocalActionSideEffect(action, params);
    return true;
  }

  private handleLocalActionSideEffect(action: string, params?: Record<string, string | number | boolean>) {
    let message = 'Executed successfully';
    switch (action) {
      case 'mute_system_audio':
        this.isSystemAudioMuted = !this.isSystemAudioMuted;
        message = this.isSystemAudioMuted
          ? 'System audio muted (Master Volume 0%)'
          : 'System audio unmuted (Restored to 64%)';
        break;
      case 'set_screensaver':
        this.isScreensaverActive = !this.isScreensaverActive;
        message = this.isScreensaverActive
          ? 'Screensaver activated (Display Dimmed 10%)'
          : 'Screensaver deactivated (Normal)';
        break;
      case 'lock_workstation':
        this.isWorkstationLocked = !this.isWorkstationLocked;
        message = this.isWorkstationLocked
          ? 'Workstation locked (OS session secured)'
          : 'Workstation unlocked';
        break;
      case 'sleep_displays':
        message = 'Display sleep signal sent (DPMS Standby)';
        break;
      case 'kill_background_processes':
      case 'flush_memory':
        this.mockRamUsedGb = Math.max(8.4, this.mockRamUsedGb - 2.4);
        message = 'Flushed 2.4 GB inactive system cache & zombie processes';
        break;
      case 'toggle_performance_mode':
        if (params?.governor) {
          this.powerGovernor = params.governor as 'performance' | 'balanced' | 'powersave';
        } else {
          this.powerGovernor =
            this.powerGovernor === 'performance'
              ? 'balanced'
              : this.powerGovernor === 'balanced'
              ? 'powersave'
              : 'performance';
        }
        message = `CPU Governor switched to ${this.powerGovernor.toUpperCase()}`;
        break;
      case 'take_screenshot':
        message = 'Desktop frame captured to clipboard buffer';
        break;
      case 'restart_daemon':
        message = 'Daemon telemetry service soft-restarted';
        break;
      default:
        message = `Action ${action} dispatched to host agent`;
    }

    const result: ActionExecutionResult = {
      id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      action,
      timestamp: Date.now(),
      success: true,
      message,
      params
    };

    this.recentActionResults.unshift(result);
    if (this.recentActionResults.length > 50) {
      this.recentActionResults.pop();
    }

    for (const listener of this.actionListeners) {
      listener(result);
    }
  }

  public subscribeActions(listener: ActionListener): () => void {
    this.actionListeners.add(listener);
    return () => {
      this.actionListeners.delete(listener);
    };
  }

  public getRecentActionResults(): ActionExecutionResult[] {
    return [...this.recentActionResults];
  }

  public getSystemControlState() {
    return {
      isSystemAudioMuted: this.isSystemAudioMuted,
      isWorkstationLocked: this.isWorkstationLocked,
      isScreensaverActive: this.isScreensaverActive,
      powerGovernor: this.powerGovernor
    };
  }

  public getUrl(): string {
    return this.url;
  }

  private setStatus(status: DaemonConnectionStatus): void {
    this.status = status;
    for (const listener of this.statusListeners) {
      listener(status);
    }
  }

  private emitTelemetry(event: DaemonTelemetryEvent): void {
    for (const listener of this.telemetryListeners) {
      listener(event);
    }
  }
}

// Export singleton instance
export const daemonAdapter = DaemonAdapter.getInstance();
