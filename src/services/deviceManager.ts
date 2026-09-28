import {
  AncMode,
  BluetoothPeripheralDevice,
  DeviceCategory,
  DiskSpec,
  GamepadButtonId,
  GamepadButtonValue,
  GamepadDevice,
  GamepadHidDevice,
  HostPcDevice,
  HostPcTelemetry,
  PCDevice,
  P2PPeerDevice,
  RumbleTestRequest,
  SmartTvAppShortcut,
  SmartTvCommandRequest,
  SmartTvDevice,
  SmartTVDevice,
  UniversalDevice,
  WearableDevice
} from '../types/index.js';
import { daemonAdapter } from '../adapters/DaemonAdapter.js';
import { WebBluetoothAdapter } from '../adapters/BluetoothAdapter.js';
import { WebHidGamepadAdapter } from '../adapters/GamepadAdapter.js';
import { SmartTvWebSocketAdapter } from '../adapters/smartTv.js';
import { WebRTCAdapter } from '../adapters/WebRTCAdapter.js';
import { soundFx } from './audioFeedback.js';

export type DeviceStateListener = (devices: UniversalDevice[]) => void;

function createDefaultButtonMap(): Record<GamepadButtonId, GamepadButtonValue> {
  const ids: GamepadButtonId[] = [
    'button_south',
    'button_east',
    'button_west',
    'button_north',
    'bumper_left',
    'bumper_right',
    'trigger_left',
    'trigger_right',
    'select',
    'start',
    'stick_press_left',
    'stick_press_right',
    'dpad_up',
    'dpad_down',
    'dpad_left',
    'dpad_right',
    'home'
  ];

  const map = {} as Record<GamepadButtonId, GamepadButtonValue>;
  ids.forEach((id, idx) => {
    map[id] = {
      id,
      index: idx,
      name: id.replace(/_/g, ' ').toUpperCase(),
      pressed: false,
      value: 0
    };
  });
  return map;
}

class DeviceManagerService {
  private devices: Map<string, UniversalDevice> = new Map();
  private listeners: Set<DeviceStateListener> = new Set();

  private bluetoothAdapter!: WebBluetoothAdapter;
  private hidAdapter!: WebHidGamepadAdapter;
  private smartTvAdapter!: SmartTvWebSocketAdapter;
  private p2pService!: WebRTCAdapter;

  private isLiveDaemonConnected = false;
  private currentLatency = 1;

  constructor() {
    this.initDevices();
    this.initAdapters();
  }

