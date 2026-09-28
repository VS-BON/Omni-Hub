import React, { useState } from 'react';
import {
  Headphones,
  BatteryCharging,
  Wifi,
  Radio,
  Sliders,
  Sparkles,
  Volume2,
  Bluetooth,
  ShieldCheck,
  Disc,
  Power
} from 'lucide-react';
import { AncMode, BluetoothPeripheralDevice, WearableAncMode } from '../types/index.js';
import { soundFx } from '../services/audioFeedback.js';
import { BatteryTrendChart } from './BatteryTrendChart.js';

interface BluetoothCardProps {
  device: BluetoothPeripheralDevice;
  onSetAncMode: (mode: AncMode) => void;
  onScanBluetooth: () => void;
  activityRank?: number;
  activityReason?: string;
  isAutoSorted?: boolean;
}

interface BatteryRingProps {
  percent: number;
  label: string;
  sublabel: string;
  strokeColor: string;
  textColor: string;
  bgColor: string;
}

const BatteryRing: React.FC<BatteryRingProps> = ({
  percent,
  label,
  sublabel,
  strokeColor,
  textColor,
  bgColor
}) => {
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const validPercent = Math.max(0, Math.min(100, percent));
  const strokeDashoffset = circumference - (validPercent / 100) * circumference;

  return (
    <div className={`flex flex-col items-center p-2.5 rounded-xl border border-slate-800 ${bgColor} relative overflow-hidden transition-all duration-300`}>
      <div className="relative w-14 h-14 flex items-center justify-center my-0.5">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 52 52">
          {/* Background circle */}
          <circle
            cx="26"
            cy="26"
            r={radius}
            className="stroke-slate-800/80"
            strokeWidth="3.5"
            fill="none"
          />
          {/* Animated Progress ring */}
          <circle
            cx="26"
            cy="26"
            r={radius}
            className={`${strokeColor} transition-all duration-700 ease-out`}
            strokeWidth="3.5"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="none"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className={`text-xs font-black font-mono ${textColor}`}>{validPercent}%</span>
        </div>
      </div>

      <div className="text-center mt-1">
        <span className="text-xs font-bold text-slate-200 block leading-tight">{label}</span>
        <span className="text-[10px] font-mono text-slate-400 block">{sublabel}</span>
      </div>
    </div>
  );
};

