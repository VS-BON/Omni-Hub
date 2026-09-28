/**
 * OmniHub Unified Type System
 * Production-ready polymorphic UniversalDevice schema, real-time telemetry contracts,
 * WebRTC P2P state tracking, and WebSocket protocol definitions.
 * Strictly typed with ZERO `any` usage.
 */

// -------------------------------------------------------------
// 1. Device Classifications, Enums & Status Identifiers
// -------------------------------------------------------------

export type DeviceCategory =
  | 'host_pc'
  | 'bluetooth_peripheral'
  | 'gamepad_hid'
  | 'smart_tv'
  | 'p2p_peer';

export type ConnectionType =
  | 'daemon_ws'
  | 'web_bluetooth'
  | 'web_hid'
  | 'local_ws'
  | 'webrtc_p2p';

export type DeviceConnectionStatus =
  | 'connected'
  | 'connecting'
  | 'disconnected'
  | 'pairing'
  | 'error'
  | 'idle';

export type SmartTvConnectionState =
  | 'connected'
  | 'connecting'
  | 'standby'
  | 'disconnected'
  | 'pairing'
  | 'pairing_required';

export type WearableAncMode = 'anc' | 'transparency' | 'off';
export type AncMode = WearableAncMode | 'adaptive';

// -------------------------------------------------------------
// 2. Hardware Sub-component Data Models
// -------------------------------------------------------------

export interface CoreThermalData {
  readonly coreIndex: number;
  readonly loadPercent: number;
  readonly tempCelsius: number;
}

export interface DiskSpec {
  readonly fs: string;
  readonly mount: string;
  readonly type: string;
  readonly sizeBytes: number;
  readonly usedBytes: number;
  readonly usePercent: number;
  readonly isRemovable?: boolean;
}

export interface StickVectorCoordinates {
  readonly x: number; // Normalized -1.000 to +1.000
  readonly y: number; // Normalized -1.000 to +1.000
}

export type GamepadButtonId =
  | 'button_south'     // A / Cross
  | 'button_east'      // B / Circle
  | 'button_west'      // X / Square
  | 'button_north'     // Y / Triangle
  | 'bumper_left'      // LB / L1
  | 'bumper_right'     // RB / R1
  | 'trigger_left'     // LT / L2
  | 'trigger_right'    // RT / R2
  | 'select'           // Back / View
  | 'start'            // Options / Menu
  | 'stick_press_left' // L3
  | 'stick_press_right'// R3
  | 'dpad_up'
  | 'dpad_down'
  | 'dpad_left'
  | 'dpad_right'
  | 'home';            // Guide / PS

export interface GamepadButtonValue {
  readonly id: GamepadButtonId;
  readonly index: number;
  readonly name: string;
  readonly pressed: boolean;
  readonly value: number; // 0.0 to 1.0 (analog trigger support)
}

export interface HapticRumbleCapabilities {
  readonly hasDualMotor: boolean;
  readonly hasTriggerRumble: boolean;
  readonly minDurationMs: number;
  readonly maxDurationMs: number;
  readonly supportsVariableFrequency: boolean;
}

export interface SmartTvAppShortcut {
  readonly id: string;
  readonly name: string;
  readonly packageName: string;
  readonly iconIdentifier?: string;
  readonly deepLinkUri?: string;
}

// -------------------------------------------------------------
// 3. Web Bluetooth DOM Mock Interface (Zero `any`)
// -------------------------------------------------------------

export interface BluetoothGattCharacteristicLike {
  readonly uuid: string;
  readValue(): Promise<DataView>;
  writeValue(value: BufferSource): Promise<void>;
  startNotifications(): Promise<BluetoothGattCharacteristicLike>;
  stopNotifications(): Promise<BluetoothGattCharacteristicLike>;
  addEventListener(type: string, listener: (event: Event) => void): void;
  removeEventListener(type: string, listener: (event: Event) => void): void;
}

export interface BluetoothGattServiceLike {
  readonly uuid: string;
  getCharacteristic(characteristic: string | number): Promise<BluetoothGattCharacteristicLike>;
}

