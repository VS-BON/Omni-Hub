import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  ArrowRight,
  Command,
  Cpu,
  Gamepad2,
  Headphones,
  Radio,
  Search,
  Server,
  Share2,
  Tv,
  X,
  Zap,
  Terminal,
  Volume2
} from 'lucide-react';
import { DeviceCategory, UniversalDevice, HostPcDevice, WearableDevice, GamepadDevice, SmartTvDevice, P2PPeerDevice } from '../types/index.js';
import { soundFx } from '../services/audioFeedback.js';

interface DeviceSearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  devices: UniversalDevice[];
  activeFilter: DeviceCategory | 'all';
  onFilterChange: (filter: DeviceCategory | 'all') => void;
  onSelectDevice: (device: UniversalDevice) => void;
  onOpenDaemonModal?: () => void;
  onScanBluetooth?: () => void;
  onScanGamepads?: () => void;
}

const CATEGORY_MAP: Record<DeviceCategory, { label: string; icon: React.ReactNode; color: string }> = {
  host_pc: { label: 'Host Rig', icon: <Cpu className="w-4 h-4 text-cyan-400" />, color: 'text-cyan-400 border-cyan-500/30 bg-cyan-950/30' },
  bluetooth_peripheral: { label: 'Audio / BT', icon: <Headphones className="w-4 h-4 text-violet-400" />, color: 'text-violet-400 border-violet-500/30 bg-violet-950/30' },
  gamepad_hid: { label: 'WebHID Gamepad', icon: <Gamepad2 className="w-4 h-4 text-emerald-400" />, color: 'text-emerald-400 border-emerald-500/30 bg-emerald-950/30' },
  smart_tv: { label: 'Smart TV', icon: <Tv className="w-4 h-4 text-amber-400" />, color: 'text-amber-400 border-amber-500/30 bg-amber-950/30' },
  p2p_peer: { label: 'P2P WebRTC', icon: <Share2 className="w-4 h-4 text-cyan-400" />, color: 'text-cyan-400 border-cyan-500/30 bg-cyan-950/30' },
};

function getDeviceTelemetrySummary(device: UniversalDevice): string {
  switch (device.category) {
    case 'host_pc': {
      const pc = device as HostPcDevice;
      const cpu = pc.telemetry?.cpu?.loadPercent ?? pc.coreLoads?.[0] ?? 24;
      const gpu = pc.telemetry?.gpu?.utilizationPercent ?? pc.gpuUtilization ?? 20;
      return `${cpu}% CPU • ${gpu}% GPU • ${pc.telemetry?.system?.hostname || 'OmniRig'}`;
    }
    case 'bluetooth_peripheral': {
      const bt = device as WearableDevice;
      const batt = bt.telemetry?.batteryLevel ?? 85;
      const anc = bt.ancMode || bt.telemetry?.ancMode || 'off';
      return `${batt}% Batt • ANC: ${anc.toUpperCase()} • ${bt.telemetry?.codec || 'AAC / LDAC'}`;
    }
    case 'gamepad_hid': {
      const gp = device as GamepadDevice;
      return `${gp.telemetry?.buttons?.length || 17} Buttons • Dual Motors • ${gp.telemetry?.vendorId || '0x045E'}`;
    }
    case 'smart_tv': {
      const tv = device as SmartTvDevice;
      const app = tv.telemetry?.currentApp || 'Home Screen';
      const vol = tv.currentVolumeLevel ?? tv.telemetry?.volume ?? 24;
      return `${tv.telemetry?.brand || 'OLED 4K'} • App: ${app} • Vol: ${vol}%`;
    }
    case 'p2p_peer': {
      const p2p = device as P2PPeerDevice;
      const state = p2p.telemetry?.dataChannelState || 'open';
      const rtt = p2p.telemetry?.latencyRttMs || 8;
      return `Channel: ${state} • ${rtt}ms RTT • End-to-End Encrypted`;
    }
    default:
      return (device as UniversalDevice).status;
  }
}

