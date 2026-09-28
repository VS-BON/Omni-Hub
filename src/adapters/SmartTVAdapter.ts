import {
  SmartTvCommandRequest,
  SmartTvRemoteKey,
  SmartTvTelemetry,
  SmartTvWsEventPacket
} from '../types/index.js';

export type SmartTvProtocolBrand = 'LG webOS' | 'Samsung Tizen' | 'Android TV' | 'Generic';
export type SmartTvConnectionStatus = 'connected' | 'connecting' | 'pairing' | 'disconnected' | 'error';

export interface SmartTvAdapterListener {
  onStatusChanged: (status: SmartTvConnectionStatus) => void;
  onTelemetryUpdated: (telemetry: Partial<SmartTvTelemetry>) => void;
  onCommandAck?: (command: string, success: boolean) => void;
}

export interface AppShortcutDefinition {
  id: string;
  name: string;
  tizenAppId: string;
  webosPackageId: string;
  androidPackageId: string;
}

export const POPULAR_TV_APPS: Record<string, AppShortcutDefinition> = {
  youtube: {
    id: 'youtube',
    name: 'YouTube',
    tizenAppId: '111299001912',
    webosPackageId: 'youtube.leanback.v4',
    androidPackageId: 'com.google.android.youtube.tv'
  },
  netflix: {
    id: 'netflix',
    name: 'Netflix',
    tizenAppId: '11101200001',
    webosPackageId: 'netflix',
    androidPackageId: 'com.netflix.ninja'
  },
  prime: {
    id: 'prime',
    name: 'Prime Video',
    tizenAppId: '3201512006785',
    webosPackageId: 'amazon',
    androidPackageId: 'com.amazon.amazonvideo.livingroom'
  },
  spotify: {
    id: 'spotify',
    name: 'Spotify',
    tizenAppId: '3201606009684',
    webosPackageId: 'spotify-beehive',
    androidPackageId: 'com.spotify.tv.android'
  },
  plex: {
    id: 'plex',
    name: 'Plex Media',
    tizenAppId: '3201512006998',
    webosPackageId: 'cdp-30',
    androidPackageId: 'com.plexapp.android'
  }
};

const TV_CHANNELS = [
  { num: 104, name: 'CyberNews 4K' },
  { num: 107, name: 'Discovery Ultra' },
  { num: 201, name: 'Formula 1 Live' },
  { num: 305, name: 'Bloomberg Tech' },
  { num: 412, name: 'Cinema 4K HDR' },
  { num: 518, name: 'NASA TV HD' }
];

export class SmartTVAdapter {
  private ws: WebSocket | null = null;
  private endpointUrl: string;
  private listener: SmartTvAdapterListener;
  private currentTelemetry: SmartTvTelemetry;
  private isSimulated = true;
  private brand: SmartTvProtocolBrand = 'LG webOS';
  private reqIdCounter = 1;
  private currentChannelIndex = 0;

  constructor(
    endpointUrl: string = 'ws://192.168.1.120:8001/api/v2/channels/samsung.remote.control',
    listener: SmartTvAdapterListener,
    initialBrand: SmartTvProtocolBrand = 'LG webOS'
  ) {
    this.endpointUrl = endpointUrl;
    this.listener = listener;
    this.brand = initialBrand;

    this.currentTelemetry = {
      brand: this.brand,
      powerState: 'on',
      volume: 24,
      isMuted: false,
      activeInput: 'HDMI 1 (eARC)',
      currentApp: 'YouTube',
      ipAddress: '192.168.1.120',
      macAddress: 'C8:02:8D:4F:91:EE',
      channel: TV_CHANNELS[0].num,
      channelName: TV_CHANNELS[0].name,
      mediaPlaybackState: 'playing'
    };
  }

  public getBrand(): SmartTvProtocolBrand {
    return this.brand;
  }

  public setBrand(newBrand: SmartTvProtocolBrand) {
    this.brand = newBrand;
    this.currentTelemetry.brand = newBrand;
    this.listener.onTelemetryUpdated({ brand: newBrand });
  }

