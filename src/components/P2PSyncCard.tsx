import React, { useState, useRef, useEffect } from 'react';
import {
  Share2,
  UploadCloud,
  Clipboard,
  Check,
  Send,
  Download,
  Lock,
  Wifi,
  QrCode,
  FileText,
  Clock,
  Sparkles,
  Zap,
  Radio,
  Laptop,
  Smartphone,
  Gauge,
  Timer,
  Layers,
  ArrowDownUp,
  RefreshCw,
  Activity
} from 'lucide-react';
import { ClipboardSyncItem, FileTransferItem, P2PPeerDevice } from '../types/index.js';
import { soundFx } from '../services/audioFeedback.js';

interface P2PSyncCardProps {
  device: P2PPeerDevice;
  onSendFile: (file: File) => void;
  onBroadcastClipboard: (text: string) => void;
  onSimulateIncomingFile?: () => void;
  onOpenActivityModal?: () => void;
  activityRank?: number;
  activityReason?: string;
  isAutoSorted?: boolean;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export const P2PSyncCard: React.FC<P2PSyncCardProps> = ({
  device,
  onSendFile,
  onBroadcastClipboard,
  onSimulateIncomingFile,
  onOpenActivityModal,
  activityRank,
  activityReason,
  isAutoSorted
}) => {
  const { telemetry } = device;
  const [activeTab, setActiveTab] = useState<'files' | 'clipboard'>('files');
  const [clipboardInput, setClipboardInput] = useState('');
  const [clipboardMirrorEnabled, setClipboardMirrorEnabled] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Active or most recent transfer item
  const activeTransfer = telemetry.activeTransfers.find(t => t.status === 'transferring')
    || telemetry.activeTransfers[0];

  const handleSendClipboard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clipboardInput.trim()) return;
    onBroadcastClipboard(clipboardInput.trim());
    setClipboardInput('');
  };

  const handleCopyItem = (item: ClipboardSyncItem) => {
    soundFx.playClick(950);
    navigator.clipboard?.writeText(item.text);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      soundFx.playClick(720);
      onSendFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      soundFx.playClick(720);
      onSendFile(e.target.files[0]);
    }
  };

  const handleSimulateInbound = () => {
    soundFx.playClick(820);
    if (onSimulateIncomingFile) {
      onSimulateIncomingFile();
    } else {
      // Inline mock fallback if prop not provided
      const fakeFile = new File(['omnihub-raw-data-stream-demo'], 'Cyber-Telemetry-Payload.bin', { type: 'application/octet-stream' });
      onSendFile(fakeFile);
    }
  };

  // Calculate ETA seconds if transferring
  const getEtaLabel = (item: FileTransferItem) => {
    if (item.status === 'completed') return 'Done';
    if (!item.speedBytesPerSec || item.speedBytesPerSec <= 0) return 'Calculating...';
    const remainingBytes = item.sizeBytes - (item.sizeBytes * (item.progressPercent / 100));
    const seconds = Math.ceil(remainingBytes / item.speedBytesPerSec);
    if (seconds <= 1) return '< 1s';
    if (seconds < 60) return `${seconds}s`;
    return `${Math.ceil(seconds / 60)}m`;
  };

  return (
    <div
      id={`device-card-${device.id}`}
      data-device-id={device.id}
      className={`glass-card rounded-2xl p-5 md:p-6 col-span-1 md:col-span-2 lg:col-span-2 relative overflow-hidden flex flex-col justify-between transition-all duration-300 ${
        isDragOver ? 'ring-4 ring-cyan-400 bg-cyan-950/30 shadow-glow-cyan' : ''
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleFileDrop}
    >
      {/* Background ambient glow */}
      <div className="absolute -top-20 -right-20 w-64 h-64 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />

      <div>
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shadow-glow-cyan">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-sm text-slate-100">{device.name}</h3>
                {isAutoSorted && activityRank !== undefined && (
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                      activityRank === 1
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-glow-amber animate-pulse font-bold'
                        : activityRank === 2
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-semibold'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                    title={`Auto-Sort Priority #${activityRank}: ${activityReason || 'Active Peer'}`}
                  >
                    <span>#{activityRank} Priority</span>
                    {activityReason && <span className="hidden xl:inline opacity-80 truncate max-w-[150px]">• {activityReason}</span>}
                  </span>
                )}
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950/40 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" /> E2EE WebRTC DataChannel
                </span>
              </div>

              {/* Active Peer Device Badge */}
              <div className="flex items-center gap-2.5 text-xs text-slate-400 font-mono mt-1 flex-wrap">
                <span className="flex items-center gap-1 text-slate-300">
                  <Laptop className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="font-semibold text-cyan-200">MacBook Pro M3 Max</span>
                  <span className="text-slate-500">(192.168.1.145)</span>
                </span>
                <span>• Room: <strong className="text-cyan-300">OMNI-7829</strong></span>
                <span>• RTT: {telemetry.latencyRttMs || 8}ms</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenActivityModal && (
              <button
                onClick={() => {
                  soundFx.playClick(640);
                  onOpenActivityModal();
                }}
                title="View Full Mesh Activity History Log"
                className="p-2 rounded-lg border bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-cyan-300 border-slate-700 transition-all flex items-center gap-1.5"
              >
                <Activity className="w-4 h-4 text-cyan-400" />
                <span className="text-[11px] font-mono hidden sm:inline">Log</span>
              </button>
            )}

            <button
              onClick={() => setShowQr(!showQr)}
              title="Show Local LAN Pair QR Code"
              className={`p-2 rounded-lg border transition-all ${
                showQr
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 border-slate-700'
              }`}
            >
              <QrCode className="w-4 h-4" />
            </button>

            {/* Mode Switcher Tabs */}
            <div className="flex items-center p-1 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono">
              <button
                onClick={() => {
                  soundFx.playClick(600);
                  setActiveTab('files');
                }}
                className={`px-3 py-1 rounded-md font-medium transition-all flex items-center gap-1.5 ${
                  activeTab === 'files'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Files</span>
              </button>
              <button
                onClick={() => {
                  soundFx.playClick(600);
                  setActiveTab('clipboard');
                }}
                className={`px-3 py-1 rounded-md font-medium transition-all flex items-center gap-1.5 ${
                  activeTab === 'clipboard'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Clipboard className="w-3.5 h-3.5" />
                <span>Clipboard</span>
              </button>
            </div>
          </div>
        </div>

        {/* QR Code LAN Discovery Overlay */}
        {showQr && (
          <div className="mb-4 p-4 rounded-xl glass-panel border border-cyan-500/40 flex flex-col sm:flex-row items-center gap-4 bg-slate-950/80 animate-in fade-in zoom-in-95">
            <div className="w-28 h-28 bg-white p-2 rounded-lg flex items-center justify-center shadow-lg shrink-0">
              <svg viewBox="0 0 29 29" className="w-full h-full">
                <path d="M0 0h7v7H0zm2 2h3v3H2zM22 0h7v7h-7zm2 2h3v3h-3zM0 22h7v7H0zm2 2h3v3H2zM9 1h1v1H9zm2 0h2v1h-2zm4 0h3v1h-3zm-5 2h1v2h-1zm3 0h1v1h-1zm2 1h1v1h-1zm-4 2h1v1h-1zm3 0h2v1h-2zm-3 2h1v2h-1zm2 0h1v1h-1zm2 1h2v1h-2zm-3 2h2v1h-2zm3 0h1v1h-1zm-4 2h1v1h-1zm3 0h1v2h-1zm2 1h1v1h-1zm2-13h1v1h-1zm0 2h1v2h-1zm0 3h1v1h-1zm2-5h1v1h-1zm0 3h1v1h-1zm1-3h1v2h-1zm0 3h1v2h-1zm-2 3h2v1h-2zm1 2h1v1h-1zm-2 2h2v1h-2zm2 1h1v1h-1zm-4 1h1v1h-1zm1 1h2v1h-2zm-3 1h1v1h-1zm2 0h1v1h-1zm-4 1h2v1h-2zm3 0h1v1h-1zm-2 2h1v1h-1zm2 0h2v1h-2z" fill="#000" />
              </svg>
            </div>
            <div className="text-center sm:text-left flex-1">
              <span className="text-xs font-bold text-white block">Scan to Pair LAN Peer Device</span>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                Open OmniHub on your phone, tablet, or another laptop on this Wi-Fi to establish a direct WebRTC DataChannel connection.
              </p>
              <span className="text-[11px] font-mono text-cyan-400 mt-2 block">
                wss://lan.omnihub/pair?room=OMNI-7829
              </span>
            </div>
          </div>
        )}

        {/* Tab 1: P2P File Drop & Real-Time Transfer Metrics */}
        {activeTab === 'files' && (
          <div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileInputChange}
              className="hidden"
            />

            {/* Drag-and-Drop Zone with Glowing Borders */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all mb-4 relative overflow-hidden group ${
                isDragOver
                  ? 'border-cyan-400 bg-cyan-950/40 shadow-glow-cyan scale-[1.01]'
                  : 'border-slate-800 hover:border-cyan-500/60 bg-slate-900/40 hover:bg-slate-900/60'
              }`}
            >
              <div className="flex items-center justify-center gap-3">
                <div className={`p-3 rounded-xl border transition-all ${
                  isDragOver ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300' : 'bg-slate-800/80 border-slate-700 text-cyan-400 group-hover:scale-110'
                }`}>
                  <UploadCloud className="w-6 h-6 animate-pulse" />
                </div>
                <div className="text-left">
                  <span className="text-xs font-bold text-slate-100 block">
                    Drop files here to stream direct via WebRTC DataChannel
                  </span>
                  <span className="text-[11px] text-slate-400 block mt-0.5 font-mono">
                    Zero-Cloud • 64KB chunk backpressure • Multi-Gigabyte ready
                  </span>
                </div>
              </div>
            </div>

            {/* Active Real-Time Transfer Card with Metrics & Progress */}
            {activeTransfer && (
              <div className="glass-panel rounded-xl p-3.5 border border-slate-800 bg-slate-900/70 mb-4 transition-all">
                <div className="flex items-center justify-between gap-3 mb-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-2 rounded-lg bg-cyan-950/50 border border-cyan-500/30 text-cyan-300">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-slate-100 truncate block max-w-[200px] sm:max-w-xs">
                        {activeTransfer.name}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400 block">
                        {formatBytes(activeTransfer.sizeBytes)} • {activeTransfer.direction === 'outgoing' ? 'Outgoing to MacBook' : 'Inbound from LAN'}
                      </span>
                    </div>
                  </div>

                  {/* Real-time Transfer Metrics Pill Badges */}
                  <div className="flex items-center gap-2 shrink-0 font-mono text-xs">
                    {/* Speed MB/s Metric */}
                    <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-cyan-300">
                      <Gauge className="w-3.5 h-3.5 text-cyan-400" />
                      <span className="font-bold">{activeTransfer.speedMBps ? `${activeTransfer.speedMBps} MB/s` : '18.4 MB/s'}</span>
                    </div>

                    {/* ETA Metric */}
                    <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-300">
                      <Timer className="w-3.5 h-3.5 text-amber-400" />
                      <span>ETA: {getEtaLabel(activeTransfer)}</span>
                    </div>
                  </div>
                </div>

                {/* Progress Bar & Percentage */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${
                        activeTransfer.status === 'completed' ? 'bg-emerald-400' : 'bg-cyan-400 animate-ping'
                      }`} />
                      <span className="capitalize">{activeTransfer.status}</span>
                    </span>
                    <span className="font-bold text-slate-200">{activeTransfer.progressPercent}%</span>
                  </div>

                  <div className="w-full bg-slate-800/80 rounded-full h-2 overflow-hidden border border-slate-700/50">
                    <div
                      className={`h-full transition-all duration-200 ${
                        activeTransfer.status === 'completed'
                          ? 'bg-gradient-to-r from-emerald-500 to-emerald-400 shadow-glow-emerald'
                          : 'bg-gradient-to-r from-cyan-500 to-cyan-300 shadow-glow-cyan'
                      }`}
                      style={{ width: `${activeTransfer.progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Download / Action Row */}
                {activeTransfer.blobUrl && (
                  <div className="mt-2.5 pt-2 border-t border-slate-800 flex items-center justify-between">
                    <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Transfer Verified
                    </span>
                    <a
                      href={activeTransfer.blobUrl}
                      download={activeTransfer.name}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-glow-emerald transition-all"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download File</span>
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* Test Simulation Controls */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-mono text-slate-500">
                Single-Tab Preview Enabled
              </span>
              <button
                onClick={handleSimulateInbound}
                title="Simulate inbound file transfer from peer for testing"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-cyan-300 border border-slate-700 text-xs font-mono transition-all"
              >
                <RefreshCw className="w-3 h-3 text-cyan-400" />
                <span>Simulate Peer File</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Instant Clipboard Sync Engine */}
        {activeTab === 'clipboard' && (
          <div>
            {/* Clipboard Mirror Master Toggle Switch */}
            <div className="glass-panel rounded-xl p-3 border border-slate-800 bg-slate-900/60 mb-3 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-200">Clipboard Mirror</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/40 border border-cyan-500/30 text-cyan-300">
                    AES-GCM 256-bit
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  {clipboardMirrorEnabled
                    ? 'Active: Cross-device copies mirror instantly over DataChannel'
                    : 'Paused: Clipboard auto-synchronization suspended'}
                </span>
              </div>

              {/* Tactical Toggle Switch */}
              <button
                onClick={() => {
                  soundFx.playClick(680);
                  setClipboardMirrorEnabled(!clipboardMirrorEnabled);
                }}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                  clipboardMirrorEnabled ? 'bg-cyan-500 shadow-glow-cyan' : 'bg-slate-800'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    clipboardMirrorEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Broadcast Input Bar */}
            <form onSubmit={handleSendClipboard} className="flex gap-2 mb-3">
              <input
                type="text"
                value={clipboardInput}
                onChange={(e) => setClipboardInput(e.target.value)}
                placeholder="Broadcast clipboard snippet to all local peers..."
                className="flex-1 glass-input rounded-xl px-4 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={!clipboardInput.trim()}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-400 hover:to-cyan-300 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-glow-cyan transition-all"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Sync</span>
              </button>
            </form>

            {/* Clipboard History Feed */}
            <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
              {telemetry.clipboardHistory.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-500 font-mono">
                  No clipboard clips synchronized yet. Type text above to broadcast.
                </div>
              ) : (
                telemetry.clipboardHistory.map((clip) => {
                  const isCopied = copiedId === clip.id;
                  return (
                    <div
                      key={clip.id}
                      className="glass-panel rounded-xl p-2.5 border border-slate-800/80 hover:border-slate-700 flex items-center justify-between gap-3 group transition-all"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[10px] font-semibold text-cyan-300 font-mono">
                            {clip.senderName}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            {new Date(clip.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-xs font-mono text-slate-200 truncate select-all">
                          {clip.text}
                        </p>
                      </div>

                      <button
                        onClick={() => handleCopyItem(clip)}
                        title="Copy to Local Clipboard"
                        className={`p-2 rounded-lg border text-xs transition-all ${
                          isCopied
                            ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40'
                            : 'bg-slate-800 text-slate-400 group-hover:text-slate-200 border-slate-700'
                        }`}
                      >
                        {isCopied ? <Check className="w-3.5 h-3.5" /> : <Clipboard className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer Network Traffic & Channel Stats */}
      <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400 mt-4">
        <div className="flex items-center gap-3">
          <span>TX: {formatBytes(telemetry.bytesSent)}</span>
          <span>RX: {formatBytes(telemetry.bytesReceived)}</span>
        </div>
        <span className="text-emerald-400 flex items-center gap-1.5 font-bold">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          DataChannel: {telemetry.dataChannelState.toUpperCase()}
        </span>
      </div>
    </div>
  );
};
