import React, { useMemo, useState } from 'react';
import {
  AncMode,
  BluetoothPeripheralDevice,
  DeviceCategory,
  GamepadHidDevice,
  HostPcDevice,
  P2PPeerDevice,
  RumbleTestRequest,
  SmartTvCommandRequest,
  SmartTvDevice,
  UniversalDevice
} from '../types/index.js';
import { HostPcCard } from './HostPcCard.js';
import { BluetoothCard } from './BluetoothCard.js';
import { GamepadCard } from './GamepadCard.js';
import { SmartTvCard } from './SmartTvCard.js';
import { P2PSyncCard } from './P2PSyncCard.js';
import { calculateDeviceActivityScore } from '../utils/activityScore.js';
import { soundFx } from '../services/audioFeedback.js';
import {
  ArrowUpDown,
  Flame,
  LayoutGrid,
  Zap,
  Activity,
  CheckCircle2,
  Search,
  Command
} from 'lucide-react';

export type SortMode = 'activity' | 'standard' | 'status';

interface BentoGridProps {
  devices: UniversalDevice[];
  activeFilter: DeviceCategory | 'all';
  isLiveDaemon: boolean;
  onOpenDaemonModal: () => void;
  onSetAncMode: (mode: AncMode) => void;
  onScanBluetooth: () => void;
  onTriggerRumble: (request: RumbleTestRequest) => void;
  onScanGamepads: () => void;
  onSendSmartTvCommand: (request: SmartTvCommandRequest) => void;
  onSendP2PFile: (file: File) => void;
  onBroadcastClipboard: (text: string) => void;
  onSimulateP2PFile?: () => void;
  onOpenActivityModal?: () => void;
  initialAutoSort?: boolean;
  onOpenSearch?: () => void;
}

