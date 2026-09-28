import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Activity,
  UploadCloud,
  Download,
  Clipboard,
  Check,
  Search,
  Lock,
  Clock,
  FileText,
  FileCode,
  HardDrive,
  Filter,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  RefreshCw,
  ExternalLink,
  Laptop,
  Smartphone,
  Share2,
  Layers,
  ArrowDownUp,
  FileSpreadsheet
} from 'lucide-react';
import { ClipboardSyncItem, FileTransferItem, P2PPeerDevice } from '../types/index.js';
import { soundFx } from '../services/audioFeedback.js';

interface ActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  p2pDevice?: P2PPeerDevice;
  onSimulateFile?: () => void;
  onSimulateClipboard?: (text: string) => void;
}

type ActivityTab = 'all' | 'files' | 'clipboard';
type StatusFilter = 'all' | 'completed' | 'transferring' | 'failed';

interface UnifiedActivityEvent {
  id: string;
  type: 'file' | 'clipboard';
  timestamp: number;
  title: string;
  fileItem?: FileTransferItem;
  clipboardItem?: ClipboardSyncItem;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatExactTime(timestamp: number): string {
  const d = new Date(timestamp);
  return d.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

function formatRelativeTime(timestamp: number): string {
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 10) return 'Just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  return `${Math.floor(diffHrs / 24)}d ago`;
}

export const ActivityModal: React.FC<ActivityModalProps> = ({
  isOpen,
  onClose,
  p2pDevice,
  onSimulateFile,
  onSimulateClipboard
}) => {
  const [activeTab, setActiveTab] = useState<ActivityTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const telemetry = p2pDevice?.telemetry;
  const activeTransfers = telemetry?.activeTransfers || [];
  const clipboardHistory = telemetry?.clipboardHistory || [];

  // Combine both sources into a sorted unified timeline
  const unifiedEvents: UnifiedActivityEvent[] = useMemo(() => {
    const events: UnifiedActivityEvent[] = [];

    activeTransfers.forEach((file) => {
      events.push({
        id: file.id,
        type: 'file',
        timestamp: file.timestamp,
        title: file.name,
        fileItem: file
      });
    });

    clipboardHistory.forEach((clip) => {
      events.push({
        id: clip.id,
        type: 'clipboard',
        timestamp: clip.timestamp,
        title: clip.text,
        clipboardItem: clip
      });
    });

    return events.sort((a, b) => b.timestamp - a.timestamp);
  }, [activeTransfers, clipboardHistory]);

  // Filter events based on active tab, status, and search query
  const filteredEvents = useMemo(() => {
    return unifiedEvents.filter((event) => {
      // Tab filter
      if (activeTab === 'files' && event.type !== 'file') return false;
      if (activeTab === 'clipboard' && event.type !== 'clipboard') return false;

      // Status filter
      if (statusFilter !== 'all') {
        if (event.type === 'file' && event.fileItem?.status !== statusFilter) {
          return false;
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        if (event.type === 'file' && event.fileItem) {
          const nameMatch = event.fileItem.name.toLowerCase().includes(query);
          const mimeMatch = event.fileItem.mimeType.toLowerCase().includes(query);
          if (!nameMatch && !mimeMatch) return false;
        } else if (event.type === 'clipboard' && event.clipboardItem) {
          const textMatch = event.clipboardItem.text.toLowerCase().includes(query);
          const senderMatch = event.clipboardItem.senderName.toLowerCase().includes(query);
          if (!textMatch && !senderMatch) return false;
        }
      }

      return true;
    });
  }, [unifiedEvents, activeTab, statusFilter, searchQuery]);

  // Summary Metrics
  const totalVolumeBytes = (telemetry?.bytesSent || 0) + (telemetry?.bytesReceived || 0);
  const completedTransfers = activeTransfers.filter((t) => t.status === 'completed').length;

  const handleCopyClipboardText = (clip: ClipboardSyncItem) => {
    soundFx.playClick(920);
    navigator.clipboard?.writeText(clip.text);
    setCopiedId(clip.id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleExportJson = () => {
    soundFx.playClick(680);
    const data = {
      exportTimestamp: new Date().toISOString(),
      roomCode: 'OMNI-7829',
      bytesSent: telemetry?.bytesSent || 0,
      bytesReceived: telemetry?.bytesReceived || 0,
      fileTransfers: activeTransfers,
      clipboardSyncs: clipboardHistory
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `omnihub-activity-log-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="glass-panel border border-slate-700/80 rounded-2xl w-full max-w-4xl max-h-[88vh] flex flex-col shadow-2xl overflow-hidden bg-slate-900/95">
        {/* Header */}
        <div className="p-4 md:p-6 border-b border-slate-800 flex items-center justify-between gap-4 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shadow-glow-cyan">
              <Activity className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base md:text-lg font-bold text-white">
                  Mesh Activity & Synchronization Log
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950/40 text-emerald-300 border border-emerald-500/40">
                  Live
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                History of WebRTC DataChannel chunked file streams and E2EE clipboard mirror events.
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

        {/* Top Metric Cards Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 md:px-6 bg-slate-950/30 border-b border-slate-800/80 text-xs font-mono">
          <div className="glass-panel rounded-xl p-3 border border-slate-800">
            <span className="text-[10px] text-slate-400 block mb-1">FILE TRANSFERS</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-base font-bold text-cyan-300">{activeTransfers.length}</span>
              <span className="text-[10px] text-slate-500">
                ({completedTransfers} completed)
              </span>
            </div>
          </div>

          <div className="glass-panel rounded-xl p-3 border border-slate-800">
            <span className="text-[10px] text-slate-400 block mb-1">TOTAL TRAFFIC</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-base font-bold text-emerald-300">
                {formatBytes(totalVolumeBytes)}
              </span>
              <span className="text-[10px] text-slate-500">TX+RX</span>
            </div>
          </div>

          <div className="glass-panel rounded-xl p-3 border border-slate-800">
            <span className="text-[10px] text-slate-400 block mb-1">CLIPBOARD SNIPPETS</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-base font-bold text-violet-300">{clipboardHistory.length}</span>
              <span className="text-[10px] text-slate-500">mirrored</span>
            </div>
          </div>

          <div className="glass-panel rounded-xl p-3 border border-slate-800">
            <span className="text-[10px] text-slate-400 block mb-1">CHANNEL SECURITY</span>
            <div className="flex items-center gap-1.5 text-cyan-300 font-semibold">
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              <span>AES-256 E2EE</span>
            </div>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              RTT: {telemetry?.latencyRttMs || 8}ms
            </span>
          </div>
        </div>

        {/* Filter Toolbar & Actions */}
        <div className="p-4 md:px-6 border-b border-slate-800/80 flex flex-col md:flex-row items-center justify-between gap-3 bg-slate-900/60">
          {/* Tabs */}
          <div className="flex items-center p-1 rounded-xl bg-slate-950/80 border border-slate-800 w-full md:w-auto text-xs font-mono">
            <button
              onClick={() => {
                soundFx.playClick(600);
                setActiveTab('all');
              }}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeTab === 'all'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All Events ({unifiedEvents.length})
            </button>
            <button
              onClick={() => {
                soundFx.playClick(600);
                setActiveTab('files');
              }}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                activeTab === 'files'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Files ({activeTransfers.length})</span>
            </button>
            <button
              onClick={() => {
                soundFx.playClick(600);
                setActiveTab('clipboard');
              }}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                activeTab === 'clipboard'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Clipboard className="w-3.5 h-3.5" />
              <span>Clipboard ({clipboardHistory.length})</span>
            </button>
          </div>

          {/* Search Input & Action Buttons */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-56">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search activity log..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full glass-input rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none"
              />
            </div>

            {/* Test Simulation Buttons */}
            {onSimulateFile && (
              <button
                onClick={() => {
                  soundFx.playClick(700);
                  onSimulateFile();
                }}
                title="Simulate inbound peer file transfer"
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-cyan-300 border border-slate-700 text-xs font-mono transition-all flex items-center gap-1 shrink-0"
              >
                <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden sm:inline">+ Sim File</span>
              </button>
            )}

            {/* Export JSON */}
            <button
              onClick={handleExportJson}
              title="Export Log as JSON"
              className="p-1.5 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-emerald-300 border border-slate-700 text-xs font-mono transition-all flex items-center gap-1 shrink-0"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Export</span>
            </button>
          </div>
        </div>

        {/* Scrollable Event List */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3">
          {filteredEvents.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 rounded-2xl bg-slate-800/60 border border-slate-700 flex items-center justify-center mx-auto mb-3 text-slate-500">
                <Activity className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-300">No activity events found</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                No transfer or clipboard logs match your filter. Try adjusting your search query or trigger a test event.
              </p>
              {onSimulateFile && (
                <button
                  onClick={onSimulateFile}
                  className="mt-4 px-3 py-1.5 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-xs font-mono hover:bg-cyan-500/30 transition-all inline-flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Simulate Test Peer Transfer</span>
                </button>
              )}
            </div>
          ) : (
            filteredEvents.map((event) => {
              if (event.type === 'file' && event.fileItem) {
                const item = event.fileItem;
                const isIncoming = item.direction === 'incoming';
                const isCompleted = item.status === 'completed';
                const isTransferring = item.status === 'transferring';

                return (
                  <div
                    key={item.id}
                    className="glass-panel rounded-xl p-3.5 border border-slate-800 hover:border-slate-700/90 bg-slate-900/40 transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 group"
                  >
                    {/* Left: Direction Icon & File Details */}
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div
                        className={`p-2.5 rounded-xl border shrink-0 mt-0.5 ${
                          isCompleted
                            ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400'
                            : isTransferring
                            ? 'bg-cyan-950/40 border-cyan-500/30 text-cyan-400'
                            : 'bg-rose-950/40 border-rose-500/30 text-rose-400'
                        }`}
                      >
                        {isIncoming ? (
                          <Download className="w-4 h-4" />
                        ) : (
                          <UploadCloud className="w-4 h-4" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-xs font-bold text-slate-100 truncate max-w-sm block">
                            {item.name}
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
                            {formatBytes(item.sizeBytes)}
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-950/40 text-cyan-300 border border-cyan-500/30 uppercase">
                            {item.direction}
                          </span>
                        </div>

                        {/* Progress bar if transferring */}
                        {isTransferring && (
                          <div className="w-full max-w-md bg-slate-800 rounded-full h-1.5 my-1.5 overflow-hidden">
                            <div
                              className="h-full bg-cyan-400 shadow-glow-cyan transition-all duration-300"
                              style={{ width: `${item.progressPercent}%` }}
                            />
                          </div>
                        )}

                        <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-500" />
                            <span>{formatRelativeTime(item.timestamp)}</span>
                            <span className="text-slate-600">({formatExactTime(item.timestamp)})</span>
                          </span>

                          {item.speedMBps && isTransferring && (
                            <span className="text-cyan-300 font-semibold">
                              {item.speedMBps} MB/s
                            </span>
                          )}

                          <span className="text-slate-500">
                            MIME: {item.mimeType || 'binary/raw'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Status Pill & Download Action */}
                    <div className="flex items-center gap-2 shrink-0 self-end md:self-center font-mono text-xs">
                      {isCompleted && (
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-950/40 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 text-[11px] font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Completed (100%)</span>
                        </span>
                      )}

                      {isTransferring && (
                        <span className="px-2.5 py-1 rounded-lg bg-cyan-950/40 text-cyan-300 border border-cyan-500/30 flex items-center gap-1.5 text-[11px] font-semibold animate-pulse">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Streaming ({item.progressPercent}%)</span>
                        </span>
                      )}

                      {item.status === 'failed' && (
                        <span className="px-2.5 py-1 rounded-lg bg-rose-950/40 text-rose-300 border border-rose-500/30 flex items-center gap-1.5 text-[11px]">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>Failed</span>
                        </span>
                      )}

                      {/* Download Verified File Button */}
                      {item.blobUrl && (
                        <a
                          href={item.blobUrl}
                          download={item.name}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-glow-emerald transition-all"
                          title="Download received file"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download</span>
                        </a>
                      )}
                    </div>
                  </div>
                );
              }

              if (event.type === 'clipboard' && event.clipboardItem) {
                const clip = event.clipboardItem;
                const isCopied = copiedId === clip.id;

                return (
                  <div
                    key={clip.id}
                    className="glass-panel rounded-xl p-3.5 border border-slate-800 hover:border-slate-700/90 bg-slate-900/40 transition-all flex flex-col md:flex-row md:items-start justify-between gap-3 group"
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="p-2.5 rounded-xl bg-violet-950/40 border border-violet-500/30 text-violet-400 shrink-0 mt-0.5">
                        <Clipboard className="w-4 h-4" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-[11px] font-semibold text-cyan-300 font-mono flex items-center gap-1">
                            <Laptop className="w-3 h-3" />
                            {clip.senderName}
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-violet-950/40 text-violet-300 border border-violet-500/30 flex items-center gap-1">
                            <Lock className="w-2.5 h-2.5" /> AES-GCM Encrypted
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {clip.text.length} chars
                          </span>
                        </div>

                        {/* Monospace Code Preview Box */}
                        <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 text-xs font-mono text-slate-200 break-all select-all my-1.5">
                          {clip.text}
                        </div>

                        <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span>{formatRelativeTime(clip.timestamp)}</span>
                          <span className="text-slate-600">({formatExactTime(clip.timestamp)})</span>
                        </div>
                      </div>
                    </div>

                    {/* Copy Snippet Button */}
                    <div className="shrink-0 self-end md:self-start">
                      <button
                        onClick={() => handleCopyClipboardText(clip)}
                        title="Copy to local clipboard"
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono transition-all ${
                          isCopied
                            ? 'bg-emerald-950/50 text-emerald-300 border-emerald-500/50'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700'
                        }`}
                      >
                        {isCopied ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Clipboard className="w-3.5 h-3.5 text-cyan-400" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              }

              return null;
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 md:px-6 border-t border-slate-800/80 bg-slate-950/70 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono text-slate-400">
          <div className="flex items-center gap-2 text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Zero-Cloud Local Wi-Fi Mesh • Data Channel Room: OMNI-7829</span>
          </div>

          <button
            onClick={() => {
              soundFx.playClick(450);
              onClose();
            }}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
