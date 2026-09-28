import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import {
  TrendingDown,
  Clock,
  Headphones,
  Disc,
  ShieldCheck,
  Zap,
  Sparkles
} from 'lucide-react';
import { WearableAncMode } from '../types/index.js';

export interface BatteryHistoryPoint {
  timeLabel: string;
  formattedTime: string;
  fullTimeStr: string;
  minutesAgo: number;
  left: number;
  right: number;
  caseVal: number;
  avg: number;
  leftDrainDelta: number;
  rightDrainDelta: number;
}

interface BatteryTrendChartProps {
  leftBattery: number;
  rightBattery: number;
  caseBattery?: number;
  ancMode?: WearableAncMode | string;
  deviceName?: string;
}

interface TooltipPayloadItem {
  name: string;
  value: number;
  color: string;
  dataKey: string;
  payload: BatteryHistoryPoint;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
  deviceName?: string;
  ancMode?: string;
}

interface DeviceBranding {
  brandLabel: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  leftColor: string;
  leftBorder: string;
  leftBg: string;
  rightColor: string;
  rightBorder: string;
  rightBg: string;
  caseColor: string;
  caseBorder: string;
  caseBg: string;
}

function resolveDeviceBranding(deviceName: string = ''): DeviceBranding {
  const lower = deviceName.toLowerCase();

  if (lower.includes('sony') || lower.includes('wf-') || lower.includes('wh-')) {
    return {
      brandLabel: 'Sony LDAC Hi-Res',
      badgeBg: 'bg-amber-950/40',
      badgeBorder: 'border-amber-500/40',
      badgeText: 'text-amber-300',
      leftColor: '#06b6d4',
      leftBorder: 'border-cyan-500/40',
      leftBg: 'bg-cyan-950/30',
      rightColor: '#a855f7',
      rightBorder: 'border-purple-500/40',
      rightBg: 'bg-purple-950/30',
      caseColor: '#10b981',
      caseBorder: 'border-emerald-500/40',
      caseBg: 'bg-emerald-950/30'
    };
  }

  if (lower.includes('airpods') || lower.includes('apple') || lower.includes('beats')) {
    return {
      brandLabel: 'Apple Spatial Audio',
      badgeBg: 'bg-sky-950/40',
      badgeBorder: 'border-sky-400/40',
      badgeText: 'text-sky-300',
      leftColor: '#38bdf8',
      leftBorder: 'border-sky-500/40',
      leftBg: 'bg-sky-950/30',
      rightColor: '#c084fc',
      rightBorder: 'border-purple-400/40',
      rightBg: 'bg-purple-950/30',
      caseColor: '#34d399',
      caseBorder: 'border-emerald-400/40',
      caseBg: 'bg-emerald-950/30'
    };
  }

  if (lower.includes('pixel') || lower.includes('buds')) {
    return {
      brandLabel: 'Google Fast Pair HD',
      badgeBg: 'bg-cyan-950/40',
      badgeBorder: 'border-cyan-400/40',
      badgeText: 'text-cyan-300',
      leftColor: '#22d3ee',
      leftBorder: 'border-cyan-400/40',
      leftBg: 'bg-cyan-950/30',
      rightColor: '#fb7185',
      rightBorder: 'border-rose-400/40',
      rightBg: 'bg-rose-950/30',
      caseColor: '#4ade80',
      caseBorder: 'border-emerald-400/40',
      caseBg: 'bg-emerald-950/30'
    };
  }

  if (lower.includes('galaxy') || lower.includes('samsung')) {
    return {
      brandLabel: 'Samsung SSC 24-bit',
      badgeBg: 'bg-indigo-950/40',
      badgeBorder: 'border-indigo-400/40',
      badgeText: 'text-indigo-300',
      leftColor: '#818cf8',
      leftBorder: 'border-indigo-400/40',
      leftBg: 'bg-indigo-950/30',
      rightColor: '#e879f9',
      rightBorder: 'border-fuchsia-400/40',
      rightBg: 'bg-fuchsia-950/30',
      caseColor: '#2dd4bf',
      caseBorder: 'border-teal-400/40',
      caseBg: 'bg-teal-950/30'
    };
  }

  // Default Cybernetic Precision Audio Branding
  return {
    brandLabel: 'TWS Peripheral GATT',
    badgeBg: 'bg-violet-950/40',
    badgeBorder: 'border-violet-500/40',
    badgeText: 'text-violet-300',
    leftColor: '#06b6d4',
    leftBorder: 'border-cyan-500/40',
    leftBg: 'bg-cyan-950/30',
    rightColor: '#a855f7',
    rightBorder: 'border-purple-500/40',
    rightBg: 'bg-purple-950/30',
    caseColor: '#10b981',
    caseBorder: 'border-emerald-500/40',
    caseBg: 'bg-emerald-950/30'
  };
}

