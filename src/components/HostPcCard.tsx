import React, { useState } from 'react';
import {
  Cpu,
  Flame,
  HardDrive,
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Server,
  Copy,
  Check,
  Zap,
  Info
} from 'lucide-react';
import { HostPcDevice } from '../types/index.js';
import { soundFx } from '../services/audioFeedback.js';
import { TelemetryHistoryChart } from './TelemetryHistoryChart.js';

interface HostPcCardProps {
  device: HostPcDevice;
  isLiveDaemon: boolean;
  onOpenDaemonModal: () => void;
  activityRank?: number;
  activityReason?: string;
  isAutoSorted?: boolean;
}

function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function formatUptime(totalSeconds: number): string {
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  return `${hours}h ${minutes}m`;
}

export const HostPcCard: React.FC<HostPcCardProps> = ({
  device,
  isLiveDaemon,
  onOpenDaemonModal,
  activityRank,
  activityReason,
  isAutoSorted
}) => {
  const [copied, setCopied] = useState(false);
  const { telemetry } = device;

  const handleCopySnapshot = () => {
    soundFx.playClick(900);
    navigator.clipboard.writeText(JSON.stringify(telemetry, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const cpuLoad = telemetry.cpu?.loadPercent ?? 20;
  const cpuTemp = telemetry.cpu?.temperatureCelsius ?? 45;
  const gpuUtil = telemetry.gpu?.utilizationPercent ?? 15;
  const gpuTemp = telemetry.gpu?.temperatureCelsius ?? 48;
  const memPercent = telemetry.memory?.activePercent ?? 40;

  // Temperature color helper
  const getTempColor = (temp: number) => {
    if (temp >= 80) return 'text-rose-400 border-rose-500/40 bg-rose-950/40';
    if (temp >= 65) return 'text-amber-400 border-amber-500/40 bg-amber-950/40';
    return 'text-emerald-400 border-emerald-500/40 bg-emerald-950/40';
  };

  return (
    <div
      id={`device-card-${device.id}`}
      data-device-id={device.id}
      className="glass-card rounded-2xl p-5 md:p-6 col-span-1 md:col-span-2 lg:col-span-2 relative overflow-hidden flex flex-col justify-between transition-all duration-300"
    >
      {/* Subtle background glow */}
      <div className="absolute -top-24 -left-24 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header section */}
      <div>
        <div className="flex items-start justify-between gap-3 mb-5">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shadow-glow-cyan">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-base text-slate-100">{device.name}</h3>
                {isAutoSorted && activityRank !== undefined && (
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                      activityRank === 1
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-glow-amber animate-pulse font-bold'
                        : activityRank === 2
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-semibold'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                    title={`Auto-Sort Priority #${activityRank}: ${activityReason || 'Active Telemetry'}`}
                  >
                    <span>#{activityRank} Priority</span>
                    {activityReason && <span className="hidden xl:inline opacity-80 truncate max-w-[150px]">• {activityReason}</span>}
                  </span>
                )}
                <span
                  className={`text-[11px] font-mono px-2 py-0.5 rounded-full border ${
                    isLiveDaemon
                      ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                      : 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
                  }`}
                >
                  {isLiveDaemon ? 'Live WS Daemon' : 'Simulated Telemetry'}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                {telemetry.system.hostname} • {telemetry.system.distro} ({telemetry.system.arch})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopySnapshot}
              title="Copy Raw Telemetry JSON"
              className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700/80 transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
            <button
              onClick={onOpenDaemonModal}
              title="Daemon Settings"
              className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-cyan-300 border border-slate-700/80 transition-colors"
            >
              <Info className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Primary Metrics Bento Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          {/* CPU Metric Card */}
          <div className="glass-panel rounded-xl p-3.5 border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span className="flex items-center gap-1 font-medium">
                <Cpu className="w-3.5 h-3.5 text-cyan-400" /> CPU Load
              </span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded border font-mono ${getTempColor(cpuTemp)}`}>
                {cpuTemp}°C
              </span>
            </div>
            <div className="my-2">
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black font-mono tracking-tight text-white">
                  {cpuLoad}%
                </span>
                <span className="text-[11px] font-mono text-slate-400">{telemetry.cpu.speedGhz} GHz</span>
              </div>
              {/* Progress bar */}
              <div className="w-full bg-slate-800 rounded-full h-1.5 mt-1.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-cyan-500 to-cyan-300 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${cpuLoad}%` }}
                />
              </div>
            </div>
            <span className="text-[10px] text-slate-400 truncate" title={telemetry.cpu.model}>
              {telemetry.cpu.coresCount} Cores • {telemetry.cpu.model.split(' ')[0]}
            </span>
          </div>

          {/* GPU Metric Card */}
          <div className="glass-panel rounded-xl p-3.5 border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span className="flex items-center gap-1 font-medium">
                <Zap className="w-3.5 h-3.5 text-violet-400" /> GPU Util
              </span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded border font-mono ${getTempColor(gpuTemp)}`}>
                {gpuTemp}°C
              </span>
            </div>
            <div className="my-2">
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black font-mono tracking-tight text-white">
                  {gpuUtil}%
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  {Math.round(telemetry.gpu.memoryUsedMb / 1024)}GB
                </span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5 mt-1.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-violet-500 to-violet-300 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${gpuUtil}%` }}
                />
              </div>
            </div>
            <span className="text-[10px] text-slate-400 truncate" title={telemetry.gpu.model}>
              {telemetry.gpu.model}
            </span>
          </div>

          {/* Memory / RAM Card */}
          <div className="glass-panel rounded-xl p-3.5 border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span className="flex items-center gap-1 font-medium">
                <Activity className="w-3.5 h-3.5 text-emerald-400" /> RAM Active
              </span>
              <span className="text-[10px] font-mono text-emerald-300">
                {memPercent}%
              </span>
            </div>
            <div className="my-2">
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black font-mono tracking-tight text-white">
                  {(telemetry.memory.usedBytes / (1024 * 1024 * 1024)).toFixed(1)}
                  <span className="text-xs text-slate-400 font-normal ml-0.5">GB</span>
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  / {Math.round(telemetry.memory.totalBytes / (1024 * 1024 * 1024))}GB
                </span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5 mt-1.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-emerald-500 to-emerald-300 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${memPercent}%` }}
                />
              </div>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">
              Free: {(telemetry.memory.freeBytes / (1024 * 1024 * 1024)).toFixed(1)} GB
            </span>
          </div>

          {/* Primary Storage NVMe */}
          <div className="glass-panel rounded-xl p-3.5 border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span className="flex items-center gap-1 font-medium">
                <HardDrive className="w-3.5 h-3.5 text-amber-400" /> NVMe Disk
              </span>
              <span className="text-[10px] font-mono text-amber-300">
                {telemetry.storage[0]?.usePercent || 32}%
              </span>
            </div>
            <div className="my-2">
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black font-mono tracking-tight text-white">
                  {Math.round((telemetry.storage[0]?.usedBytes || 0) / (1024 * 1024 * 1024))}
                  <span className="text-xs text-slate-400 font-normal ml-0.5">GB</span>
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  / {Math.round((telemetry.storage[0]?.sizeBytes || 0) / (1024 * 1024 * 1024))}GB
                </span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5 mt-1.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-amber-500 to-amber-300 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${telemetry.storage[0]?.usePercent || 32}%` }}
                />
              </div>
            </div>
            <span className="text-[10px] text-slate-400 truncate font-mono">
              Mount: {telemetry.storage[0]?.mount || '/'}
            </span>
          </div>
        </div>

        {/* 60-Second Real-Time Utilization Trend Chart */}
        <TelemetryHistoryChart currentCpu={cpuLoad} currentGpu={gpuUtil} />

        {/* Per-Core Load Bars */}
        <div className="glass-panel rounded-xl p-3 border border-slate-800 mb-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-medium flex items-center gap-1.5">
              Core Thread Distribution ({telemetry.cpu.coreLoads.length} Cores)
            </span>
            <span className="font-mono text-[11px]">
              Avg Load: {cpuLoad}%
            </span>
          </div>
          <div className="grid grid-cols-8 md:grid-cols-16 gap-1 items-end h-8">
            {telemetry.cpu.coreLoads.map((load, i) => (
              <div
                key={i}
                className="bg-slate-800/80 rounded-sm relative flex flex-col justify-end overflow-hidden h-full group"
                title={`Core #${i + 1}: ${load}%`}
              >
                <div
                  className={`w-full transition-all duration-300 rounded-sm ${
                    load > 75
                      ? 'bg-rose-500'
                      : load > 50
                      ? 'bg-amber-400'
                      : 'bg-cyan-400'
                  }`}
                  style={{ height: `${Math.max(8, load)}%` }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer Network I/O & System Info Bar */}
      <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs font-mono text-slate-400">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <ArrowDownRight className="w-3.5 h-3.5 text-cyan-400" />
            <span>Down:</span>
            <span className="text-slate-200 font-semibold">{formatBytes(telemetry.network.rxBytesPerSec)}/s</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
            <span>Up:</span>
            <span className="text-slate-200 font-semibold">{formatBytes(telemetry.network.txBytesPerSec)}/s</span>
          </div>
          <span className="hidden md:inline text-slate-600">|</span>
          <span className="hidden md:inline text-slate-400">
            {telemetry.network.primaryInterface} ({telemetry.network.ip4})
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span>Uptime: {formatUptime(telemetry.system.uptimeSeconds)}</span>
          {telemetry.battery?.hasBattery && (
            <span className="text-emerald-300">
              🔋 {telemetry.battery.percent}% {telemetry.battery.isCharging ? '⚡' : ''}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