  private initDevices() {
    const defaultDisks: DiskSpec[] = [
      {
        fs: '/dev/nvme0n1p2',
        mount: '/',
        type: 'ext4',
        sizeBytes: 2048 * 1024 * 1024 * 1024,
        usedBytes: 680 * 1024 * 1024 * 1024,
        usePercent: 33,
        isRemovable: false
      }
    ];

    // 1. Host PC (PCDevice)
    const hostPc: PCDevice = {
      id: 'dev-host-workstation',
      name: 'OmniRig Station (Primary Host)',
      category: 'host_pc',
      connectionType: 'daemon_ws',
      status: 'connecting',
      lastSeen: Date.now(),
      endpointUrl: 'ws://localhost:9123',
      latencyMs: 1,
      daemonOnline: false,
      coreLoads: [24, 20, 32, 18, 14, 28, 22, 19],
      coreThermals: [48, 47, 49, 46, 48, 50, 47, 48],
      gpuUtilization: 28,
      gpuVramUsedMb: 6800,
      gpuVramTotalMb: 24576,
      gpuTemperatureCelsius: 51,
      ramUsedBytes: 13.8 * 1024 * 1024 * 1024,
      ramTotalBytes: 32 * 1024 * 1024 * 1024,
      ramActivePercent: 43,
      networkDownRateBytesPerSec: 420000,
      networkUpRateBytesPerSec: 154000,
      disks: defaultDisks,
      telemetry: {
        system: {
          hostname: 'omnihub-host',
          platform: 'linux',
          distro: 'OmniOS Realtime Kernel 6.10',
          arch: 'x86_64',
          uptimeSeconds: 84210
        },
        cpu: {
          model: 'AMD Ryzen 9 7950X3D (16-Core)',
          speedGhz: 4.8,
          coresCount: 16,
          loadPercent: 24,
          coreLoads: [24, 20, 32, 18, 14, 28, 22, 19],
          temperatureCelsius: 48
        },
        memory: {
          totalBytes: 32 * 1024 * 1024 * 1024,
          usedBytes: 13.8 * 1024 * 1024 * 1024,
          freeBytes: 18.2 * 1024 * 1024 * 1024,
          activePercent: 43
        },
        gpu: {
          vendor: 'NVIDIA',
          model: 'GeForce RTX 4090 OC',
          utilizationPercent: 28,
          memoryTotalMb: 24576,
          memoryUsedMb: 6800,
          temperatureCelsius: 51
        },
        storage: defaultDisks,
        network: {
          rxBytesPerSec: 420000,
          txBytesPerSec: 154000,
          primaryInterface: 'enp5s0 (10GbE)',
          ip4: '192.168.1.185'
        }
      }
    };

    // 2. Bluetooth Wearable Audio Peripheral (WearableDevice)
    const btPeripheral: WearableDevice = {
      id: 'dev-bt-headphones',
      name: 'Sony WH-1000XM5 (Wireless ANC)',
      category: 'bluetooth_peripheral',
      connectionType: 'web_bluetooth',
      status: 'connected',
      lastSeen: Date.now(),
      vendor: 'Sony Corporation',
      leftEarbudBatteryPercent: 88,
      rightEarbudBatteryPercent: 86,
      caseBatteryPercent: 94,
      ancMode: 'anc',
      rssiSignalStrengthDbm: -48,
      telemetry: {
        batteryLevel: 88,
        isCharging: false,
        ancMode: 'anc',
        rssiSignalDbm: -48,
        codec: 'LDAC',
        firmwareVersion: 'v3.1.2',
        characteristicsAvailable: ['Battery (0x180F)', 'ANC Control', 'Voice Passthrough']
      }
    };

    // 3. WebHID Gamepad (GamepadDevice)
    const gamepad: GamepadDevice = {
      id: 'dev-hid-gamepad',
      name: 'Xbox Wireless Controller (USB/BT)',
      category: 'gamepad_hid',
      connectionType: 'web_hid',
      status: 'connected',
      lastSeen: Date.now(),
      vendor: 'Microsoft Corp.',
      connectedPortIndex: 0,
      leftStick: { x: 0, y: 0 },
      rightStick: { x: 0, y: 0 },
      activeButtonStateMap: createDefaultButtonMap(),
      hapticRumbleCapabilities: {
        hasDualMotor: true,
        hasTriggerRumble: true,
        minDurationMs: 50,
        maxDurationMs: 5000,
        supportsVariableFrequency: true
      },
      telemetry: {
        gamepadIndex: 0,
        gamepadId: 'Xbox Wireless Controller',
        mapping: 'standard',
        axes: [
          { index: 0, name: 'Left Stick X', value: 0 },
          { index: 1, name: 'Left Stick Y', value: 0 },
          { index: 2, name: 'Right Stick X', value: 0 },
          { index: 3, name: 'Right Stick Y', value: 0 }
        ],
        buttons: Array.from({ length: 17 }).map((_, i) => ({
          index: i,
          name: `Button ${i}`,
          pressed: false,
          value: 0
        })),
        hasVibration: true,
        vibratingNow: false,
        batteryPercent: 84
      }
    };

    // 4. Smart TV (SmartTVDevice)
    const tvShortcuts: SmartTvAppShortcut[] = [
      { id: 'youtube', name: 'YouTube', packageName: 'com.google.android.youtube.tv' },
      { id: 'netflix', name: 'Netflix', packageName: 'com.netflix.ninja' },
      { id: 'plex', name: 'Plex', packageName: 'com.plexapp.android' },
      { id: 'spotify', name: 'Spotify TV', packageName: 'com.spotify.tv.android' }
    ];

    const smartTv: SmartTVDevice = {
      id: 'dev-tv-living-room',
      name: 'LG OLED G3 65" (Living Room)',
      category: 'smart_tv',
      connectionType: 'local_ws',
      status: 'connected',
      lastSeen: Date.now(),
      vendor: 'LG Electronics',
      wsEndpointUrl: 'ws://192.168.1.120:8001/api/v2',
      connectionState: 'connected',
      activeAppPackage: 'com.google.android.youtube.tv',
      currentVolumeLevel: 26,
      isMuted: false,
      quickLaunchShortcuts: tvShortcuts,
      telemetry: {
        brand: 'LG webOS',
        powerState: 'on',
        volume: 26,
        isMuted: false,
        activeInput: 'HDMI 1 (eARC)',
        currentApp: 'YouTube',
        ipAddress: '192.168.1.120',
        macAddress: 'C8:02:8D:4F:91:EE',
        channel: 104,
        channelName: 'CyberNews 4K',
        mediaPlaybackState: 'playing'
      }
    };

    // 5. P2P Peer Sync (P2PPeerDevice)
    const p2pPeer: P2PPeerDevice = {
      id: 'dev-p2p-sync',
      name: 'MacBook Pro M3 Max (Studio Peer)',
      category: 'p2p_peer',
      connectionType: 'webrtc_p2p',
      status: 'connected',
      lastSeen: Date.now(),
      vendor: 'Zero-Cloud WebRTC Channel',
      peerId: 'peer-m3-max',
      telemetry: {
        peerId: 'peer-m3-max',
        connectionState: 'connected',
        iceConnectionState: 'connected',
        dataChannelState: 'open',
        bytesSent: 42800000,
        bytesReceived: 184000000,
        activeTransfers: [],
        clipboardHistory: [],
        latencyRttMs: 8
      }
    };

    this.devices.set(hostPc.id, hostPc);
    this.devices.set(btPeripheral.id, btPeripheral);
    this.devices.set(gamepad.id, gamepad);
    this.devices.set(smartTv.id, smartTv);
    this.devices.set(p2pPeer.id, p2pPeer);
  }

