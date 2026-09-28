import React, { useState } from 'react';
import {
  Terminal,
  X,
  Copy,
  Check,
  ExternalLink,
  Wifi,
  Server,
  PlayCircle,
  HelpCircle,
  Cpu
} from 'lucide-react';
import { soundFx } from '../services/audioFeedback.js';

interface DaemonInstructionModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentWsUrl: string;
  onUpdateWsUrl: (newUrl: string) => void;
  isLiveDaemon: boolean;
  isSimulated: boolean;
  onToggleSimulated: (sim: boolean) => void;
}

export const DaemonInstructionModal: React.FC<DaemonInstructionModalProps> = ({
  isOpen,
  onClose,
  currentWsUrl,
  onUpdateWsUrl,
  isLiveDaemon,
  isSimulated,
  onToggleSimulated
}) => {
  const [urlInput, setUrlInput] = useState(currentWsUrl);
  const [copiedCmd, setCopiedCmd] = useState(false);

  if (!isOpen) return null;

  const quickCommand = 'cd daemon && npm install && npm run dev';

  const handleCopyCommand = () => {
    soundFx.playClick(900);
    navigator.clipboard.writeText(quickCommand);
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
  };

  const handleSaveUrl = (e: React.FormEvent) => {
    e.preventDefault();
    soundFx.playClick(800);
    onUpdateWsUrl(urlInput.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-xl glass-card rounded-2xl p-6 border border-slate-700/80 shadow-2xl">
        {/* Close Button */}
        <button
          onClick={() => {
            soundFx.playClick(500);
            onClose();
          }}
          className="absolute top-5 right-5 p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shadow-glow-cyan">
            <Terminal className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-extrabold text-lg text-slate-100">
              OmniHub Hardware Daemon Setup
            </h2>
            <p className="text-xs text-slate-400">
              Zero-cloud background telemetry daemon streaming via local WebSocket
            </p>
          </div>
        </div>

        {/* Status banner */}
        <div className={`p-3.5 rounded-xl border mb-5 flex items-center justify-between ${
          isLiveDaemon
            ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
            : 'bg-amber-950/30 border-amber-500/40 text-amber-300'
        }`}>
          <div className="flex items-center gap-2.5">
            <span className={`w-2.5 h-2.5 rounded-full ${isLiveDaemon ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`} />
            <div>
              <span className="text-xs font-bold block">
                {isLiveDaemon ? 'Connected to Live Hardware Daemon' : 'Running in Simulated Telemetry Mode'}
              </span>
              <span className="text-[11px] opacity-80 block">
                {isLiveDaemon
                  ? 'Receiving genuine OS/CPU/GPU metrics from local machine.'
                  : 'Displaying realistic fluctuating metrics so you can test all features right away.'}
              </span>
            </div>
          </div>
          <button
            onClick={() => onToggleSimulated(!isSimulated)}
            className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-200"
          >
            {isSimulated ? 'Connect Live' : 'Use Simulation'}
          </button>
        </div>

        {/* Instructions */}
        <div className="space-y-4 mb-6">
          <div>
            <span className="text-xs font-bold text-slate-300 block mb-1.5">
              1. Start the Local Daemon on your PC / Server
            </span>
            <p className="text-xs text-slate-400 mb-2">
              Run this single command inside the project root terminal to launch the high-performance WebSocket daemon:
            </p>
            <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-slate-900 border border-slate-800 font-mono text-xs text-cyan-300">
              <code>{quickCommand}</code>
              <button
                onClick={handleCopyCommand}
                title="Copy Command"
                className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
              >
                {copiedCmd ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <span className="text-xs font-bold text-slate-300 block mb-1.5">
              2. Custom Daemon Endpoint URL
            </span>
            <form onSubmit={handleSaveUrl} className="flex gap-2">
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="ws://localhost:8080 or ws://192.168.1.50:8080"
                className="flex-1 glass-input rounded-xl px-3.5 py-2 text-xs font-mono text-slate-200"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-glow-cyan transition-all"
              >
                Save & Connect
              </button>
            </form>
          </div>
        </div>

        {/* Architecture Note */}
        <div className="p-3 rounded-xl glass-panel border border-slate-800 text-[11px] text-slate-400">
          <strong className="text-slate-200 block mb-0.5">Privacy & Zero-Cloud Guarantee:</strong>
          OmniHub communicates strictly over your local loopback (<code className="text-cyan-300 font-mono">127.0.0.1</code>) and private LAN. No hardware metrics, logs, or files are ever sent to remote cloud servers.
        </div>
      </div>
    </div>
  );
};
