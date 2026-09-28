import React, { useState } from 'react';
import {
  Tv,
  Power,
  Volume2,
  VolumeX,
  Volume1,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Home,
  RotateCcw,
  Play,
  Pause,
  Square,
  Radio,
  Sliders,
  Sparkles,
  Wifi,
  Film,
  Music,
  CheckCircle2,
  Layers,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { SmartTvCommandRequest, SmartTvDevice, SmartTvRemoteKey } from '../types/index.js';
import { soundFx } from '../services/audioFeedback.js';
import { POPULAR_TV_APPS } from '../adapters/SmartTVAdapter.js';

interface SmartTvCardProps {
  device: SmartTvDevice;
  onSendCommand: (request: SmartTvCommandRequest) => void;
  activityRank?: number;
  activityReason?: string;
  isAutoSorted?: boolean;
}

export const SmartTvCard: React.FC<SmartTvCardProps> = ({
  device,
  onSendCommand,
  activityRank,
  activityReason,
  isAutoSorted
}) => {
  const { telemetry } = device;
  const isPowerOn = telemetry.powerState === 'on';
  const currentApp = telemetry.currentApp || 'Home Screen';
  const volume = telemetry.volume ?? 24;
  const isMuted = telemetry.isMuted ?? false;
  const channel = telemetry.channel ?? 104;
  const channelName = telemetry.channelName ?? 'CyberNews 4K';
  const playbackState = telemetry.mediaPlaybackState ?? 'playing';
  const brand = telemetry.brand || 'LG webOS';

  const [activeButton, setActiveButton] = useState<string | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<'LG webOS' | 'Samsung Tizen'>(
    brand.includes('Samsung') ? 'Samsung Tizen' : 'LG webOS'
  );

  const triggerVisualFeedback = (keyName: string) => {
    setActiveButton(keyName);
    setTimeout(() => setActiveButton(null), 250);
  };

  const sendKey = (key: SmartTvRemoteKey) => {
    triggerVisualFeedback(key);
    soundFx.playClick(key === 'ENTER' ? 680 : key === 'POWER' ? 840 : 540);
    onSendCommand({
      deviceId: device.id,
      action: 'key_press',
      key
    });
  };

  const setVolumeDirect = (val: number) => {
    soundFx.playClick(500 + val * 4);
    onSendCommand({
      deviceId: device.id,
      action: 'set_volume',
      volume: val
    });
  };

  const launchApp = (appKey: 'youtube' | 'netflix' | 'prime' | 'spotify' | 'plex') => {
    triggerVisualFeedback(`app-${appKey}`);
    soundFx.playClick(750);
    onSendCommand({
      deviceId: device.id,
      action: 'launch_app',
      appId: appKey
    });
  };

  // Connection state status formatting
  const connectionState = device.connectionState || 'connected';
  const isConnected = connectionState === 'connected' && isPowerOn;
  const isPairing = connectionState === 'pairing';

  return (
    <div
      id={`device-card-${device.id}`}
      data-device-id={device.id}
      className="glass-card rounded-2xl p-5 md:p-6 col-span-1 md:col-span-1 lg:col-span-1 relative overflow-hidden flex flex-col justify-between transition-all duration-300"
    >
      {/* Background cyber ambient glow */}
      <div className="absolute -bottom-16 -right-16 w-52 h-52 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -top-12 -left-12 w-40 h-40 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />

      <div>
        {/* Header: Title, Brand Protocol, and Status Badges */}
        <div className="flex items-start justify-between gap-3 mb-3.5">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shadow-glow-amber">
              <Tv className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-sm text-slate-100 truncate max-w-[160px]" title={device.name}>
                  {device.name}
                </h3>
                {isAutoSorted && activityRank !== undefined && (
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full border ${
                      activityRank === 1
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-glow-amber animate-pulse font-bold'
                        : activityRank === 2
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-semibold'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                    title={`Auto-Sort Priority #${activityRank}: ${activityReason || 'Active TV'}`}
                  >
                    #{activityRank}
                  </span>
                )}
              </div>

              {/* Protocol brand & IP address */}
              <div className="flex items-center gap-1.5 mt-0.5 text-[11px] font-mono text-slate-400">
                <button
                  onClick={() => {
                    const next = selectedBrand === 'LG webOS' ? 'Samsung Tizen' : 'LG webOS';
                    setSelectedBrand(next);
                    soundFx.playClick(620);
                  }}
                  title="Click to toggle control protocol format (LG webOS / Samsung Tizen)"
                  className="hover:text-amber-300 transition-colors underline decoration-dotted decoration-amber-500/50"
                >
                  {selectedBrand}
                </button>
                <span>•</span>
                <span>{telemetry.ipAddress}</span>
              </div>
            </div>
          </div>

          {/* Power Button */}
          <button
            onClick={() => sendKey('POWER')}
            title={isPowerOn ? 'Put TV in Standby' : 'Power On TV'}
            className={`p-2.5 rounded-xl border transition-all ${
              isPowerOn
                ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40 hover:bg-rose-950/40 hover:text-rose-300 hover:border-rose-500/40 shadow-glow-emerald active:scale-95'
                : 'bg-slate-800 text-slate-500 border-slate-700 hover:text-emerald-300 hover:border-emerald-500/40 active:scale-95'
            }`}
          >
            <Power className="w-4 h-4" />
          </button>
        </div>

        {/* Status Badge & Screen Live Telemetry Pill */}
        <div className="glass-panel rounded-xl p-2.5 border border-slate-800 flex items-center justify-between mb-4 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isPairing
                  ? 'bg-amber-400 animate-ping'
                  : isConnected
                  ? 'bg-emerald-400 shadow-glow-emerald'
                  : 'bg-slate-600'
              }`}
            />
            <div>
              <span className="font-semibold text-slate-200 block leading-tight">
                {isPowerOn ? currentApp : 'Standby Mode'}
              </span>
              <span className="text-[10px] text-slate-400 block truncate max-w-[160px]">
                {isPowerOn && currentApp.toLowerCase().includes('tv')
                  ? `${channelName} (CH ${channel})`
                  : `Input: ${telemetry.activeInput}`}
              </span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1">
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase border ${
                isPairing
                  ? 'bg-amber-950/40 text-amber-300 border-amber-500/40'
                  : isConnected
                  ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              {isPairing ? 'Pairing...' : isConnected ? 'Connected' : 'Offline'}
            </span>

            {isPowerOn && (
              <span className="text-[10px] text-cyan-300 flex items-center gap-1 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                {playbackState.toUpperCase()}
              </span>
            )}
          </div>
        </div>

        {/* Dual Pillar: Volume & Channel Sliders / Steppers */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {/* Pillar 1: Dedicated Volume Slider / Stepper with Mute */}
          <div className="glass-panel rounded-xl p-3 border border-slate-800 bg-slate-900/40 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs mb-2 font-mono">
              <span className="text-slate-400 font-medium flex items-center gap-1 text-[11px]">
                {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-cyan-400" />}
                <span>VOL</span>
              </span>
              <span className={`text-[11px] font-bold ${isMuted ? 'text-rose-400' : 'text-cyan-300'}`}>
                {isMuted ? 'MUTED' : `${volume}%`}
              </span>
            </div>

            {/* Stepper Buttons (Up / Down) */}
            <div className="flex items-center gap-1.5 mb-2">
              <button
                onClick={() => sendKey('VOL_DOWN')}
                title="Volume Down (-1)"
                className="flex-1 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-95 border border-slate-700 text-slate-300 hover:text-cyan-300 flex items-center justify-center transition-all text-xs"
              >
                <ArrowDown className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => sendKey('VOL_UP')}
                title="Volume Up (+1)"
                className="flex-1 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-95 border border-slate-700 text-slate-300 hover:text-cyan-300 flex items-center justify-center transition-all text-xs"
              >
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Interactive Volume Range Slider */}
            <div className="mb-2">
              <input
                type="range"
                min="0"
                max="100"
                value={isMuted ? 0 : volume}
                onChange={(e) => setVolumeDirect(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>

            {/* Mute Toggle */}
            <button
              onClick={() => sendKey('MUTE')}
              className={`w-full py-1 rounded-lg border text-[10px] font-mono font-bold flex items-center justify-center gap-1 transition-all ${
                isMuted
                  ? 'bg-rose-950/60 text-rose-300 border-rose-500/60 shadow-glow-rose'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 border-slate-700'
              }`}
            >
              {isMuted ? <VolumeX className="w-3 h-3 text-rose-400" /> : <Volume1 className="w-3 h-3" />}
              <span>{isMuted ? 'UNMUTE' : 'MUTE'}</span>
            </button>
          </div>

          {/* Pillar 2: Channel Stepper & Input Selector */}
          <div className="glass-panel rounded-xl p-3 border border-slate-800 bg-slate-900/40 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs mb-2 font-mono">
              <span className="text-slate-400 font-medium flex items-center gap-1 text-[11px]">
                <Radio className="w-3.5 h-3.5 text-amber-400" />
                <span>CH</span>
              </span>
              <span className="text-[11px] font-bold text-amber-300">
                #{channel}
              </span>
            </div>

            {/* Channel Stepper Buttons (Up / Down) */}
            <div className="flex items-center gap-1.5 mb-2">
              <button
                onClick={() => sendKey('CH_DOWN')}
                title="Channel Down"
                className="flex-1 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-95 border border-slate-700 text-slate-300 hover:text-amber-300 flex items-center justify-center transition-all text-xs"
              >
                <ArrowDown className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => sendKey('CH_UP')}
                title="Channel Up"
                className="flex-1 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-95 border border-slate-700 text-slate-300 hover:text-amber-300 flex items-center justify-center transition-all text-xs"
              >
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Channel Name Banner */}
            <div className="p-1 rounded bg-slate-800/80 border border-slate-700/60 text-center mb-2">
              <span className="text-[10px] font-mono text-slate-300 truncate block">
                {channelName}
              </span>
            </div>

            {/* HDMI Inputs */}
            <div className="grid grid-cols-2 gap-1 text-[10px] font-mono">
              <button
                onClick={() => sendKey('INPUT_HDMI1')}
                className={`py-1 rounded border text-center transition-all truncate ${
                  telemetry.activeInput === 'HDMI 1 (eARC)'
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400 font-bold'
                    : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 border-slate-700'
                }`}
              >
                HDMI 1
              </button>
              <button
                onClick={() => sendKey('INPUT_HDMI2')}
                className={`py-1 rounded border text-center transition-all truncate ${
                  telemetry.activeInput === 'HDMI 2 (Console)'
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400 font-bold'
                    : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 border-slate-700'
                }`}
              >
                HDMI 2
              </button>
            </div>
          </div>
        </div>

        {/* Tactile Directional D-Pad Block with Glowing Neon Hover Highlights */}
        <div className="glass-panel rounded-2xl p-4 border border-slate-800 bg-slate-900/60 mb-4 flex flex-col items-center">
          <div className="relative w-36 h-36 rounded-full border-2 border-slate-700/80 bg-slate-950/90 shadow-2xl flex items-center justify-center group hover:border-cyan-500/50 hover:shadow-glow-cyan transition-all">
            {/* Ambient inner neon halo */}
            <div className="absolute inset-2 rounded-full border border-slate-800/80 pointer-events-none" />

            {/* D-Pad UP */}
            <button
              onClick={() => sendKey('UP')}
              title="Navigate Up"
              className={`absolute top-1.5 p-2 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/10 active:scale-95 transition-all ${
                activeButton === 'UP' ? 'text-cyan-300 bg-cyan-500/20 scale-95 shadow-glow-cyan' : ''
              }`}
            >
              <ChevronUp className="w-5 h-5" />
            </button>

            {/* D-Pad DOWN */}
            <button
              onClick={() => sendKey('DOWN')}
              title="Navigate Down"
              className={`absolute bottom-1.5 p-2 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/10 active:scale-95 transition-all ${
                activeButton === 'DOWN' ? 'text-cyan-300 bg-cyan-500/20 scale-95 shadow-glow-cyan' : ''
              }`}
            >
              <ChevronDown className="w-5 h-5" />
            </button>

            {/* D-Pad LEFT */}
            <button
              onClick={() => sendKey('LEFT')}
              title="Navigate Left"
              className={`absolute left-1.5 p-2 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/10 active:scale-95 transition-all ${
                activeButton === 'LEFT' ? 'text-cyan-300 bg-cyan-500/20 scale-95 shadow-glow-cyan' : ''
              }`}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            {/* D-Pad RIGHT */}
            <button
              onClick={() => sendKey('RIGHT')}
              title="Navigate Right"
              className={`absolute right-1.5 p-2 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/10 active:scale-95 transition-all ${
                activeButton === 'RIGHT' ? 'text-cyan-300 bg-cyan-500/20 scale-95 shadow-glow-cyan' : ''
              }`}
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            {/* Center Tactile ENTER / OK Button */}
            <button
              onClick={() => sendKey('ENTER')}
              title="Select / Enter"
              className={`w-12 h-12 rounded-full font-bold text-xs flex items-center justify-center border transition-all active:scale-90 ${
                activeButton === 'ENTER'
                  ? 'bg-cyan-400 text-slate-950 border-white shadow-glow-cyan scale-95'
                  : 'bg-gradient-to-br from-cyan-500/20 to-cyan-600/30 hover:from-cyan-500/40 hover:to-cyan-600/50 text-cyan-200 border-cyan-400/50 shadow-glow-cyan'
              }`}
            >
              OK
            </button>
          </div>

          {/* Navigation Companion Bar (Back, Home, Play/Pause, Stop) */}
          <div className="flex items-center justify-center gap-2 mt-3 w-full">
            <button
              onClick={() => sendKey('BACK')}
              title="Return / Back"
              className="flex-1 py-1.5 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 hover:text-cyan-300 border border-slate-700 text-xs font-mono flex items-center justify-center gap-1 transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
            <button
              onClick={() => sendKey('HOME')}
              title="Home Screen"
              className="flex-1 py-1.5 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 hover:text-cyan-300 border border-slate-700 text-xs font-mono flex items-center justify-center gap-1 transition-all"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Home</span>
            </button>
            <button
              onClick={() => sendKey('PLAY_PAUSE')}
              title="Toggle Play / Pause"
              className={`py-1.5 px-3 rounded-xl border text-xs font-mono flex items-center justify-center gap-1 transition-all active:scale-95 ${
                playbackState === 'playing'
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-glow-cyan'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
            >
              {playbackState === 'playing' ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            </button>
            <button
              onClick={() => sendKey('STOP')}
              title="Stop Playback"
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-400 hover:text-rose-300 border border-slate-700 transition-all"
            >
              <Square className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Quick App Launchers with Active App Highlight */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] text-slate-300 font-semibold font-mono flex items-center gap-1.5">
              <Film className="w-3.5 h-3.5 text-cyan-400" /> Quick App Launch
            </span>
            <span className="text-[10px] font-mono text-slate-500">
              Active: <strong className="text-amber-300">{currentApp}</strong>
            </span>
          </div>

          <div className="grid grid-cols-5 gap-1.5">
            {/* YouTube */}
            <button
              onClick={() => launchApp('youtube')}
              className={`py-2 px-1 rounded-xl border text-center transition-all active:scale-95 flex flex-col items-center justify-center gap-1 ${
                currentApp.toLowerCase().includes('youtube')
                  ? 'bg-red-950/70 border-red-500 text-white shadow-glow-red ring-2 ring-red-500/40'
                  : 'bg-slate-900/60 hover:bg-red-950/30 border-slate-800 text-red-400 hover:border-red-800/40'
              }`}
            >
              <Play className="w-4 h-4 fill-current" />
              <span className="text-[9px] font-bold">YouTube</span>
            </button>

            {/* Netflix */}
            <button
              onClick={() => launchApp('netflix')}
              className={`py-2 px-1 rounded-xl border text-center transition-all active:scale-95 flex flex-col items-center justify-center gap-1 ${
                currentApp.toLowerCase().includes('netflix')
                  ? 'bg-red-950/70 border-red-500 text-white shadow-glow-red ring-2 ring-red-500/40'
                  : 'bg-slate-900/60 hover:bg-red-950/30 border-slate-800 text-red-400 hover:border-red-800/40'
              }`}
            >
              <Film className="w-4 h-4" />
              <span className="text-[9px] font-bold">Netflix</span>
            </button>

            {/* Prime Video */}
            <button
              onClick={() => launchApp('prime')}
              className={`py-2 px-1 rounded-xl border text-center transition-all active:scale-95 flex flex-col items-center justify-center gap-1 ${
                currentApp.toLowerCase().includes('prime')
                  ? 'bg-sky-950/70 border-sky-400 text-sky-100 shadow-glow-cyan ring-2 ring-sky-400/40'
                  : 'bg-slate-900/60 hover:bg-sky-950/30 border-slate-800 text-sky-400 hover:border-sky-800/40'
              }`}
            >
              <Film className="w-4 h-4" />
              <span className="text-[9px] font-bold">Prime</span>
            </button>

            {/* Spotify */}
            <button
              onClick={() => launchApp('spotify')}
              className={`py-2 px-1 rounded-xl border text-center transition-all active:scale-95 flex flex-col items-center justify-center gap-1 ${
                currentApp.toLowerCase().includes('spotify')
                  ? 'bg-emerald-950/70 border-emerald-400 text-emerald-100 shadow-glow-emerald ring-2 ring-emerald-400/40'
                  : 'bg-slate-900/60 hover:bg-emerald-950/30 border-slate-800 text-emerald-400 hover:border-emerald-800/40'
              }`}
            >
              <Music className="w-4 h-4" />
              <span className="text-[9px] font-bold">Spotify</span>
            </button>

            {/* Plex */}
            <button
              onClick={() => launchApp('plex')}
              className={`py-2 px-1 rounded-xl border text-center transition-all active:scale-95 flex flex-col items-center justify-center gap-1 ${
                currentApp.toLowerCase().includes('plex')
                  ? 'bg-amber-950/70 border-amber-400 text-amber-100 shadow-glow-amber ring-2 ring-amber-400/40'
                  : 'bg-slate-900/60 hover:bg-amber-950/30 border-slate-800 text-amber-400 hover:border-amber-800/40'
              }`}
            >
              <Film className="w-4 h-4" />
              <span className="text-[9px] font-bold">Plex</span>
            </button>
          </div>
        </div>
      </div>

      {/* Footer Network & Protocol Details */}
      <div className="pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400 mt-4">
        <span className="flex items-center gap-1 text-slate-300">
          <Wifi className="w-3.5 h-3.5 text-amber-400" />
          <span>WebSocket {selectedBrand === 'Samsung Tizen' ? '8001' : '3000'}</span>
        </span>
        <span className="text-slate-500">
          {telemetry.macAddress || 'C8:02:8D:4F:91:EE'}
        </span>
      </div>
    </div>
  );
};