export const DeviceSearchOverlay: React.FC<DeviceSearchOverlayProps> = ({
  isOpen,
  onClose,
  devices,
  activeFilter,
  onFilterChange,
  onSelectDevice,
  onOpenDaemonModal,
  onScanBluetooth,
  onScanGamepads
}) => {
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<DeviceCategory | 'all'>('all');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      soundFx.playClick(850);
      setQuery('');
      setCategoryFilter('all');
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Filter devices based on query and category
  const filteredDevices = useMemo(() => {
    const q = query.trim().toLowerCase();
    return devices.filter(device => {
      // Category filter
      if (categoryFilter !== 'all' && device.category !== categoryFilter) {
        return false;
      }
      if (!q) return true;

      // Search matching attributes
      const nameMatch = device.name.toLowerCase().includes(q);
      const catMatch = device.category.toLowerCase().includes(q) ||
        (CATEGORY_MAP[device.category]?.label.toLowerCase().includes(q));
      const connMatch = device.connectionType.toLowerCase().includes(q);
      const idMatch = device.id.toLowerCase().includes(q);

      // Deep telemetry search
      let telMatch = false;
      if (device.category === 'host_pc') {
        const pc = device as HostPcDevice;
        telMatch = (pc.telemetry?.system?.hostname || '').toLowerCase().includes(q) ||
                   (pc.telemetry?.cpu?.model || '').toLowerCase().includes(q) ||
                   (pc.telemetry?.gpu?.model || '').toLowerCase().includes(q) ||
                   (pc.telemetry?.system?.distro || '').toLowerCase().includes(q);
      } else if (device.category === 'smart_tv') {
        const tv = device as SmartTvDevice;
        telMatch = (tv.telemetry?.brand || '').toLowerCase().includes(q) ||
                   (tv.telemetry?.currentApp || '').toLowerCase().includes(q) ||
                   (tv.telemetry?.ipAddress || '').toLowerCase().includes(q);
      } else if (device.category === 'bluetooth_peripheral') {
        const bt = device as WearableDevice;
        telMatch = (bt.telemetry?.codec || '').toLowerCase().includes(q);
      }

      return nameMatch || catMatch || connMatch || idMatch || telMatch;
    });
  }, [devices, query, categoryFilter]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: devices.length };
    for (const d of devices) {
      counts[d.category] = (counts[d.category] || 0) + 1;
    }
    return counts;
  }, [devices]);

  // Reset selected index when filtered list changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredDevices]);

  // Keyboard navigation inside modal
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (filteredDevices.length > 0 ? (prev + 1) % filteredDevices.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (filteredDevices.length > 0 ? (prev - 1 + filteredDevices.length) % filteredDevices.length : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredDevices[selectedIndex]) {
        handlePickDevice(filteredDevices[selectedIndex]);
      }
    }
  };

  // Scroll active item into view
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.querySelector(`[data-index="${selectedIndex}"]`) as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  const handlePickDevice = (device: UniversalDevice) => {
    soundFx.playClick(650);
    onSelectDevice(device);
    onClose();
  };

  const handleSelectCategoryPill = (cat: DeviceCategory | 'all') => {
    soundFx.playClick(720);
    setCategoryFilter(cat);
  };

  const handleApplyGlobalFilter = (cat: DeviceCategory | 'all') => {
    soundFx.playClick(600);
    onFilterChange(cat);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
      onKeyDown={handleKeyDown}
    >
      <div
        className="relative w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-700/80 shadow-2xl overflow-hidden glass-card transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-800 bg-slate-950/50">
          <Search className="w-5 h-5 text-cyan-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search devices by name, category, CPU, GPU, IP, or protocol..."
            className="flex-1 bg-transparent text-sm md:text-base text-slate-100 placeholder-slate-500 focus:outline-none font-sans"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono bg-slate-800 text-slate-400 border border-slate-700">
            ESC to close
          </kbd>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-slate-800/80 overflow-x-auto bg-slate-900/60 text-xs font-medium">
          <span className="text-slate-400 shrink-0 mr-1 font-mono text-[11px]">Filter:</span>
          <button
            onClick={() => handleSelectCategoryPill('all')}
            className={`px-2.5 py-1 rounded-lg transition-all shrink-0 ${
              categoryFilter === 'all'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            All ({categoryCounts.all || 0})
          </button>
          {(['host_pc', 'bluetooth_peripheral', 'gamepad_hid', 'smart_tv', 'p2p_peer'] as DeviceCategory[]).map((cat) => {
            const info = CATEGORY_MAP[cat];
            const active = categoryFilter === cat;
            return (
              <button
                key={cat}
                onClick={() => handleSelectCategoryPill(cat)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all shrink-0 ${
                  active
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                {info.icon}
                <span>{info.label} ({categoryCounts[cat] || 0})</span>
              </button>
            );
          })}
        </div>

        {/* Results List */}
        <div
          ref={listRef}
          className="max-h-80 overflow-y-auto p-2 space-y-1 divide-y divide-slate-800/40"
        >
          {filteredDevices.length > 0 ? (
            filteredDevices.map((device, idx) => {
              const catInfo = CATEGORY_MAP[device.category];
              const isSelected = idx === selectedIndex;
              const summary = getDeviceTelemetrySummary(device);

              return (
                <div
                  key={device.id}
                  data-index={idx}
                  onClick={() => handlePickDevice(device)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-cyan-500/10 border border-cyan-500/40 shadow-glow-cyan/50 text-white'
                      : 'hover:bg-slate-800/50 border border-transparent text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`p-2.5 rounded-xl border shrink-0 transition-transform group-hover:scale-105 ${
                        isSelected ? 'bg-cyan-500/20 border-cyan-400/50 shadow-glow-cyan' : catInfo?.color || 'bg-slate-800 border-slate-700'
                      }`}
                    >
                      {catInfo?.icon || <Activity className="w-4 h-4 text-cyan-400" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-100 truncate">
                          {device.name}
                        </span>
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${
                            device.status === 'connected'
                              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}
                        >
                          {device.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 font-mono truncate mt-0.5">
                        {summary}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">
                      {catInfo?.label}
                    </span>
                    <ArrowRight
                      className={`w-4 h-4 transition-transform ${
                        isSelected ? 'text-cyan-400 translate-x-0.5' : 'text-slate-600'
                      }`}
                    />
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-slate-400">
              <Search className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-medium">No matching hardware devices found</p>
              <p className="text-xs text-slate-500 mt-1">
                Try searching by hostname, GPU model, or reset the category filter.
              </p>
            </div>
          )}
        </div>

        {/* Quick Actions & Navigation Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/70 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-mono text-slate-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">↑↓</kbd>
              <span>Navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">↵</kbd>
              <span>Scroll to Device</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">ESC</kbd>
              <span>Dismiss</span>
            </span>
          </div>

          {/* Quick Category Action */}
          {categoryFilter !== 'all' && (
            <button
              onClick={() => handleApplyGlobalFilter(categoryFilter)}
              className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2 flex items-center gap-1"
            >
              <span>Filter Bento Grid by {CATEGORY_MAP[categoryFilter]?.label}</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