/**
 * Custom Tooltip Component with Formatted Timestamps & Specific Device Branding Colors
 */
const CustomBatteryTooltip: React.FC<CustomTooltipProps> = ({
  active,
  payload,
  label,
  deviceName = 'Sony WF-1000XM5',
  ancMode = 'anc'
}) => {
  if (active && payload && payload.length) {
    const dataPoint = payload[0]?.payload as BatteryHistoryPoint | undefined;
    const branding = resolveDeviceBranding(deviceName);

    const formattedTime = dataPoint?.formattedTime || '14:00';
    const relativeTime = dataPoint?.minutesAgo === 0 ? 'Live Now' : `${dataPoint?.minutesAgo || 0}m ago`;
    const fullTime = dataPoint?.fullTimeStr || formattedTime;

    return (
      <div className="bg-slate-950/95 border border-slate-700/80 backdrop-blur-xl rounded-xl p-3 shadow-2xl text-xs font-mono min-w-[230px] animate-in fade-in zoom-in-95 pointer-events-none ring-1 ring-cyan-500/20">
        {/* Header: Formatted Timestamp & Device Brand Badge */}
        <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-slate-800">
          <div className="flex items-center gap-1.5 text-slate-200">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-bold text-[11px] text-white">{formattedTime}</span>
            <span className="text-[10px] text-slate-400 font-normal">({relativeTime})</span>
          </div>

          {/* Specific Device Branding Badge */}
          <span
            className={`px-1.5 py-0.5 rounded text-[9px] font-bold border tracking-wider uppercase ${branding.badgeBg} ${branding.badgeBorder} ${branding.badgeText}`}
          >
            {branding.brandLabel}
          </span>
        </div>

        {/* Device Items with Specific Branding Colors & Micro Progress Bars */}
        <div className="space-y-1.5 mb-2.5">
          {payload.map((entry, idx) => {
            const isLeft = entry.dataKey === 'left' || entry.name.toLowerCase().includes('left');
            const isRight = entry.dataKey === 'right' || entry.name.toLowerCase().includes('right');
            const isCase = entry.dataKey === 'caseVal' || entry.name.toLowerCase().includes('case');

            const itemBranding = isLeft
              ? { color: branding.leftColor, border: branding.leftBorder, bg: branding.leftBg, label: 'Left Pod (L)' }
              : isRight
              ? { color: branding.rightColor, border: branding.rightBorder, bg: branding.rightBg, label: 'Right Pod (R)' }
              : { color: branding.caseColor, border: branding.caseBorder, bg: branding.caseBg, label: 'Charging Case' };

            const val = entry.value;

            return (
              <div
                key={idx}
                className={`p-1.5 rounded-lg border flex items-center justify-between gap-2 transition-all ${itemBranding.bg} ${itemBranding.border}`}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    className="w-2 h-2 rounded-full shrink-0 shadow-sm"
                    style={{
                      backgroundColor: itemBranding.color,
                      boxShadow: `0 0 8px ${itemBranding.color}80`
                    }}
                  />
                  <span className="font-semibold text-slate-200 text-[11px] truncate">
                    {itemBranding.label}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Micro Progress Bar */}
                  <div className="w-12 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(100, Math.max(0, val))}%`,
                        backgroundColor: itemBranding.color
                      }}
                    />
                  </div>
                  <span className="font-bold text-white text-[11px] min-w-[32px] text-right">
                    {val}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer: Acoustic Mode & Status */}
        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
          <span className="flex items-center gap-1 text-slate-300">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            <span className="capitalize">{ancMode} Mode</span>
          </span>
          <span className="text-slate-400 font-mono">
            {fullTime}
          </span>
        </div>
      </div>
    );
  }
  return null;
};