export interface BluetoothGattServerLike {
  readonly connected: boolean;
  connect(): Promise<BluetoothGattServerLike>;
  disconnect(): void;
  getPrimaryService(service: string | number): Promise<BluetoothGattServiceLike>;
}

export interface BluetoothDeviceLike {
  readonly id: string;
  readonly name?: string;
  readonly gatt?: BluetoothGattServerLike;
  addEventListener(type: 'gattserverdisconnected', listener: (event: Event) => void): void;
  removeEventListener(type: 'gattserverdisconnected', listener: (event: Event) => void): void;
}

// -------------------------------------------------------------
// 4. Telemetry Payload Schemas (Strict & Backward-Compatible)
// -------------------------------------------------------------

export interface HostCpuTelemetry {
  readonly model: string;
  readonly speedGhz: number;
  readonly coresCount: number;
  readonly loadPercent: number;
  readonly coreLoads: readonly number[];
  readonly temperatureCelsius: number;
}

export interface HostMemoryTelemetry {
  readonly totalBytes: number;
  readonly usedBytes: number;
  readonly freeBytes: number;
  readonly activePercent: number;
  readonly swapTotalBytes?: number;
  readonly swapUsedBytes?: number;
}

export interface HostGpuTelemetry {
  readonly vendor: string;
  readonly model: string;
  readonly utilizationPercent: number;
  readonly memoryTotalMb: number;
  readonly memoryUsedMb: number;
  readonly temperatureCelsius: number;
}

export type HostStorageVolume = DiskSpec;

export interface HostNetworkTelemetry {
  readonly rxBytesPerSec: number;
  readonly txBytesPerSec: number;
  readonly primaryInterface: string;
  readonly ip4: string;
}

export interface HostPcTelemetry {
  readonly system: {
    readonly hostname: string;
    readonly platform: string;
    readonly distro: string;
    readonly arch: string;
    readonly uptimeSeconds: number;
  };
  readonly cpu: HostCpuTelemetry;
  readonly memory: HostMemoryTelemetry;
  readonly gpu: HostGpuTelemetry;
  readonly storage: readonly HostStorageVolume[];
  readonly network: HostNetworkTelemetry;
  readonly battery?: {
    readonly hasBattery: boolean;
    readonly isCharging: boolean;
    readonly percent: number;
  };
}

export interface BluetoothPeripheralTelemetry {
  readonly batteryLevel: number; // 0 - 100
  readonly isCharging?: boolean;
  readonly ancMode?: AncMode;
  readonly rssiSignalDbm?: number;
  readonly codec?: 'AAC' | 'LDAC' | 'aptX' | 'SBC';
  readonly firmwareVersion?: string;
  readonly connectedProfile?: 'A2DP' | 'HFP' | 'GATT_BATTERY';
  readonly characteristicsAvailable: readonly string[];
  readonly leftEarbudBatteryPercent?: number;
  readonly rightEarbudBatteryPercent?: number;
  readonly caseBatteryPercent?: number;
}

export interface GamepadAxisState {
  readonly index: number;
  readonly name: string;
  readonly value: number;
}

export interface GamepadButtonState {
  readonly index: number;
  readonly name: string;
  readonly pressed: boolean;
  readonly value: number;
}

export interface GamepadHidTelemetry {
  readonly gamepadIndex: number;
  readonly gamepadId: string;
  readonly mapping: string;
  readonly axes: readonly GamepadAxisState[];
  readonly buttons: readonly GamepadButtonState[];
  readonly hasVibration: boolean;
  readonly vibratingNow: boolean;
  readonly vendorId?: string;
  readonly productId?: string;
  readonly batteryPercent?: number;
}

export interface SmartTvTelemetry {
  powerState: 'on' | 'standby' | 'off';
  volume: number; // 0 - 100
  isMuted: boolean;
  activeInput: string;
  currentApp?: string;
  ipAddress: string;
  brand: 'LG webOS' | 'Samsung Tizen' | 'Android TV' | 'Generic';
  macAddress?: string;
  channel?: number;
  channelName?: string;
  mediaPlaybackState?: 'playing' | 'paused' | 'stopped';
}