export const BentoGrid: React.FC<BentoGridProps> = ({
  devices,
  activeFilter,
  isLiveDaemon,
  onOpenDaemonModal,
  onSetAncMode,
  onScanBluetooth,
  onTriggerRumble,
  onScanGamepads,
  onSendSmartTvCommand,
  onSendP2PFile,
  onBroadcastClipboard,
  onSimulateP2PFile,
  onOpenActivityModal,
  initialAutoSort = true,
  onOpenSearch
}) => {
  const [autoSort, setAutoSort] = useState(initialAutoSort);
  const [sortMode, setSortMode] = useState<SortMode>('activity');

  // Compute activity scores for all devices
  const scoredDevices = useMemo(() => {
    return devices.map(device => ({
      device,
      activity: calculateDeviceActivityScore(device)
    }));
  }, [devices]);

  // Identify the highest activity device
  const topActiveDevice = useMemo(() => {
    if (scoredDevices.length === 0) return null;
    return [...scoredDevices].sort((a, b) => b.activity.score - a.activity.score)[0];
  }, [scoredDevices]);

  // Process devices according to active filter and current sortMode
  const sortedDevices = useMemo(() => {
    const filtered = scoredDevices.filter(
      item => activeFilter === 'all' || activeFilter === item.device.category
    );

    if (!autoSort || sortMode === 'standard') {
      const defaultOrder: Record<DeviceCategory, number> = {
        host_pc: 1,
        bluetooth_peripheral: 2,
        gamepad_hid: 3,
        smart_tv: 4,
        p2p_peer: 5
      };
      return [...filtered].sort(
        (a, b) => (defaultOrder[a.device.category] || 99) - (defaultOrder[b.device.category] || 99)
      );
    }

    if (sortMode === 'status') {
      const statusWeight: Record<string, number> = {
        connected: 1,
        pairing: 2,
        connecting: 3,
        idle: 4,
        disconnected: 5,
        error: 6
      };
      return [...filtered].sort(
        (a, b) => (statusWeight[a.device.status] || 99) - (statusWeight[b.device.status] || 99)
      );
    }

    // Default 'activity' sort: highest score first
    return [...filtered].sort((a, b) => b.activity.score - a.activity.score);
  }, [scoredDevices, activeFilter, autoSort, sortMode]);

  const handleToggleAutoSort = () => {
    soundFx.playClick(autoSort ? 450 : 750);
    setAutoSort(!autoSort);
  };

  const handleSelectSortMode = (mode: SortMode) => {
    soundFx.playClick(680);
    setSortMode(mode);
    if (!autoSort && mode === 'activity') {
      setAutoSort(true);
    }
  };

  return (
    <div className="space-y-4">
      {/* Auto-Sort Control & Activity Highlights Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 px-4 rounded-xl glass-panel border border-slate-800/80 bg-slate-900/60 shadow-lg">
        {/* Left: Auto-Sort Switch & Top Device Indicator */}
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={handleToggleAutoSort}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
              autoSort
                ? 'bg-gradient-to-r from-cyan-500/20 to-emerald-500/20 text-cyan-300 border-cyan-500/40 shadow-glow-cyan'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
            title={autoSort ? 'Auto-Sort is actively reordering devices' : 'Click to enable Auto-Sort'}
          >
            <Zap className={`w-3.5 h-3.5 ${autoSort ? 'text-cyan-400 animate-pulse fill-cyan-400/20' : 'text-slate-500'}`} />
            <span>Auto-Sort: {autoSort ? 'ACTIVE' : 'OFF'}</span>
          </button>

          {autoSort && topActiveDevice && (
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="text-slate-400 hidden md:inline">Top Priority:</span>
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-300">
                <Flame className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <strong className="font-bold truncate max-w-[140px] sm:max-w-[200px]">
                  {topActiveDevice.device.name}
                </strong>
                <span className="opacity-80 text-[11px] hidden lg:inline">
                  ({topActiveDevice.activity.highlightReason})
                </span>
              </span>
            </div>
          )}
        </div>

        {/* Right: Sort Strategy Switcher & Search Button */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          {onOpenSearch && (
            <button
              onClick={onOpenSearch}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-950/80 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/40 text-xs font-mono text-slate-300 hover:text-cyan-300 transition-all shadow-sm"
              title="Search Devices (Cmd/Ctrl + K)"
            >
              <Search className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Search</span>
              <kbd className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded text-[10px] bg-slate-800 border border-slate-700 text-cyan-300 font-mono">
                <Command className="w-2.5 h-2.5" />K
              </kbd>
            </button>
          )}

          <div className="flex items-center p-1 rounded-lg bg-slate-950/80 border border-slate-800 text-xs font-mono">
            <button
              onClick={() => handleSelectSortMode('activity')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all ${
                sortMode === 'activity' && autoSort
                  ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Prioritize devices with highest live telemetry, workload, or input activity"
            >
              <Activity className="w-3 h-3 text-cyan-400" />
              <span>Telemetry</span>
            </button>
            <button
              onClick={() => handleSelectSortMode('status')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all ${
                sortMode === 'status'
                  ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Sort by connection state (Connected first)"
            >
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>Status</span>
            </button>
            <button
              onClick={() => handleSelectSortMode('standard')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all ${
                sortMode === 'standard' || !autoSort
                  ? 'bg-slate-800 text-slate-200 font-bold border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Fixed workstation layout (Host Rig -> Peripherals -> TV -> P2P)"
            >
              <LayoutGrid className="w-3 h-3 text-slate-400" />
              <span>Default</span>
            </button>
          </div>
        </div>
      </div>

      {/* Dynamic Asymmetric Bento Grid (dense packing for seamless multi-column flow) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5 grid-flow-dense">
        {sortedDevices.map(({ device, activity }, index) => {
          const rank = index + 1;
          const isSorted = autoSort && sortMode === 'activity';

          switch (device.category) {
            case 'host_pc':
              return (
                <HostPcCard
                  key={device.id}
                  device={device as HostPcDevice}
                  isLiveDaemon={isLiveDaemon}
                  onOpenDaemonModal={onOpenDaemonModal}
                  activityRank={rank}
                  activityReason={activity.highlightReason}
                  isAutoSorted={isSorted}
                />
              );

            case 'bluetooth_peripheral':
              return (
                <BluetoothCard
                  key={device.id}
                  device={device as BluetoothPeripheralDevice}
                  onSetAncMode={onSetAncMode}
                  onScanBluetooth={onScanBluetooth}
                  activityRank={rank}
                  activityReason={activity.highlightReason}
                  isAutoSorted={isSorted}
                />
              );

            case 'gamepad_hid':
              return (
                <GamepadCard
                  key={device.id}
                  device={device as GamepadHidDevice}
                  onTriggerRumble={onTriggerRumble}
                  onScanGamepads={onScanGamepads}
                  activityRank={rank}
                  activityReason={activity.highlightReason}
                  isAutoSorted={isSorted}
                />
              );

            case 'smart_tv':
              return (
                <SmartTvCard
                  key={device.id}
                  device={device as SmartTvDevice}
                  onSendCommand={onSendSmartTvCommand}
                  activityRank={rank}
                  activityReason={activity.highlightReason}
                  isAutoSorted={isSorted}
                />
              );

            case 'p2p_peer':
              return (
                <P2PSyncCard
                  key={device.id}
                  device={device as P2PPeerDevice}
                  onSendFile={onSendP2PFile}
                  onBroadcastClipboard={onBroadcastClipboard}
                  onSimulateIncomingFile={onSimulateP2PFile}
                  onOpenActivityModal={onOpenActivityModal}
                  activityRank={rank}
                  activityReason={activity.highlightReason}
                  isAutoSorted={isSorted}
                />
              );

            default:
              return null;
          }
        })}
      </div>
    </div>
  );
};