export const BluetoothCard: React.FC<BluetoothCardProps> = ({
  device,
  onSetAncMode,
  onScanBluetooth,
  activityRank,
  activityReason,
  isAutoSorted
}) => {
  const { telemetry } = device;
  const [isPairing, setIsPairing] = useState(false);

  const mainBattery = telemetry.batteryLevel ?? 88;
  const leftBattery = device.leftEarbudBatteryPercent ?? telemetry.leftEarbudBatteryPercent ?? mainBattery;
  const rightBattery = device.rightEarbudBatteryPercent ?? telemetry.rightEarbudBatteryPercent ?? Math.max(0, mainBattery - 2);
  const caseBattery = device.caseBatteryPercent ?? telemetry.caseBatteryPercent ?? 94;
  const ancMode = (device.ancMode || telemetry.ancMode || 'anc') as WearableAncMode;
  const rssi = device.rssiSignalStrengthDbm ?? telemetry.rssiSignalDbm ?? -48;

  const ancOptions: Array<{ mode: WearableAncMode; label: string; desc: string; icon: string }> = [
    { mode: 'anc', label: 'Noise Cancelling', desc: 'Max acoustic isolation (40dB)', icon: '🔇' },
    { mode: 'transparency', label: 'Transparency', desc: 'Ambient voice passthrough', icon: '🎙️' },
    { mode: 'off', label: 'Passive Off', desc: 'Standard DAC output', icon: '⚡' }
  ];

  const handlePairClick = async () => {
    soundFx.playClick(850);
    setIsPairing(true);
    try {
      await onScanBluetooth();
    } finally {
      setTimeout(() => setIsPairing(false), 1200);
    }
  };

  const handleAncSelect = (mode: WearableAncMode) => {
    soundFx.playClick(620);
    onSetAncMode(mode);
  };

  // Signal quality evaluation
  const getSignalQuality = (dbm: number) => {
    if (dbm >= -50) return { label: 'Excellent', color: 'text-emerald-400' };
    if (dbm >= -65) return { label: 'Good', color: 'text-cyan-400' };
    if (dbm >= -80) return { label: 'Fair', color: 'text-amber-400' };
    return { label: 'Weak', color: 'text-rose-400' };
  };

  const signalQuality = getSignalQuality(rssi);

  return (
    <div
      id={`device-card-${device.id}`}
      data-device-id={device.id}
      className="glass-card rounded-2xl p-5 md:p-6 col-span-1 md:col-span-1 lg:col-span-1 relative overflow-hidden flex flex-col justify-between transition-all duration-300"
    >
      {/* Background ambient glow */}
      <div className="absolute -top-16 -right-16 w-52 h-52 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

      <div>
        {/* Header with Device Identity & Pair Earbuds Button */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-violet-500/10 border border-violet-500/30 text-violet-400 shadow-glow-violet">
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-100 truncate max-w-[155px] sm:max-w-none" title={device.name}>
                {device.name}
              </h3>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                <span className={`w-1.5 h-1.5 rounded-full ${device.status === 'connected' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                <span className="text-[11px] font-mono text-slate-400">WebBluetooth GATT</span>
                {isAutoSorted && activityRank !== undefined && (
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full border ${
                      activityRank === 1
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-glow-amber animate-pulse font-bold'
                        : activityRank === 2
                        ? 'bg-violet-500/20 text-violet-300 border-violet-500/40 font-semibold'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                    title={`Auto-Sort Priority #${activityRank}: ${activityReason || 'Active Peripheral'}`}
                  >
                    #{activityRank}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Pair New Earbuds Button */}
          <button
            onClick={handlePairClick}
            disabled={isPairing}
            title="Scan & Pair via browser WebBluetooth (0x180F)"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gradient-to-r from-violet-600/30 to-cyan-600/30 hover:from-violet-600/50 hover:to-cyan-600/50 text-white border border-violet-500/40 hover:border-violet-400 shadow-glow-violet transition-all active:scale-95 disabled:opacity-50"
          >
            <Radio className={`w-3.5 h-3.5 text-cyan-300 ${isPairing ? 'animate-spin' : 'animate-pulse'}`} />
            <span className="font-semibold">{isPairing ? 'Pairing...' : 'Pair New Earbuds'}</span>
          </button>
        </div>

        {/* Circular Battery Rings Grid (Left Earbud, Right Earbud, Charging Case) */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-medium flex items-center gap-1.5">
              <Disc className="w-3.5 h-3.5 text-cyan-400" /> TWS Battery Telemetry
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              Avg: {Math.round((leftBattery + rightBattery) / 2)}%
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <BatteryRing
              percent={leftBattery}
              label="Left Pod"
              sublabel="Earbud (L)"
              strokeColor="stroke-cyan-400"
              textColor="text-cyan-300"
              bgColor="bg-cyan-950/20"
            />
            <BatteryRing
              percent={rightBattery}
              label="Right Pod"
              sublabel="Earbud (R)"
              strokeColor="stroke-violet-400"
              textColor="text-violet-300"
              bgColor="bg-violet-950/20"
            />
            <BatteryRing
              percent={caseBattery}
              label="Case"
              sublabel="Dock 500mAh"
              strokeColor="stroke-emerald-400"
              textColor="text-emerald-300"
              bgColor="bg-emerald-950/20"
            />
          </div>
        </div>

        {/* Signal Strength & Audio Codec Bento Bar */}
        <div className="glass-panel rounded-xl p-2.5 border border-slate-800 flex items-center justify-between mb-4 text-xs font-mono">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-violet-400">
              <Wifi className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-200 font-bold">{rssi} dBm</span>
                <span className={`text-[10px] font-semibold ${signalQuality.color}`}>({signalQuality.label})</span>
              </div>
              <span className="text-[10px] text-slate-500 block">BLE Signal RSSI</span>
            </div>
          </div>

          <div className="text-right">
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-cyan-950/40 text-cyan-300 border border-cyan-500/30">
              {telemetry.codec || 'LDAC High-Res'}
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">990 kbps • 24bit/96kHz</span>
          </div>
        </div>

        {/* Active Noise Cancellation (ANC) Mode Selector */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-violet-400" /> Active Noise Cancellation (ANC)
            </span>
            <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> Hardware DSP
            </span>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {ancOptions.map((opt) => {
              const isActive = ancMode === opt.mode;
              return (
                <button
                  key={opt.mode}
                  onClick={() => handleAncSelect(opt.mode)}
                  className={`p-2.5 rounded-xl text-center border transition-all ${
                    isActive
                      ? 'bg-gradient-to-b from-violet-600/30 to-cyan-600/20 border-violet-500/80 shadow-glow-violet text-white font-bold'
                      : 'glass-panel border-slate-800/80 hover:border-slate-700 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="text-sm mb-1">{opt.icon}</div>
                  <div className="text-xs font-semibold leading-tight">{opt.label}</div>
                  <span className="text-[9px] text-slate-400 block mt-0.5 leading-tight truncate">
                    {opt.desc}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Battery Trend Chart (Recharts earbud drain over time) */}
        <BatteryTrendChart
          leftBattery={leftBattery}
          rightBattery={rightBattery}
          caseBattery={caseBattery}
          ancMode={ancMode}
          deviceName={device.name}
        />
      </div>

      {/* Footer Characteristic info */}
      <div className="pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
        <span className="flex items-center gap-1.5">
          <Bluetooth className="w-3.5 h-3.5 text-cyan-400" />
          <span>GATT 0x180F Battery</span>
        </span>
        <span>FW: {telemetry.firmwareVersion || 'v4.1.2'}</span>
      </div>
    </div>
  );
};