// -------------------------------------------------------------
// 5. Polymorphic Base & Specialized Device Interfaces
// -------------------------------------------------------------

export interface UniversalDeviceBase<
  TCategory extends DeviceCategory = DeviceCategory,
  TConn extends ConnectionType = ConnectionType
> {
  readonly id: string;
  readonly name: string;
  readonly category: TCategory;
  readonly connectionType: TConn;
  status: DeviceConnectionStatus;
  lastSeen: number;
  latencyMs?: number;
  vendor?: string;
  macAddress?: string;
  ipAddress?: string;
  firmwareVersion?: string;
  metadata?: Readonly<Record<string, string | number | boolean | null>>;
}

/**
 * 1. PCDevice:
 * CPU load/thermals (per core array), GPU utilization/VRAM, RAM used/total,
 * network up/down rates, disk specs, and local daemon online status.
 */
export interface PCDevice extends UniversalDeviceBase<'host_pc', 'daemon_ws'> {
  daemonOnline: boolean;
  endpointUrl: string;
  // Per-core arrays & thermals
  coreLoads: number[];
  coreThermals: number[];
  // GPU utilization & VRAM
  gpuUtilization: number;
  gpuVramUsedMb: number;
  gpuVramTotalMb: number;
  gpuTemperatureCelsius: number;
  // RAM used and total
  ramUsedBytes: number;
  ramTotalBytes: number;
  ramActivePercent: number;
  // Network up/down rates
  networkDownRateBytesPerSec: number;
  networkUpRateBytesPerSec: number;
  networkDownRateMBps?: number;
  networkUpRateMBps?: number;
  // Disks specifications
  disks: DiskSpec[];
  // Underlying full telemetry frame
  telemetry: HostPcTelemetry;
}

/**
 * 2. SmartTVDevice:
 * Connection state, active app package name, current volume level,
 * mute state, and available app quick-launch shortcuts.
 */
export interface SmartTVDevice extends UniversalDeviceBase<'smart_tv', 'local_ws'> {
  connectionState: SmartTvConnectionState;
  activeAppPackage: string;
  currentVolumeLevel: number;
  isMuted: boolean;
  quickLaunchShortcuts: SmartTvAppShortcut[];
  wsEndpointUrl: string;
  telemetry: SmartTvTelemetry;
}

/**
 * 3. WearableDevice:
 * Left earbud %, Right earbud %, Case %, ANC mode ('anc' | 'transparency' | 'off'),
 * and Bluetooth signal strength (RSSI).
 */
export interface WearableDevice extends UniversalDeviceBase<'bluetooth_peripheral', 'web_bluetooth'> {
  leftEarbudBatteryPercent: number;
  rightEarbudBatteryPercent: number;
  caseBatteryPercent: number;
  ancMode: WearableAncMode;
  rssiSignalStrengthDbm: number;
  deviceHandle?: BluetoothDeviceLike;
  telemetry: BluetoothPeripheralTelemetry;
}

/**
 * 4. GamepadDevice:
 * Connected port/index, analog stick vector coordinates (X/Y),
 * active button state map, and haptic rumble capabilities.
 */
export interface GamepadDevice extends UniversalDeviceBase<'gamepad_hid', 'web_hid'> {
  connectedPortIndex: number;
  leftStick: StickVectorCoordinates;
  rightStick: StickVectorCoordinates;
  activeButtonStateMap: Record<GamepadButtonId, GamepadButtonValue>;
  hapticRumbleCapabilities: HapticRumbleCapabilities;
  telemetry: GamepadHidTelemetry;
}

/**
 * 5. P2PPeerDevice:
 * WebRTC DataChannel peer synchronization node.
 */
export interface P2PPeerDevice extends UniversalDeviceBase<'p2p_peer', 'webrtc_p2p'> {
  peerId: string;
  peerPublicKey?: string;
  telemetry: P2PPeerTelemetry;
}

// Polymorphic Union
export type UniversalDevice =
  | PCDevice
  | SmartTVDevice
  | WearableDevice
  | GamepadDevice
  | P2PPeerDevice;