export const BatteryTrendChart: React.FC<BatteryTrendChartProps> = ({
  leftBattery,
  rightBattery,
  caseBattery = 94,
  ancMode = 'anc',
  deviceName = 'Sony WF-1000XM5 True Wireless'
}) => {
  const [showCase, setShowCase] = useState(false);
  const branding = useMemo(() => resolveDeviceBranding(deviceName), [deviceName]);

  // Generate realistic discharge curve based on active hardware ANC mode
  // ANC: ~15.5%/hr, Transparency: ~13.0%/hr, Passive Off: ~9.8%/hr
  const drainRatePerHour = useMemo(() => {
    switch (ancMode) {
      case 'anc':
        return 15.5;
      case 'transparency':
        return 13.0;
      case 'off':
      default:
        return 9.8;
    }
  }, [ancMode]);

  // Estimate playback runtime remaining based on active earbud battery
  const avgCurrentBattery = Math.round((leftBattery + rightBattery) / 2);
  const hoursRemaining = useMemo(() => {
    const hrs = avgCurrentBattery / drainRatePerHour;
    return hrs.toFixed(1);
  }, [avgCurrentBattery, drainRatePerHour]);

  // Pre-seed 8 intervals spanning the last 60 minutes with formatted real-world timestamps
  const data: BatteryHistoryPoint[] = useMemo(() => {
    const points: BatteryHistoryPoint[] = [];
    const now = Date.now();
    const intervals = [
      { label: '-60m', minutesAgo: 60, factor: 1.0 },
      { label: '-50m', minutesAgo: 50, factor: 0.82 },
      { label: '-40m', minutesAgo: 40, factor: 0.65 },
      { label: '-30m', minutesAgo: 30, factor: 0.48 },
      { label: '-20m', minutesAgo: 20, factor: 0.32 },
      { label: '-10m', minutesAgo: 10, factor: 0.16 },
      { label: '-5m', minutesAgo: 5, factor: 0.08 },
      { label: 'Now', minutesAgo: 0, factor: 0 }
    ];

    const totalDrainSimulated = drainRatePerHour * 1.0; // 1 hr drain
    const leftStart = Math.min(100, Math.round(leftBattery + totalDrainSimulated));
    const rightStart = Math.min(100, Math.round(rightBattery + totalDrainSimulated * 1.04));
    const caseStart = Math.min(100, Math.round(caseBattery + 2));

    intervals.forEach((step) => {
      const timeMs = now - step.minutesAgo * 60 * 1000;
      const formattedTime = new Date(timeMs).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      });
      const fullTimeStr = new Date(timeMs).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });

      const leftVal = Math.min(100, Math.max(0, Math.round(leftBattery + (leftStart - leftBattery) * step.factor)));
      const rightVal = Math.min(100, Math.max(0, Math.round(rightBattery + (rightStart - rightBattery) * step.factor)));
      const caseVal = Math.min(100, Math.max(0, Math.round(caseBattery + (caseStart - caseBattery) * step.factor)));
      const avg = Math.round((leftVal + rightVal) / 2);

      points.push({
        timeLabel: step.label,
        formattedTime,
        fullTimeStr,
        minutesAgo: step.minutesAgo,
        left: leftVal,
        right: rightVal,
        caseVal,
        avg,
        leftDrainDelta: leftVal - leftStart,
        rightDrainDelta: rightVal - rightStart
      });
    });

    return points;
  }, [leftBattery, rightBattery, caseBattery, drainRatePerHour]);

  // Determine min Y to provide high-contrast curve definition
  const minY = useMemo(() => {
    const allVals = data.flatMap(d => showCase ? [d.left, d.right, d.caseVal] : [d.left, d.right]);
    const minVal = Math.min(...allVals);
    return Math.max(0, Math.floor((minVal - 10) / 10) * 10);
  }, [data, showCase]);

  return (
    <div className="glass-panel rounded-xl p-3 border border-slate-800 bg-slate-900/50 mb-4 transition-all">
      {/* Header with Metrics, Device Branding & Case Filter Toggle */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5">
          <TrendingDown className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-xs font-semibold text-slate-200">Battery Drain Trend</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Toggle Pods vs Case */}
          <button
            onClick={() => setShowCase(prev => !prev)}
            className={`px-1.5 py-0.5 rounded text-[10px] font-mono border transition-all ${
              showCase
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
          >
            {showCase ? '+ Case Active' : '+ Case'}
          </button>

          {/* Runtime Estimate Pill */}
          <div className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/40 border border-cyan-500/30 text-cyan-300">
            <Clock className="w-3 h-3 text-cyan-400" />
            <span>~{hoursRemaining}h left</span>
          </div>
        </div>
      </div>

      {/* Mini Legend & Specific Device Branding Swatches */}
      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-2">
        <div className="flex items-center gap-2.5">
          <span className="flex items-center gap-1">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: branding.leftColor }}
            />
            <span className="text-slate-300">Left Pod</span>
          </span>
          <span className="flex items-center gap-1">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: branding.rightColor }}
            />
            <span className="text-slate-300">Right Pod</span>
          </span>
          {showCase && (
            <span className="flex items-center gap-1">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: branding.caseColor }}
              />
              <span className="text-slate-300">Case</span>
            </span>
          )}
        </div>

        <span className="text-slate-500">
          -{drainRatePerHour.toFixed(1)}%/hr ({ancMode.toUpperCase()})
        </span>
      </div>

      {/* Recharts Area Chart with Custom Tooltip */}
      <div className="h-28 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 6, left: -26, bottom: 0 }}>
            <defs>
              <linearGradient id="customLeftGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={branding.leftColor} stopOpacity={0.35} />
                <stop offset="95%" stopColor={branding.leftColor} stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="customRightGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={branding.rightColor} stopOpacity={0.25} />
                <stop offset="95%" stopColor={branding.rightColor} stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="customCaseGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={branding.caseColor} stopOpacity={0.25} />
                <stop offset="95%" stopColor={branding.caseColor} stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.35} vertical={false} />

            <XAxis
              dataKey="timeLabel"
              stroke="#64748b"
              fontSize={10}
              tickLine={false}
              axisLine={{ stroke: '#334155' }}
              interval="preserveStartEnd"
            />

            <YAxis
              domain={[minY, 100]}
              stroke="#64748b"
              fontSize={10}
              tickLine={false}
              axisLine={{ stroke: '#334155' }}
              tickFormatter={(v) => `${v}%`}
            />

            <Tooltip
              content={
                <CustomBatteryTooltip
                  deviceName={deviceName}
                  ancMode={ancMode}
                />
              }
            />

            {/* Left Earbud Area */}
            <Area
              type="monotone"
              dataKey="left"
              name="Left Earbud"
              stroke={branding.leftColor}
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#customLeftGrad)"
              isAnimationActive={false}
              activeDot={{
                r: 4.5,
                stroke: '#ffffff',
                strokeWidth: 2,
                fill: branding.leftColor
              }}
            />

            {/* Right Earbud Area */}
            <Area
              type="monotone"
              dataKey="right"
              name="Right Earbud"
              stroke={branding.rightColor}
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#customRightGrad)"
              isAnimationActive={false}
              activeDot={{
                r: 4.5,
                stroke: '#ffffff',
                strokeWidth: 2,
                fill: branding.rightColor
              }}
            />

            {/* Charging Case Area (Optional toggle) */}
            {showCase && (
              <Area
                type="monotone"
                dataKey="caseVal"
                name="Charging Case"
                stroke={branding.caseColor}
                strokeWidth={1.5}
                strokeDasharray="3 3"
                fillOpacity={1}
                fill="url(#customCaseGrad)"
                isAnimationActive={false}
                activeDot={{
                  r: 4,
                  stroke: '#ffffff',
                  strokeWidth: 1.5,
                  fill: branding.caseColor
                }}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