  private initAdapters() {
    // 1. Host Telemetry Adapter (Singleton DaemonAdapter with exponential backoff & mock engine)
    daemonAdapter.subscribe((event) => {
      this.isLiveDaemonConnected = event.isLive;
      this.currentLatency = event.latencyMs;
      const host = this.devices.get('dev-host-workstation') as PCDevice | undefined;
      if (host) {
        Object.assign(host, event.device);
        host.status = 'connected';
        host.lastSeen = Date.now();
        host.latencyMs = event.latencyMs;
        host.daemonOnline = event.isLive;
        this.notify();
      }
    });

    daemonAdapter.subscribeStatus((status) => {
      const host = this.devices.get('dev-host-workstation') as PCDevice | undefined;
      if (host) {
        host.status = status;
        host.daemonOnline = status === 'connected';
        this.isLiveDaemonConnected = status === 'connected';
        this.notify();
      }
    });

    daemonAdapter.connect();

    // 2. Bluetooth Adapter (WebBluetooth)
    this.bluetoothAdapter = new WebBluetoothAdapter({
      onDeviceConnected: (deviceId, name, telemetry, earbudBatteries) => {
        const leftBat = earbudBatteries?.left ?? telemetry.leftEarbudBatteryPercent ?? telemetry.batteryLevel;
        const rightBat = earbudBatteries?.right ?? telemetry.rightEarbudBatteryPercent ?? Math.max(0, telemetry.batteryLevel - 2);
        const caseBat = earbudBatteries?.case ?? telemetry.caseBatteryPercent ?? 92;

        const dev: WearableDevice = {
          id: 'dev-bt-headphones',
          name,
          category: 'bluetooth_peripheral',
          connectionType: 'web_bluetooth',
          status: 'connected',
          lastSeen: Date.now(),
          leftEarbudBatteryPercent: leftBat,
          rightEarbudBatteryPercent: rightBat,
          caseBatteryPercent: caseBat,
          ancMode: telemetry.ancMode === 'off' ? 'off' : telemetry.ancMode === 'transparency' ? 'transparency' : 'anc',
          rssiSignalStrengthDbm: telemetry.rssiSignalDbm || -48,
          telemetry: {
            ...telemetry,
            leftEarbudBatteryPercent: leftBat,
            rightEarbudBatteryPercent: rightBat,
            caseBatteryPercent: caseBat
          }
        };
        this.devices.set(dev.id, dev);
        soundFx.playConnect();
        this.notify();
      },
      onTelemetryUpdated: (deviceId, telemetryPatch) => {
        const dev = this.devices.get('dev-bt-headphones') as WearableDevice | undefined;
        if (dev) {
          dev.telemetry = { ...dev.telemetry, ...telemetryPatch };
          if (telemetryPatch.batteryLevel !== undefined) {
            dev.leftEarbudBatteryPercent = telemetryPatch.leftEarbudBatteryPercent ?? telemetryPatch.batteryLevel;
            dev.rightEarbudBatteryPercent = telemetryPatch.rightEarbudBatteryPercent ?? Math.max(0, telemetryPatch.batteryLevel - 2);
          }
          if (telemetryPatch.leftEarbudBatteryPercent !== undefined) {
            dev.leftEarbudBatteryPercent = telemetryPatch.leftEarbudBatteryPercent;
          }
          if (telemetryPatch.rightEarbudBatteryPercent !== undefined) {
            dev.rightEarbudBatteryPercent = telemetryPatch.rightEarbudBatteryPercent;
          }
          if (telemetryPatch.caseBatteryPercent !== undefined) {
            dev.caseBatteryPercent = telemetryPatch.caseBatteryPercent;
          }
          if (telemetryPatch.rssiSignalDbm !== undefined) {
            dev.rssiSignalStrengthDbm = telemetryPatch.rssiSignalDbm;
          }
          if (telemetryPatch.ancMode !== undefined) {
            dev.ancMode = telemetryPatch.ancMode === 'off' ? 'off' : telemetryPatch.ancMode === 'transparency' ? 'transparency' : 'anc';
          }
          dev.lastSeen = Date.now();
          this.notify();
        }
      },
      onDeviceDisconnected: () => {
        const dev = this.devices.get('dev-bt-headphones');
        if (dev) {
          dev.status = 'disconnected';
          this.notify();
        }
      },
      onConnectionStateChanged: (deviceId, state) => {
        const dev = this.devices.get('dev-bt-headphones');
        if (dev) {
          dev.status = state;
          this.notify();
        }
      },
      onError: (err) => console.warn('[DeviceManager] BT Error:', err)
    });

    // 3. WebHID Gamepad Adapter
    this.hidAdapter = new WebHidGamepadAdapter({
      onGamepadConnected: (gamepadId, name, telemetry) => {
        const buttonMap = createDefaultButtonMap();
        telemetry.buttons.forEach((b, idx) => {
          const keys = Object.keys(buttonMap) as GamepadButtonId[];
          if (keys[idx]) {
            buttonMap[keys[idx]] = {
              id: keys[idx],
              index: idx,
              name: b.name,
              pressed: b.pressed,
              value: b.value
            };
          }
        });

        const dev: GamepadDevice = {
          id: 'dev-hid-gamepad',
          name,
          category: 'gamepad_hid',
          connectionType: 'web_hid',
          status: 'connected',
          lastSeen: Date.now(),
          connectedPortIndex: telemetry.gamepadIndex,
          leftStick: {
            x: telemetry.axes[0]?.value ?? 0,
            y: telemetry.axes[1]?.value ?? 0
          },
          rightStick: {
            x: telemetry.axes[2]?.value ?? 0,
            y: telemetry.axes[3]?.value ?? 0
          },
          activeButtonStateMap: buttonMap,
          hapticRumbleCapabilities: {
            hasDualMotor: telemetry.hasVibration,
            hasTriggerRumble: true,
            minDurationMs: 50,
            maxDurationMs: 5000,
            supportsVariableFrequency: true
          },
          telemetry
        };
        this.devices.set(dev.id, dev);
        this.notify();
      },
      onGamepadTelemetry: (gamepadId, telemetry) => {
        const dev = this.devices.get('dev-hid-gamepad') as GamepadDevice | undefined;
        if (dev) {
          dev.telemetry = telemetry;
          dev.leftStick = {
            x: telemetry.axes[0]?.value ?? 0,
            y: telemetry.axes[1]?.value ?? 0
          };
          dev.rightStick = {
            x: telemetry.axes[2]?.value ?? 0,
            y: telemetry.axes[3]?.value ?? 0
          };
          telemetry.buttons.forEach((b, idx) => {
            const keys = Object.keys(dev.activeButtonStateMap) as GamepadButtonId[];
            if (keys[idx]) {
              dev.activeButtonStateMap[keys[idx]] = {
                id: keys[idx],
                index: idx,
                name: b.name,
                pressed: b.pressed,
                value: b.value
              };
            }
          });
          dev.lastSeen = Date.now();
          this.notify();
        }
      },
      onGamepadDisconnected: () => {
        const dev = this.devices.get('dev-hid-gamepad');
        if (dev) {
          dev.status = 'disconnected';
          this.notify();
        }
      }
    });
    this.hidAdapter.scanForGamepads();

    // 4. Smart TV Adapter
    this.smartTvAdapter = new SmartTvWebSocketAdapter(
      'ws://192.168.1.120:8001/api/v2',
      {
        onStatusChanged: (status) => {
          const tv = this.devices.get('dev-tv-living-room') as SmartTVDevice | undefined;
          if (tv) {
            tv.status = status === 'pairing' ? 'pairing' : status === 'connected' ? 'connected' : 'disconnected';
            tv.connectionState = status === 'pairing' ? 'pairing' : status === 'connected' ? 'connected' : 'disconnected';
            this.notify();
          }
        },
        onTelemetryUpdated: (patch) => {
          const tv = this.devices.get('dev-tv-living-room') as SmartTVDevice | undefined;
          if (tv) {
            tv.telemetry = { ...tv.telemetry, ...patch };
            if (patch.volume !== undefined) tv.currentVolumeLevel = patch.volume;
            if (patch.isMuted !== undefined) tv.isMuted = patch.isMuted;
            if (patch.currentApp !== undefined) tv.activeAppPackage = patch.currentApp;
            tv.lastSeen = Date.now();
            this.notify();
          }
        }
      }
    );
    this.smartTvAdapter.connect();

    // 5. P2P WebRTC Service
    this.p2pService = new WebRTCAdapter({
      onTelemetryUpdated: (peerId, patch) => {
        const p2p = this.devices.get('dev-p2p-sync') as P2PPeerDevice | undefined;
        if (p2p) {
          p2p.telemetry = { ...p2p.telemetry, ...patch };
          p2p.lastSeen = Date.now();
          this.notify();
        }
      },
      onFileTransferProgress: (progress) => {
        const p2p = this.devices.get('dev-p2p-sync') as P2PPeerDevice | undefined;
        if (p2p) {
          const transfers = [...p2p.telemetry.activeTransfers];
          const existingIndex = transfers.findIndex(t => t.id === progress.transferId);
          if (existingIndex >= 0) {
            transfers[existingIndex] = {
              ...transfers[existingIndex],
              progressPercent: progress.progressPercent,
              speedMBps: progress.speedMBps,
              speedBytesPerSec: progress.speedBytesPerSec,
              status: progress.status as any
            };
          }
          p2p.telemetry = {
            ...p2p.telemetry,
            activeTransfers: transfers
          };
          this.notify();
        }
      },
      onFileReceived: () => {
        soundFx.playConnect();
      },
      onClipboardReceived: () => {
        soundFx.playClick(920);
      }
    });
    this.p2pService.initPeer('OMNI-7829');
    const initialP2PTel = this.p2pService.getTelemetry();
    const p2pDev = this.devices.get('dev-p2p-sync') as P2PPeerDevice | undefined;
    if (p2pDev) {
      p2pDev.telemetry = initialP2PTel;
    }
  }