// Aliases for seamless backward compatibility across existing services & components
export type HostPcDevice = PCDevice;
export type SmartTvDevice = SmartTVDevice;
export type BluetoothPeripheralDevice = WearableDevice;
export type GamepadHidDevice = GamepadDevice;

// -------------------------------------------------------------
// 6. WebRTC P2P Transfer & Clipboard Schemas
// -------------------------------------------------------------

export type P2PTransferStatus =
  | 'pending'
  | 'negotiating'
  | 'transferring'
  | 'verifying'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface P2PFileTransferProgressState {
  readonly transferId: string;
  readonly fileName: string;
  readonly fileSizeBytes: number;
  bytesTransferred: number;
  progressPercent: number; // 0 - 100
  speedMBps: number;       // Direct MB/s metric
  speedBytesPerSec: number;
  direction: 'incoming' | 'outgoing';
  status: P2PTransferStatus;
  chunkIndex: number;
  totalChunks: number;
  chunkSizeBytes: number;
  estimatedTimeRemainingSeconds: number | null;
  checksumSha256?: string;
  blobUrl?: string;
  error?: string;
  timestamp: number;
}

export interface FileTransferItem {
  readonly id: string;
  readonly name: string;
  readonly sizeBytes: number;
  readonly mimeType: string;
  readonly direction: 'incoming' | 'outgoing';
  progressPercent: number; // 0 - 100
  status: 'pending' | 'transferring' | 'completed' | 'failed';
  speedBytesPerSec: number;
  speedMBps?: number;
  blobUrl?: string;
  timestamp: number;
}

export interface ClipboardSyncItem {
  readonly id: string;
  readonly senderId: string;
  readonly senderName: string;
  readonly text: string;
  readonly timestamp: number;
}

export interface P2PPeerTelemetry {
  readonly peerId: string;
  connectionState: RTCPeerConnectionState | 'disconnected';
  iceConnectionState: RTCIceConnectionState | 'new';
  dataChannelState: RTCDataChannelState | 'closed';
  bytesSent: number;
  bytesReceived: number;
  activeTransfers: FileTransferItem[];
  clipboardHistory: ClipboardSyncItem[];
  latencyRttMs?: number;
}

// -------------------------------------------------------------
// 7. Real-Time WebSocket Event Schemas (Inbound & Outbound)
// -------------------------------------------------------------

export type DaemonWsMessageType =
  | 'TELEMETRY_BROADCAST'
  | 'PONG'
  | 'ACTION_RESULT'
  | 'HEARTBEAT'
  | 'ERROR';

export interface WsTelemetryBroadcastPacket {
  readonly type: 'TELEMETRY_BROADCAST';
  readonly version: string;
  readonly timestamp: number;
  readonly system: HostPcTelemetry['system'];
  readonly cpu: HostCpuTelemetry;
  readonly memory: HostMemoryTelemetry;
  readonly gpu: HostGpuTelemetry;
  readonly storage: readonly DiskSpec[];
  readonly network: HostNetworkTelemetry;
  readonly battery?: HostPcTelemetry['battery'];
}

export interface WsPongPacket {
  readonly type: 'PONG';
  readonly clientTimestamp: number;
  readonly serverTimestamp: number;
}

export interface WsActionResultPacket {
  readonly type: 'ACTION_RESULT';
  readonly action: string;
  readonly success: boolean;
  readonly timestamp: number;
  readonly message?: string;
}

export interface WsHeartbeatPacket {
  readonly type: 'HEARTBEAT';
  readonly uptimeSeconds: number;
  readonly timestamp: number;
}

export interface WsErrorPacket {
  readonly type: 'ERROR';
  readonly code: string;
  readonly message: string;
  readonly timestamp: number;
}

export type DaemonWsInboundPacket =
  | WsTelemetryBroadcastPacket
  | WsPongPacket
  | WsActionResultPacket
  | WsHeartbeatPacket
  | WsErrorPacket;

export type DaemonWsOutboundAction =
  | 'ping'
  | 'request_metrics'
  | 'set_interval'
  | 'execute_action';

export interface WsPingPacket {
  readonly action: 'ping';
  readonly payload: {
    readonly clientTimestamp: number;
  };
}

