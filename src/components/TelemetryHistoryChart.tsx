import React, { useEffect, useRef, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';
import { Activity, Cpu, Zap } from 'lucide-react';

export interface TelemetryDataPoint {
  time: string;
  secondsAgo: number;
  cpu: number;
  gpu: number;
}

interface TelemetryHistoryChartProps {
  currentCpu: number;
  currentGpu: number;
  maxPoints?: number;
}

// Custom Glassmorphic Tooltip
interface TooltipPayloadItem {
  name: string;
  value: number;
  color: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/95 border border-slate-700/80 backdrop-blur-md rounded-lg p-2.5 shadow-2xl text-xs font-mono">
        <div className="text-slate-400 font-semibold mb-1.5 flex items-center justify-between gap-4">
          <span>{label}</span>
          <span className="text-[10px] text-slate-500 uppercase tracking-wider">Utilization</span>
        </div>
        <div className="space-y-1">
          {payload.map((entry, idx) => (
            <div key={idx} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5" style={{ color: entry.color }}>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="font-medium">{entry.name}:</span>
              </span>
              <span className="font-bold text-slate-100">{entry.value}%</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

export const TelemetryHistoryChart: React.FC<TelemetryHistoryChartProps> = ({
  currentCpu,
  currentGpu,
  maxPoints = 60
}) => {
  // Pre-seed 60 seconds of history ending at currentCpu/currentGpu with gentle organic variance
  const [data, setData] = useState<TelemetryDataPoint[]>(() => {
    const initialPoints: TelemetryDataPoint[] = [];
    const now = Date.now();
    for (let i = maxPoints - 1; i >= 0; i--) {
      const timeOffset = now - i * 1000;
      const d = new Date(timeOffset);
      const timeStr = `${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
      
      // Gentle curve leading into current readings
      const factor = (maxPoints - i) / maxPoints;
      const cpuJitter = Math.sin(i * 0.3) * 6 + (Math.random() - 0.5) * 4;
      const gpuJitter = Math.cos(i * 0.25) * 7 + (Math.random() - 0.5) * 4;

      const cpu = Math.min(100, Math.max(5, Math.round(currentCpu + cpuJitter * (1 - factor * 0.4))));
      const gpu = Math.min(100, Math.max(5, Math.round(currentGpu + gpuJitter * (1 - factor * 0.4))));

      initialPoints.push({
        time: timeStr,
        secondsAgo: i,
        cpu: i === 0 ? currentCpu : cpu,
        gpu: i === 0 ? currentGpu : gpu
      });
    }
    return initialPoints;
  });

  const lastLoggedSecRef = useRef<number>(Math.floor(Date.now() / 1000));

  // Push new telemetry points every second
  useEffect(() => {
    const interval = window.setInterval(() => {
      const currentSec = Math.floor(Date.now() / 1000);
      if (currentSec === lastLoggedSecRef.current) return;
      lastLoggedSecRef.current = currentSec;

      const d = new Date();
      const timeStr = `${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;

      setData(prev => {
        const next = [
          ...prev.slice(1),
          {
            time: timeStr,
            secondsAgo: 0,
            cpu: Math.min(100, Math.max(0, Math.round(currentCpu))),
            gpu: Math.min(100, Math.max(0, Math.round(currentGpu)))
          }
        ];
        return next;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [currentCpu, currentGpu]);

  // Compute peak & average over the 60s window
  const stats = React.useMemo(() => {
    if (data.length === 0) return { avgCpu: 0, avgGpu: 0, peakCpu: 0, peakGpu: 0 };
    let sumCpu = 0;
    let sumGpu = 0;
    let peakCpu = 0;
    let peakGpu = 0;
    for (const point of data) {
      sumCpu += point.cpu;
      sumGpu += point.gpu;
      if (point.cpu > peakCpu) peakCpu = point.cpu;
      if (point.gpu > peakGpu) peakGpu = point.gpu;
    }
    return {
      avgCpu: Math.round(sumCpu / data.length),
      avgGpu: Math.round(sumGpu / data.length),
      peakCpu,
      peakGpu
    };
  }, [data]);

  return (
    <div className="glass-panel rounded-xl p-3.5 border border-slate-800 mb-4 bg-slate-900/40">
      {/* Chart Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-bold text-slate-200 uppercase tracking-wide">
            Telemetry History (Last 60 Seconds)
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        </div>

        {/* Live Legend with Current & Peak Readings */}
        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-cyan-950/40 border border-cyan-500/30 text-cyan-300">
            <Cpu className="w-3 h-3 text-cyan-400" />
            <span className="font-semibold">CPU:</span>
            <span>{currentCpu}%</span>
            <span className="text-[10px] text-cyan-400/70 hidden md:inline">(Peak: {stats.peakCpu}%)</span>
          </div>

          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-violet-950/40 border border-violet-500/30 text-violet-300">
            <Zap className="w-3 h-3 text-violet-400" />
            <span className="font-semibold">GPU:</span>
            <span>{currentGpu}%</span>
            <span className="text-[10px] text-violet-400/70 hidden md:inline">(Peak: {stats.peakGpu}%)</span>
          </div>
        </div>
      </div>

      {/* Recharts Line Graph Container */}
      <div className="w-full h-40 font-mono text-xs">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="cpuGlow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.8} />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="gpuGlow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#a855f7" stopOpacity={0.8} />
                <stop offset="100%" stopColor="#a855f7" stopOpacity={0.1} />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#1e293b"
              vertical={false}
            />

            <XAxis
              dataKey="time"
              stroke="#64748b"
              fontSize={10}
              tickLine={false}
              interval={14}
            />

            <YAxis
              domain={[0, 100]}
              stroke="#64748b"
              fontSize={10}
              tickLine={false}
              tickFormatter={(v) => `${v}%`}
              ticks={[0, 25, 50, 75, 100]}
            />

            <Tooltip content={<CustomTooltip />} />

            <Line
              type="monotone"
              dataKey="cpu"
              name="CPU Utilization"
              stroke="#06b6d4"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />

            <Line
              type="monotone"
              dataKey="gpu"
              name="GPU Utilization"
              stroke="#a855f7"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Chart Footer with Average Baseline */}
      <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
          <span>Avg CPU (60s): <strong className="text-slate-200">{stats.avgCpu}%</strong></span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
          <span>Avg GPU (60s): <strong className="text-slate-200">{stats.avgGpu}%</strong></span>
        </span>
        <span className="text-slate-400 hidden sm:inline">1 Hz Sampling Rate</span>
      </div>
    </div>
  );
};