  // --- Public Operations ---

  public getDevices(): UniversalDevice[] {
    return Array.from(this.devices.values());
  }

  public getDeviceById(id: string): UniversalDevice | undefined {
    return this.devices.get(id);
  }

  public getIsLiveDaemon(): boolean {
    return this.isLiveDaemonConnected;
  }

  public getLatency(): number {
    return this.currentLatency;
  }

  public toggleDaemonSimulation(enableSimulation: boolean) {
    daemonAdapter.toggleMockMode(enableSimulation);
  }

  public retryDaemonConnection(url?: string) {
    daemonAdapter.connect(url);
  }

  public async scanBluetoothDevices() {
    soundFx.playClick();
    await this.bluetoothAdapter.scanAndConnect();
  }

  public async setBluetoothAncMode(mode: AncMode) {
    soundFx.playClick(650);
    await this.bluetoothAdapter.setAncMode('dev-bt-headphones', mode);
  }

  public scanGamepads() {
    soundFx.playClick();
    this.hidAdapter.scanForGamepads();
  }

  public async triggerGamepadRumble(request: RumbleTestRequest) {
    soundFx.playRumbleBlip();
    const gp = this.devices.get('dev-hid-gamepad') as GamepadDevice | undefined;
    if (gp) {
      // Create a mutable copy of telemetry to avoid readonly violation
      gp.telemetry = { ...gp.telemetry, vibratingNow: true };
      this.notify();
      setTimeout(() => {
        if (gp) {
          gp.telemetry = { ...gp.telemetry, vibratingNow: false };
          this.notify();
        }
      }, request.durationMs || 500);
    }
    return this.hidAdapter.triggerRumble(request);
  }