export interface WsRequestMetricsPacket {
  readonly action: 'request_metrics';
}

export interface WsSetIntervalPacket {
  readonly action: 'set_interval';
  readonly payload: {
    readonly intervalMs: number;
  };
}

export interface WsExecuteActionPacket {
  readonly action: 'execute_action';
  readonly payload: {
    readonly targetAction: string;
    readonly params?: Readonly<Record<string, string | number | boolean>>;
  };
}

export type DaemonWsOutboundPacket =
  | WsPingPacket
  | WsRequestMetricsPacket
  | WsSetIntervalPacket
  | WsExecuteActionPacket;

// Smart TV WebSocket Packet Schemas
export interface SmartTvWsCommandPacket {
  readonly method: 'ms.remote.control';
  readonly params: {
    readonly Cmd: 'Click';
    readonly DataOfCmd: string;
    readonly Option: 'false';
    readonly TypeOfRemote: 'SendRemoteKey';
  };
}

export interface SmartTvWsEventPacket {
  readonly event: 'volume_change' | 'app_launch' | 'power_state';
  readonly volume?: number;
  readonly app?: string;
  readonly powerState?: 'on' | 'standby';
}

// -------------------------------------------------------------
// 8. Global Connection Status Badges
// -------------------------------------------------------------

export type ConnectionBadgeStatus =
  | 'optimal'
  | 'healthy'
  | 'degraded'
  | 'syncing'
  | 'pairing'
  | 'offline'
  | 'error'
  | 'encrypted';

export type BadgeColorVariant =
  | 'emerald'
  | 'cyan'
  | 'amber'
  | 'rose'
  | 'violet'
  | 'slate';

export interface GlobalConnectionBadge {
  readonly status: ConnectionBadgeStatus;
  readonly label: string;
  readonly subtext: string;
  readonly colorVariant: BadgeColorVariant;
  readonly latencyMs?: number;
  readonly encrypted: boolean;
  readonly protocol: ConnectionType;
  readonly packetLossPercent?: number;
}

// -------------------------------------------------------------
// 9. Action Payloads & Control Commands
// -------------------------------------------------------------

export interface AncModeChangeRequest {
  readonly deviceId: string;
  readonly mode: AncMode;
}

export interface RumbleTestRequest {
  readonly deviceId: string;
  readonly durationMs: number;
  readonly strongMagnitude: number; // 0.0 - 1.0 (Low-frequency heavy motor)
  readonly weakMagnitude: number;   // 0.0 - 1.0 (High-frequency light motor)
}

export type SmartTvRemoteKey =
  | 'POWER'
  | 'UP'
  | 'DOWN'
  | 'LEFT'
  | 'RIGHT'
  | 'ENTER'
  | 'BACK'
  | 'HOME'
  | 'VOL_UP'
  | 'VOL_DOWN'
  | 'MUTE'
  | 'CH_UP'
  | 'CH_DOWN'
  | 'PLAY'
  | 'PAUSE'
  | 'STOP'
  | 'PLAY_PAUSE'
  | 'INPUT_HDMI1'
  | 'INPUT_HDMI2';

export interface SmartTvCommandRequest {
  readonly deviceId: string;
  readonly action: 'key_press' | 'set_volume' | 'launch_app' | 'media_control' | 'set_channel';
  readonly key?: SmartTvRemoteKey;
  readonly volume?: number;
  readonly channel?: number;
  readonly appId?: 'youtube' | 'netflix' | 'plex' | 'spotify' | 'prime' | string;
}

export interface P2PFileDropRequest {
  readonly targetPeerId?: string;
  readonly file: File;
}

export interface P2PClipboardBroadcastRequest {
  readonly text: string;
}

// -------------------------------------------------------------
// 10. Hub Central State Model
// -------------------------------------------------------------

export interface HubState {
  devices: UniversalDevice[];
  selectedDeviceId: string | null;
  daemonWsUrl: string;
  isDaemonConnected: boolean;
  daemonLatencyMs: number;
  p2pRoomCode: string;
  isP2PInitialized: boolean;
  activeFilter: DeviceCategory | 'all';
  globalStatusBadges: GlobalConnectionBadge[];
}