  public connect(url?: string) {
    if (url) this.endpointUrl = url;
    this.listener.onStatusChanged('connecting');

    try {
      if (typeof WebSocket === 'undefined') {
        this.enableLocalVirtualTv();
        return;
      }

      this.ws = new WebSocket(this.endpointUrl);

      this.ws.onopen = () => {
        this.isSimulated = false;
        if (this.brand === 'LG webOS') {
          this.performWebOSHandshake();
        } else {
          this.listener.onStatusChanged('connected');
        }
        this.listener.onTelemetryUpdated(this.currentTelemetry);
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleInboundWsMessage(data);
        } catch {
          // Non-JSON heartbeat
        }
      };

      this.ws.onerror = () => {
        // Fallback to local simulated smart TV session for browser sandbox
        this.enableLocalVirtualTv();
      };

      this.ws.onclose = () => {
        if (!this.isSimulated) {
          this.enableLocalVirtualTv();
        }
      };
    } catch {
      this.enableLocalVirtualTv();
    }
  }

  private performWebOSHandshake() {
    this.listener.onStatusChanged('pairing');
    const registerPayload = {
      type: 'register',
      id: `reg_${this.reqIdCounter++}`,
      payload: {
        forcePairing: false,
        pairingType: 'PROMPT',
        'client-key': 'omnihub-control-token-e91',
        manifest: {
          manifestVersion: 1,
          appVersion: '1.0.0',
          signed: {
            created: '20260928',
            appId: 'com.omnihub.remote',
            vendorId: 'omnihub',
            localizedAppNames: { '': 'OmniHub Remote' },
            permissions: [
              'CONTROL_AUDIO',
              'CONTROL_INPUT_MEDIA_PLAYBACK',
              'READ_CURRENT_CHANNEL',
              'LAUNCH',
              'CONTROL_POWER'
            ]
          }
        }
      }
    };

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(registerPayload));
    }

    // After handshake
    setTimeout(() => {
      this.listener.onStatusChanged('connected');
    }, 600);
  }

  private enableLocalVirtualTv() {
    this.isSimulated = true;
    this.listener.onStatusChanged('connected');
    this.listener.onTelemetryUpdated(this.currentTelemetry);
  }

  /**
   * Dispatches command according to the active TV protocol format (LG webOS or Samsung Tizen)
   */
  public sendCommand(request: SmartTvCommandRequest): boolean {
    // 1. Dispatch over real WebSocket if connected
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      if (this.brand === 'Samsung Tizen') {
        this.sendSamsungTizenCommand(request);
      } else {
        this.sendLgWebOsCommand(request);
      }
    }

    // 2. Perform realistic state synchronization
    this.applyLocalStateUpdate(request);
    this.listener.onCommandAck?.(request.key || request.action, true);
    return true;
  }

  /**
   * Samsung Tizen ms.remote.control / ms.channel.emit protocol
   */
  private sendSamsungTizenCommand(request: SmartTvCommandRequest) {
    if (!this.ws) return;

    if (request.action === 'key_press' && request.key) {
      const tizenKeyMap: Record<SmartTvRemoteKey, string> = {
        POWER: 'KEY_POWER',
        UP: 'KEY_UP',
        DOWN: 'KEY_DOWN',
        LEFT: 'KEY_LEFT',
        RIGHT: 'KEY_RIGHT',
        ENTER: 'KEY_ENTER',
        BACK: 'KEY_RETURN',
        HOME: 'KEY_HOME',
        VOL_UP: 'KEY_VOLUP',
        VOL_DOWN: 'KEY_VOLDOWN',
        MUTE: 'KEY_MUTE',
        CH_UP: 'KEY_CHUP',
        CH_DOWN: 'KEY_CHDOWN',
        PLAY: 'KEY_PLAY',
        PAUSE: 'KEY_PAUSE',
        STOP: 'KEY_STOP',
        PLAY_PAUSE: 'KEY_PLAY_PAUSE',
        INPUT_HDMI1: 'KEY_HDMI',
        INPUT_HDMI2: 'KEY_HDMI2'
      };

      const keyCmd = tizenKeyMap[request.key] || 'KEY_ENTER';
      this.ws.send(JSON.stringify({
        method: 'ms.remote.control',
        params: {
          Cmd: 'Click',
          DataOfCmd: keyCmd,
          Option: 'false',
          TypeOfRemote: 'SendRemoteKey'
        }
      }));
    } else if (request.action === 'launch_app' && request.appId) {
      const app = POPULAR_TV_APPS[request.appId];
      if (app) {
        this.ws.send(JSON.stringify({
          method: 'ms.channel.emit',
          params: {
            event: 'ed.apps.launch',
            to: 'host',
            data: {
              appId: app.tizenAppId,
              action_type: 'DEEP_LINK'
            }
          }
        }));
      }
    }
  }

  /**
   * LG webOS SSAP protocol
   */
  private sendLgWebOsCommand(request: SmartTvCommandRequest) {
    if (!this.ws) return;

    const reqId = `req_${this.reqIdCounter++}`;

    if (request.action === 'key_press' && request.key) {
      const uriMap: Partial<Record<SmartTvRemoteKey, string>> = {
        VOL_UP: 'ssap://audio/volumeUp',
        VOL_DOWN: 'ssap://audio/volumeDown',
        MUTE: 'ssap://audio/setMute',
        CH_UP: 'ssap://tv/channelUp',
        CH_DOWN: 'ssap://tv/channelDown',
        PLAY: 'ssap://media.controls/play',
        PAUSE: 'ssap://media.controls/pause',
        STOP: 'ssap://media.controls/stop',
        PLAY_PAUSE: 'ssap://media.controls/play',
        HOME: 'ssap://system/home',
        BACK: 'ssap://system/back',
        POWER: 'ssap://system/turnOff'
      };

      const uri = uriMap[request.key];
      if (uri) {
        this.ws.send(JSON.stringify({
          type: 'request',
          id: reqId,
          uri,
          payload: request.key === 'MUTE' ? { mute: !this.currentTelemetry.isMuted } : {}
        }));
      } else {
        // D-Pad navigation keys
        this.ws.send(JSON.stringify({
          type: 'request',
          id: reqId,
          uri: 'ssap://com.webos.service.ime/sendEnterKey',
          payload: { key: request.key.toLowerCase() }
        }));
      }
    } else if (request.action === 'set_volume' && typeof request.volume === 'number') {
      this.ws.send(JSON.stringify({
        type: 'request',
        id: reqId,
        uri: 'ssap://audio/setVolume',
        payload: { volume: request.volume }
      }));
    } else if (request.action === 'launch_app' && request.appId) {
      const app = POPULAR_TV_APPS[request.appId];
      if (app) {
        this.ws.send(JSON.stringify({
          type: 'request',
          id: reqId,
          uri: 'ssap://system.launcher/launch',
          payload: { id: app.webosPackageId }
        }));
      }
    }
  }

  /**
   * Reactive state simulation for smooth animations and immediate UX responsiveness
   */
  private applyLocalStateUpdate(request: SmartTvCommandRequest) {
    if (request.action === 'key_press' && request.key) {
      switch (request.key) {
        case 'POWER':
          this.currentTelemetry.powerState = this.currentTelemetry.powerState === 'on' ? 'standby' : 'on';
          this.listener.onTelemetryUpdated({ powerState: this.currentTelemetry.powerState });
          break;

        case 'VOL_UP':
          this.currentTelemetry.volume = Math.min(100, this.currentTelemetry.volume + 1);
          this.currentTelemetry.isMuted = false;
          this.listener.onTelemetryUpdated({ volume: this.currentTelemetry.volume, isMuted: false });
          break;

        case 'VOL_DOWN':
          this.currentTelemetry.volume = Math.max(0, this.currentTelemetry.volume - 1);
          this.listener.onTelemetryUpdated({ volume: this.currentTelemetry.volume });
          break;

        case 'MUTE':
          this.currentTelemetry.isMuted = !this.currentTelemetry.isMuted;
          this.listener.onTelemetryUpdated({ isMuted: this.currentTelemetry.isMuted });
          break;

        case 'CH_UP':
          this.currentChannelIndex = (this.currentChannelIndex + 1) % TV_CHANNELS.length;
          this.currentTelemetry.channel = TV_CHANNELS[this.currentChannelIndex].num;
          this.currentTelemetry.channelName = TV_CHANNELS[this.currentChannelIndex].name;
          this.listener.onTelemetryUpdated({
            channel: this.currentTelemetry.channel,
            channelName: this.currentTelemetry.channelName
          });
          break;

        case 'CH_DOWN':
          this.currentChannelIndex = (this.currentChannelIndex - 1 + TV_CHANNELS.length) % TV_CHANNELS.length;
          this.currentTelemetry.channel = TV_CHANNELS[this.currentChannelIndex].num;
          this.currentTelemetry.channelName = TV_CHANNELS[this.currentChannelIndex].name;
          this.listener.onTelemetryUpdated({
            channel: this.currentTelemetry.channel,
            channelName: this.currentTelemetry.channelName
          });
          break;

        case 'PLAY':
          this.currentTelemetry.mediaPlaybackState = 'playing';
          this.listener.onTelemetryUpdated({ mediaPlaybackState: 'playing' });
          break;

        case 'PAUSE':
          this.currentTelemetry.mediaPlaybackState = 'paused';
          this.listener.onTelemetryUpdated({ mediaPlaybackState: 'paused' });
          break;

        case 'STOP':
          this.currentTelemetry.mediaPlaybackState = 'stopped';
          this.listener.onTelemetryUpdated({ mediaPlaybackState: 'stopped' });
          break;

        case 'PLAY_PAUSE':
          this.currentTelemetry.mediaPlaybackState =
            this.currentTelemetry.mediaPlaybackState === 'playing' ? 'paused' : 'playing';
          this.listener.onTelemetryUpdated({ mediaPlaybackState: this.currentTelemetry.mediaPlaybackState });
          break;

        case 'INPUT_HDMI1':
          this.currentTelemetry.activeInput = 'HDMI 1 (eARC)';
          this.listener.onTelemetryUpdated({ activeInput: 'HDMI 1 (eARC)' });
          break;

        case 'INPUT_HDMI2':
          this.currentTelemetry.activeInput = 'HDMI 2 (Console)';
          this.listener.onTelemetryUpdated({ activeInput: 'HDMI 2 (Console)' });
          break;

        case 'HOME':
          this.currentTelemetry.currentApp = 'Home Screen';
          this.listener.onTelemetryUpdated({ currentApp: 'Home Screen' });
          break;

        case 'BACK':
        case 'UP':
        case 'DOWN':
        case 'LEFT':
        case 'RIGHT':
        case 'ENTER':
          // D-Pad cursor ticks
          break;
      }
    } else if (request.action === 'set_volume' && typeof request.volume === 'number') {
      this.currentTelemetry.volume = Math.max(0, Math.min(100, request.volume));
      this.currentTelemetry.isMuted = false;
      this.listener.onTelemetryUpdated({ volume: this.currentTelemetry.volume, isMuted: false });
    } else if (request.action === 'launch_app' && request.appId) {
      const app = POPULAR_TV_APPS[request.appId];
      if (app) {
        this.currentTelemetry.currentApp = app.name;
        this.currentTelemetry.mediaPlaybackState = 'playing';
        this.listener.onTelemetryUpdated({
          currentApp: app.name,
          mediaPlaybackState: 'playing'
        });
      }
    }
  }

  private handleInboundWsMessage(data: SmartTvWsEventPacket | Record<string, unknown>) {
    if ('event' in data && data.event === 'volume_change' && typeof data.volume === 'number') {
      this.currentTelemetry.volume = data.volume;
      this.listener.onTelemetryUpdated({ volume: data.volume });
    }
  }

  public getTelemetry(): SmartTvTelemetry {
    return { ...this.currentTelemetry };
  }

  public disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.listener.onStatusChanged('disconnected');
  }
}

// Backward-compatibility alias
export { SmartTVAdapter as SmartTvWebSocketAdapter };