  public executeDaemonAction(action: string, params?: Record<string, string | number | boolean>) {
    soundFx.playClick(620);
    return daemonAdapter.executeAction(action, params);
  }

  public getDaemonActionResults() {
    return daemonAdapter.getRecentActionResults();
  }

  public getDaemonSystemControlState() {
    return daemonAdapter.getSystemControlState();
  }

  public sendSmartTvCommand(request: SmartTvCommandRequest) {
    soundFx.playClick(580);
    return this.smartTvAdapter.sendCommand(request);
  }

  public broadcastClipboard(text: string) {
    soundFx.playClick(880);
    return this.p2pService.broadcastClipboard(text);
  }

  public async sendP2PFile(file: File) {
    soundFx.playClick(720);
    return this.p2pService.sendFile(file);
  }

  public simulateP2PIncomingFile() {
    soundFx.playClick(640);
    this.p2pService.simulatePeerIncomingFile();
  }

  public toggleClipboardMirror(enabled: boolean) {
    this.p2pService.toggleClipboardMirror(enabled);
  }

  public getClipboardMirrorEnabled(): boolean {
    return this.p2pService.getClipboardMirrorEnabled();
  }

  public getP2PRemotePeerName(): string {
    return this.p2pService.getRemotePeerName();
  }

  public getP2PRoomCode(): string {
    return this.p2pService.getRoomCode();
  }

  // --- Subscriptions ---

  public subscribe(listener: DeviceStateListener): () => void {
    this.listeners.add(listener);
    listener(this.getDevices());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const list = this.getDevices();
    for (const listener of this.listeners) {
      listener(list);
    }
  }
}

export const deviceManager = new DeviceManagerService();
