import React, { useState, useEffect } from 'react';
import {
  X,
  Zap,
  Volume2,
  VolumeX,
  Lock,
  Unlock,
  Moon,
  Sun,
  MonitorOff,
  Cpu,
  Trash2,
  Camera,
  RotateCw,
  CheckCircle2,
  AlertCircle,
  Sliders,
  Sparkles,
  Shield,
  Layers,
  Clock,
  Terminal,
  ChevronRight,
  Gauge
} from 'lucide-react';
import { daemonAdapter, ActionExecutionResult } from '../adapters/DaemonAdapter.js';
import { soundFx } from '../services/audioFeedback.js';

interface QuickActionsSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onExecuteAction: (action: string, params?: Record<string, string | number | boolean>) => void;
  daemonOnline?: boolean;
  latencyMs?: number;
}

export const QuickActionsSidebar: React.FC<QuickActionsSidebarProps> = ({
  isOpen,
  onClose,
  onExecuteAction,
  daemonOnline = false,
  latencyMs = 1
}) => {
  const [controlState, setControlState] = useState(daemonAdapter.getSystemControlState());
  const [actionHistory, setActionHistory] = useState<ActionExecutionResult[]>(
    daemonAdapter.getRecentActionResults()
  );
  const [volumeLevel, setVolumeLevel] = useState<number>(64);
  const [lastTriggeredAction, setLastTriggeredAction] = useState<string | null>(null);

  // Subscribe to action results
  useEffect(() => {
    const unsubscribe = daemonAdapter.subscribeActions((result) => {
      setActionHistory((prev) => [result, ...prev.slice(0, 24)]);
      setControlState(daemonAdapter.getSystemControlState());
    });
    return unsubscribe;
  }, []);

  // Keyboard shortcut: Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const triggerAction = (action: string, params?: Record<string, string | number | boolean>) => {
    soundFx.playClick(620);
    setLastTriggeredAction(action);
    setTimeout(() => setLastTriggeredAction(null), 600);
    onExecuteAction(action, params);
  };

  const handleVolumePreset = (val: number) => {
    soundFx.playClick(500 + val * 4);
    setVolumeLevel(val);
    triggerAction('set_volume', { volume: val });
  };

  return (
    <>
      {/* Backdrop overlay */}
      {isOpen && (
        <div
          onClick={() => {
            soundFx.playClick(450);
            onClose();
          }}
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm transition-opacity duration-300 animate-in fade-in"
        />
      )}

      {/* Slide-over panel */}
      <div
        className={`fixed top-0 right-0 bottom-0 z-50 w-full sm:w-[420px] md:w-[460px] bg-slate-900/95 border-l border-slate-700/80 shadow-2xl flex flex-col backdrop-blur-xl transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="p-4 md:p-5 border-b border-slate-800 flex items-center justify-between gap-3 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shadow-glow-amber">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Quick Actions
                </h2>
                <span
                  className={`text-[10px] font-mono px-2 py-0.2 rounded-full border ${
                    daemonOnline
                      ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40 shadow-glow-emerald'
                      : 'bg-cyan-950/40 text-cyan-300 border-cyan-500/40'
                  }`}
                >
                  {daemonOnline ? 'Daemon Live' : 'Emulated Fallback'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                Local WebSocket Protocol • ws://localhost:8080 ({latencyMs}ms)
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              soundFx.playClick(450);
              onClose();
            }}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-100 transition-colors border border-slate-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-4">
          {/* Group 1: Workstation Security & Audio */}
          <div>
            <span className="text-[11px] font-mono font-semibold text-slate-400 uppercase tracking-wider block mb-2.5">
              Workstation & Security
            </span>

            <div className="grid grid-cols-2 gap-2.5">
              {/* Mute System Audio */}
              <button
                onClick={() => triggerAction('mute_system_audio')}
                className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all active:scale-95 group ${
                  controlState.isSystemAudioMuted
                    ? 'bg-rose-950/40 border-rose-500/50 shadow-glow-rose'
                    : 'glass-panel border-slate-800 hover:border-cyan-500/40 bg-slate-900/50'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div
                    className={`p-2 rounded-lg border ${
                      controlState.isSystemAudioMuted
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                        : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                    }`}
                  >
                    {controlState.isSystemAudioMuted ? (
                      <VolumeX className="w-4 h-4" />
                    ) : (
                      <Volume2 className="w-4 h-4" />
                    )}
                  </div>
                  <span
                    className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded border ${
                      controlState.isSystemAudioMuted
                        ? 'bg-rose-950/60 text-rose-300 border-rose-500/40'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    {controlState.isSystemAudioMuted ? 'MUTED' : 'ACTIVE'}
                  </span>
                </div>

                <div>
                  <span className="font-semibold text-xs text-slate-100 block">
                    {controlState.isSystemAudioMuted ? 'Unmute Audio' : 'Mute System Audio'}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Toggle master audio volume
                  </span>
                </div>
              </button>

              {/* Lock Workstation */}
              <button
                onClick={() => triggerAction('lock_workstation')}
                className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all active:scale-95 group ${
                  controlState.isWorkstationLocked
                    ? 'bg-amber-950/40 border-amber-500/50 shadow-glow-amber'
                    : 'glass-panel border-slate-800 hover:border-amber-500/40 bg-slate-900/50'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div
                    className={`p-2 rounded-lg border ${
                      controlState.isWorkstationLocked
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    {controlState.isWorkstationLocked ? (
                      <Lock className="w-4 h-4" />
                    ) : (
                      <Unlock className="w-4 h-4" />
                    )}
                  </div>
                  <span
                    className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded border ${
                      controlState.isWorkstationLocked
                        ? 'bg-amber-950/60 text-amber-300 border-amber-500/40'
                        : 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40'
                    }`}
                  >
                    {controlState.isWorkstationLocked ? 'LOCKED' : 'ONLINE'}
                  </span>
                </div>

                <div>
                  <span className="font-semibold text-xs text-slate-100 block">
                    {controlState.isWorkstationLocked ? 'Unlock Workstation' : 'Lock Workstation'}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Secures desktop session
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* Group 2: Display & Power Management */}
          <div>
            <span className="text-[11px] font-mono font-semibold text-slate-400 uppercase tracking-wider block mb-2.5">
              Display & Power
            </span>

            <div className="grid grid-cols-2 gap-2.5">
              {/* Set Screensaver */}
              <button
                onClick={() => triggerAction('set_screensaver')}
                className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all active:scale-95 group ${
                  controlState.isScreensaverActive
                    ? 'bg-indigo-950/40 border-indigo-500/50 shadow-glow-cyan'
                    : 'glass-panel border-slate-800 hover:border-indigo-500/40 bg-slate-900/50'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div
                    className={`p-2 rounded-lg border ${
                      controlState.isScreensaverActive
                        ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    <Moon className="w-4 h-4" />
                  </div>
                  <span
                    className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded border ${
                      controlState.isScreensaverActive
                        ? 'bg-indigo-950/60 text-indigo-300 border-indigo-500/40'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    {controlState.isScreensaverActive ? 'ON' : 'OFF'}
                  </span>
                </div>

                <div>
                  <span className="font-semibold text-xs text-slate-100 block">
                    {controlState.isScreensaverActive ? 'Stop Screensaver' : 'Set Screensaver'}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Ambient screen saver
                  </span>
                </div>
              </button>

              {/* Sleep Displays */}
              <button
                onClick={() => triggerAction('sleep_displays')}
                className="glass-panel rounded-xl p-3.5 border border-slate-800 hover:border-cyan-500/40 bg-slate-900/50 text-left flex flex-col justify-between transition-all active:scale-95 group"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 group-hover:text-cyan-300 group-hover:border-cyan-500/40 transition-colors">
                    <MonitorOff className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 px-1.5 py-0.2 rounded border border-slate-800">
                    DPMS
                  </span>
                </div>

                <div>
                  <span className="font-semibold text-xs text-slate-100 block">
                    Sleep Displays
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Power down monitors
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* Quick Volume Slider Presets */}
          <div className="glass-panel rounded-xl p-3.5 border border-slate-800 bg-slate-900/40">
            <div className="flex items-center justify-between text-xs font-mono mb-2">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                <span>Audio Master Volume</span>
              </span>
              <span className="font-bold text-cyan-300">{volumeLevel}%</span>
            </div>

            <div className="flex items-center gap-1.5">
              {[0, 25, 50, 75, 100].map((preset) => (
                <button
                  key={preset}
                  onClick={() => handleVolumePreset(preset)}
                  className={`flex-1 py-1 rounded-lg text-[10px] font-mono font-semibold border transition-all ${
                    volumeLevel === preset
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400 font-bold shadow-glow-cyan'
                      : 'bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border-slate-700'
                  }`}
                >
                  {preset}%
                </button>
              ))}
            </div>
          </div>

          {/* Group 3: Hardware & Performance Optimization */}
          <div>
            <span className="text-[11px] font-mono font-semibold text-slate-400 uppercase tracking-wider block mb-2.5">
              Performance & System Utilities
            </span>

            {/* Performance Governor Mode Switcher */}
            <div className="glass-panel rounded-xl p-3.5 border border-slate-800 bg-slate-900/40 mb-2.5">
              <div className="flex items-center justify-between text-xs font-mono mb-2">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Gauge className="w-3.5 h-3.5 text-amber-400" />
                  <span>CPU Power Governor</span>
                </span>
                <span className="text-[10px] font-bold text-amber-300 uppercase">
                  {controlState.powerGovernor}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                {(['powersave', 'balanced', 'performance'] as const).map((gov) => (
                  <button
                    key={gov}
                    onClick={() => triggerAction('toggle_performance_mode', { governor: gov })}
                    className={`py-1.5 px-2 rounded-lg text-[10px] font-mono border transition-all truncate text-center ${
                      controlState.powerGovernor === gov
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 font-bold shadow-glow-amber'
                        : 'bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border-slate-700'
                    }`}
                  >
                    {gov === 'performance' ? '⚡ Turbo' : gov === 'balanced' ? '⚖️ Balanced' : '🍃 Eco'}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {/* Flush RAM Cache */}
              <button
                onClick={() => triggerAction('flush_memory')}
                className="glass-panel rounded-xl p-3 border border-slate-800 hover:border-emerald-500/40 bg-slate-900/50 text-left transition-all active:scale-95 group"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="p-1.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 group-hover:scale-105 transition-transform">
                    <Trash2 className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-semibold text-slate-200 block">
                    Flush RAM
                  </span>
                </div>
                <span className="text-[10px] font-mono text-slate-400 block">
                  Frees cached system buffers
                </span>
              </button>

              {/* Take Screenshot */}
              <button
                onClick={() => triggerAction('take_screenshot')}
                className="glass-panel rounded-xl p-3 border border-slate-800 hover:border-cyan-500/40 bg-slate-900/50 text-left transition-all active:scale-95 group"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="p-1.5 rounded-lg bg-cyan-950/40 border border-cyan-500/30 text-cyan-400 group-hover:scale-105 transition-transform">
                    <Camera className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-semibold text-slate-200 block">
                    Screenshot
                  </span>
                </div>
                <span className="text-[10px] font-mono text-slate-400 block">
                  Copy desktop frame
                </span>
              </button>
            </div>
          </div>

          {/* Group 4: Live Execution Log Stream */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                <span>Command Execution Stream</span>
              </span>
              <span className="text-[10px] font-mono text-slate-500">
                {actionHistory.length} events
              </span>
            </div>

            <div className="glass-panel rounded-xl p-2.5 border border-slate-800/80 bg-slate-950/70 max-h-48 overflow-y-auto space-y-1.5 font-mono text-xs">
              {actionHistory.length === 0 ? (
                <div className="text-center py-4 text-slate-500 text-[11px]">
                  No commands triggered yet. Click an action above to dispatch via WebSocket.
                </div>
              ) : (
                actionHistory.map((item) => (
                  <div
                    key={item.id}
                    className="p-1.5 rounded-lg bg-slate-900/60 border border-slate-800/80 flex items-start justify-between gap-2 text-[10px]"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                        <span className="font-bold text-cyan-300 truncate">
                          {item.action}
                        </span>
                      </div>
                      <span className="text-slate-400 block truncate mt-0.5">
                        {item.message}
                      </span>
                    </div>

                    <span className="text-slate-500 shrink-0">
                      {new Date(item.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Hardware RPC Daemon</span>
          </div>

          <button
            onClick={() => {
              soundFx.playClick(450);
              onClose();
            }}
            className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </>
  );
};
