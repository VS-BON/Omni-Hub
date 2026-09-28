import React, { useState } from 'react';
import {
  Activity,
  Terminal,
  Volume2,
  VolumeX,
  Wifi,
  Radio,
  Cpu,
  Headphones,
  Gamepad2,
  Tv,
  Share2,
  ExternalLink,
  Search,
  Command,
  Sparkles
} from 'lucide-react';
import { DeviceCategory } from '../types/index.js';
import { soundFx } from '../services/audioFeedback.js';
import { ThemeSelector } from './ThemeSelector.js';

interface HeaderProps {
  activeFilter: DeviceCategory | 'all';
  onFilterChange: (filter: DeviceCategory | 'all') => void;
  isLiveDaemon: boolean;
  daemonLatencyMs: number;
  onOpenDaemonModal: () => void;
  deviceCount: number;
  isSimulated: boolean;
  onToggleSimulated: (simulated: boolean) => void;
  onOpenSearch?: () => void;
  onOpenActivityModal?: () => void;
  activityEventCount?: number;
  onOpenQuickActions?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeFilter,
  onFilterChange,
  isLiveDaemon,
  daemonLatencyMs,
  onOpenDaemonModal,
  deviceCount,
  isSimulated,
  onToggleSimulated,
  onOpenSearch,
  onOpenActivityModal,
  activityEventCount,
  onOpenQuickActions
}) => {
  const [isMuted, setIsMuted] = useState(soundFx.getIsMuted());

  const handleToggleMute = () => {
    const muted = soundFx.toggleMute();
    setIsMuted(muted);
    if (!muted) soundFx.playClick();
  };

  const filterItems: Array<{ id: DeviceCategory | 'all'; label: string; icon: React.ReactNode }> = [
    { id: 'all', label: 'All Devices', icon: <Radio className="w-3.5 h-3.5" /> },
    { id: 'host_pc', label: 'Host Rig', icon: <Cpu className="w-3.5 h-3.5" /> },
    { id: 'bluetooth_peripheral', label: 'Audio / BT', icon: <Headphones className="w-3.5 h-3.5" /> },
    { id: 'gamepad_hid', label: 'WebHID Gamepad', icon: <Gamepad2 className="w-3.5 h-3.5" /> },
    { id: 'smart_tv', label: 'Smart TV', icon: <Tv className="w-3.5 h-3.5" /> },
    { id: 'p2p_peer', label: 'P2P WebRTC', icon: <Share2 className="w-3.5 h-3.5" /> },
  ];

  return (
    <header className="sticky top-0 z-30 mb-6 glass-panel border-b border-slate-800/80 px-4 lg:px-8 py-3.5 shadow-2xl backdrop-blur-xl">
      <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
        {/* Logo and Brand */}
        <div className="flex items-center gap-3 w-full lg:w-auto justify-between lg:justify-start">
          <div className="flex items-center gap-2.5">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 via-slate-800 to-violet-600/30 border border-cyan-500/40 shadow-glow-cyan">
              <Activity className="w-5 h-5 text-cyan-400 animate-pulse" />
              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-cyan-400 ring-4 ring-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white via-cyan-100 to-cyan-400 bg-clip-text text-transparent">
                  OmniHub
                </span>
                <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                  v1.0-RC
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-1.5 font-medium">
                Unified Hardware & Local Device Mesh
              </p>
            </div>
          </div>

          {/* Quick status pill and search on mobile */}
          <div className="flex lg:hidden items-center gap-2">
            {onOpenSearch && (
              <button
                onClick={onOpenSearch}
                title="Search Devices (Cmd/Ctrl + K)"
                className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-cyan-400 hover:text-cyan-300"
              >
                <Search className="w-4 h-4" />
              </button>
            )}
            {onOpenActivityModal && (
              <button
                onClick={onOpenActivityModal}
                title="Activity Log"
                className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-cyan-400 hover:text-cyan-300 relative"
              >
                <Activity className="w-4 h-4" />
                {typeof activityEventCount === 'number' && activityEventCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
                )}
              </button>
            )}
            {onOpenQuickActions && (
              <button
                onClick={onOpenQuickActions}
                title="Quick Actions (Cmd/Ctrl + J)"
                className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:text-amber-300 shadow-glow-amber"
              >
                <Sparkles className="w-4 h-4" />
              </button>
            )}
            <ThemeSelector variant="dropdown" />
            <button
              onClick={onOpenDaemonModal}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium border ${
                isLiveDaemon
                  ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40'
                  : 'bg-amber-950/40 text-amber-300 border-amber-500/40'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isLiveDaemon ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`} />
              {isLiveDaemon ? 'Daemon Live' : 'Simulated'}
            </button>
          </div>
        </div>

        {/* Filter categories tabs */}
        <div className="flex items-center gap-1 overflow-x-auto w-full lg:w-auto p-1 bg-slate-900/80 rounded-xl border border-slate-800/80 max-w-full">
          {filterItems.map((item) => {
            const active = activeFilter === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  soundFx.playClick(active ? 500 : 700);
                  onFilterChange(item.id);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-150 ${
                  active
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Actions & Daemon Connection Status */}
        <div className="hidden lg:flex items-center gap-3">
          {/* Quick Search Shortcut Button */}
          {onOpenSearch && (
            <button
              onClick={onOpenSearch}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-cyan-500/40 hover:bg-slate-800/80 transition-all text-xs font-mono group"
              title="Search devices & filter categories (Cmd/Ctrl + K)"
            >
              <Search className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
              <span className="text-slate-400 group-hover:text-slate-200">Search</span>
              <kbd className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] bg-slate-800 border border-slate-700 text-cyan-300 font-mono">
                <Command className="w-2.5 h-2.5" />K
              </kbd>
            </button>
          )}

          {/* Mesh Activity Log Button */}
          {onOpenActivityModal && (
            <button
              onClick={() => {
                soundFx.playClick(640);
                onOpenActivityModal();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-cyan-500/40 text-slate-300 hover:text-cyan-300 hover:bg-slate-800/80 transition-all text-xs font-mono group"
              title="Open Mesh Activity & Synchronization Log"
            >
              <Activity className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
              <span>Activity</span>
              {typeof activityEventCount === 'number' && activityEventCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold">
                  {activityEventCount}
                </span>
              )}
            </button>
          )}

          {/* Quick Actions Sidebar Button */}
          {onOpenQuickActions && (
            <button
              onClick={() => {
                soundFx.playClick(640);
                onOpenQuickActions();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 hover:border-amber-400 text-amber-300 hover:bg-amber-500/20 transition-all text-xs font-mono group shadow-glow-amber"
              title="Open Quick Actions Sidebar (Cmd/Ctrl + J)"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
              <span>Actions</span>
              <kbd className="hidden xl:inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] bg-slate-900 border border-amber-500/30 text-amber-300 font-mono">
                <Command className="w-2.5 h-2.5" />J
              </kbd>
            </button>
          )}

          {/* Theme Engine Selector */}
          <ThemeSelector variant="dropdown" />

          {/* Audio Feedback Toggle */}
          <button
            onClick={handleToggleMute}
            title={isMuted ? 'Unmute Sound FX' : 'Mute Sound FX'}
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-cyan-300 hover:border-slate-700 transition-colors"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-slate-500" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
          </button>

          {/* Simulation Toggle Switch */}
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 text-xs">
            <span className="text-slate-400">Mode:</span>
            <button
              onClick={() => onToggleSimulated(!isSimulated)}
              className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                isSimulated
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              }`}
            >
              {isSimulated ? 'Virtual/Simulated' : 'Live Daemon Socket'}
            </button>
          </div>

          {/* Local Daemon Status Pill */}
          <button
            onClick={onOpenDaemonModal}
            className={`group flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono font-medium border transition-all ${
              isLiveDaemon
                ? 'bg-emerald-950/30 hover:bg-emerald-950/50 text-emerald-300 border-emerald-500/40 shadow-glow-emerald'
                : 'bg-slate-900 hover:bg-slate-850 text-slate-300 border-slate-700'
            }`}
          >
            <div className="relative flex items-center justify-center">
              <span className={`w-2 h-2 rounded-full ${isLiveDaemon ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            </div>
            <span>
              {isLiveDaemon ? `Daemon ws://9123 (${daemonLatencyMs}ms)` : 'Daemon Offline'}
            </span>
            <Terminal className="w-3.5 h-3.5 text-slate-400 group-hover:text-cyan-300 transition-colors" />
          </button>
        </div>
      </div>
    </header>
  );
};
