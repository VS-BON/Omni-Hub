/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import {
  AncMode,
  DeviceCategory,
  P2PPeerDevice,
  RumbleTestRequest,
  SmartTvCommandRequest,
  UniversalDevice
} from './types/index.js';
import { deviceManager } from './services/deviceManager.js';
import { Header } from './components/Header.js';
import { BentoGrid } from './components/BentoGrid.js';
import { DaemonInstructionModal } from './components/DaemonInstructionModal.js';
import { DeviceSearchOverlay } from './components/DeviceSearchOverlay.js';
import { ActivityModal } from './components/ActivityModal.js';
import { QuickActionsSidebar } from './components/QuickActionsSidebar.js';
import {
  ShieldCheck,
  Zap,
  Globe,
  Radio,
  Cpu,
  RefreshCw,
  Terminal,
  Search,
  Command,
  Activity,
  Sparkles
} from 'lucide-react';

export default function App() {
  const [devices, setDevices] = useState<UniversalDevice[]>([]);
  const [activeFilter, setActiveFilter] = useState<DeviceCategory | 'all'>('all');
  const [isDaemonModalOpen, setIsDaemonModalOpen] = useState(false);
  const [isSearchOverlayOpen, setIsSearchOverlayOpen] = useState(false);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(false);
  const [isLiveDaemon, setIsLiveDaemon] = useState(false);
  const [latencyMs, setLatencyMs] = useState(1);
  const [isSimulated, setIsSimulated] = useState(true);
  const [currentWsUrl, setCurrentWsUrl] = useState(
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_DAEMON_URL) || 'ws://localhost:8080'
  );

  const p2pDevice = devices.find((d) => d.category === 'p2p_peer') as P2PPeerDevice | undefined;
  const activityEventCount =
    (p2pDevice?.telemetry?.activeTransfers?.length || 0) +
    (p2pDevice?.telemetry?.clipboardHistory?.length || 0);

  useEffect(() => {
    // Global Cmd/Ctrl + K (Search) and Cmd/Ctrl + J (Quick Actions) shortcuts
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOverlayOpen((prev) => !prev);
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        setIsQuickActionsOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  useEffect(() => {
    // Subscribe to unified device manager updates
    const unsubscribe = deviceManager.subscribe((updatedDevices) => {
      setDevices([...updatedDevices]);
      setIsLiveDaemon(deviceManager.getIsLiveDaemon());
      setLatencyMs(deviceManager.getLatency());
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleToggleSimulated = (simulated: boolean) => {
    setIsSimulated(simulated);
    deviceManager.toggleDaemonSimulation(simulated);
  };

  const handleUpdateWsUrl = (newUrl: string) => {
    setCurrentWsUrl(newUrl);
    setIsSimulated(false);
    deviceManager.retryDaemonConnection(newUrl);
  };

  const handleSelectDeviceFromSearch = (device: UniversalDevice) => {
    // If the device's category is filtered out, switch filter to 'all' so it is visible in the grid
    if (activeFilter !== 'all' && activeFilter !== device.category) {
      setActiveFilter('all');
    }

    // Smoothly scroll to the target device card and apply highlight pulse
    setTimeout(() => {
      const element = document.getElementById(`device-card-${device.id}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.classList.add('ring-4', 'ring-cyan-400', 'shadow-glow-cyan');
        setTimeout(() => {
          element.classList.remove('ring-4', 'ring-cyan-400', 'shadow-glow-cyan');
        }, 2200);
      }
    }, 120);
  };

  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-slate-100 flex flex-col justify-between transition-colors duration-300">
      <div>
        {/* Navigation & Status Header */}
        <Header
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          isLiveDaemon={isLiveDaemon}
          daemonLatencyMs={latencyMs}
          onOpenDaemonModal={() => setIsDaemonModalOpen(true)}
          deviceCount={devices.length}
          isSimulated={isSimulated}
          onToggleSimulated={handleToggleSimulated}
          onOpenSearch={() => setIsSearchOverlayOpen(true)}
          onOpenActivityModal={() => setIsActivityModalOpen(true)}
          activityEventCount={activityEventCount}
          onOpenQuickActions={() => setIsQuickActionsOpen(true)}
        />

        {/* Main Content Area */}
        <main className="max-w-7xl mx-auto px-4 lg:px-8 pb-12">
          {/* Quick Hub Hero Banner / Notice */}
          <div className="mb-6 p-4 rounded-2xl glass-panel border border-slate-800/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-glow-cyan shrink-0">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-sm md:text-base font-bold text-white flex items-center gap-2">
                  Unified Hardware Mesh Active
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </h1>
                <p className="text-xs text-slate-400">
                  Managing {devices.length} connected hardware nodes across WebSocket daemon, WebBluetooth, WebHID, and WebRTC protocols.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 w-full md:w-auto justify-between md:justify-end flex-wrap">
              {/* Quick Search Shortcut Pill */}
              <button
                onClick={() => setIsSearchOverlayOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-xs font-mono text-slate-300 hover:text-cyan-300 hover:border-cyan-500/40 transition-all shadow-sm group"
                title="Open Hardware Search (Cmd/Ctrl + K)"
              >
                <Search className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
                <span>Search Mesh</span>
                <kbd className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] bg-slate-800 border border-slate-700 text-cyan-300 font-mono">
                  <Command className="w-2.5 h-2.5" />K
                </kbd>
              </button>

              {/* Quick Actions Sidebar Trigger */}
              <button
                onClick={() => setIsQuickActionsOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 hover:border-amber-400 text-xs font-mono text-amber-300 transition-all shadow-glow-amber group"
                title="Open Quick Actions Sidebar (Cmd/Ctrl + J)"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
                <span>Quick Actions</span>
                <kbd className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] bg-slate-900 border border-amber-500/30 text-amber-300 font-mono">
                  <Command className="w-2.5 h-2.5" />J
                </kbd>
              </button>

              {/* Activity Log Quick Shortcut */}
              <button
                onClick={() => setIsActivityModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-mono text-cyan-300 hover:border-cyan-500/40 transition-colors"
                title="View File Transfers and Clipboard Activity History Log"
              >
                <Activity className="w-3.5 h-3.5 text-cyan-400" />
                <span>Activity ({activityEventCount})</span>
              </button>

              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Zero-Cloud Local Only</span>
              </div>

              <button
                onClick={() => setIsDaemonModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-mono text-cyan-300 hover:border-cyan-500/40 transition-colors"
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>Daemon Setup</span>
              </button>
            </div>
          </div>

          {/* Asymmetric Bento Grid of Devices */}
          <BentoGrid
            devices={devices}
            activeFilter={activeFilter}
            isLiveDaemon={isLiveDaemon}
            onOpenDaemonModal={() => setIsDaemonModalOpen(true)}
            onSetAncMode={(mode: AncMode) => deviceManager.setBluetoothAncMode(mode)}
            onScanBluetooth={() => deviceManager.scanBluetoothDevices()}
            onTriggerRumble={(req: RumbleTestRequest) => deviceManager.triggerGamepadRumble(req)}
            onScanGamepads={() => deviceManager.scanGamepads()}
            onSendSmartTvCommand={(cmd: SmartTvCommandRequest) => deviceManager.sendSmartTvCommand(cmd)}
            onSendP2PFile={(file: File) => deviceManager.sendP2PFile(file)}
            onBroadcastClipboard={(text: string) => deviceManager.broadcastClipboard(text)}
            onSimulateP2PFile={() => deviceManager.simulateP2PIncomingFile()}
            onOpenActivityModal={() => setIsActivityModalOpen(true)}
            onOpenSearch={() => setIsSearchOverlayOpen(true)}
          />
        </main>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 glass-panel py-6 px-4 lg:px-8 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-400">OmniHub</span>
            <span>• Cross-Platform Hardware Control & Telemetry</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 text-slate-400">
              <Zap className="w-3 h-3 text-cyan-400" /> WebSockets (9123 & 8001)
            </span>
            <span className="flex items-center gap-1 text-slate-400">
              <Radio className="w-3 h-3 text-violet-400" /> WebBluetooth GATT
            </span>
            <span className="flex items-center gap-1 text-slate-400">
              <Cpu className="w-3 h-3 text-emerald-400" /> WebHID Gamepads
            </span>
          </div>
        </div>
      </footer>

      {/* Daemon Setup & Settings Modal */}
      <DaemonInstructionModal
        isOpen={isDaemonModalOpen}
        onClose={() => setIsDaemonModalOpen(false)}
        currentWsUrl={currentWsUrl}
        onUpdateWsUrl={handleUpdateWsUrl}
        isLiveDaemon={isLiveDaemon}
        isSimulated={isSimulated}
        onToggleSimulated={handleToggleSimulated}
      />

      {/* Global Cmd/Ctrl + K Hardware Search Overlay */}
      <DeviceSearchOverlay
        isOpen={isSearchOverlayOpen}
        onClose={() => setIsSearchOverlayOpen(false)}
        devices={devices}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        onSelectDevice={handleSelectDeviceFromSearch}
        onOpenDaemonModal={() => setIsDaemonModalOpen(true)}
        onScanBluetooth={() => deviceManager.scanBluetoothDevices()}
        onScanGamepads={() => deviceManager.scanGamepads()}
      />

      {/* P2P File Transfers & Clipboard Sync Activity Modal */}
      <ActivityModal
        isOpen={isActivityModalOpen}
        onClose={() => setIsActivityModalOpen(false)}
        p2pDevice={p2pDevice}
        onSimulateFile={() => deviceManager.simulateP2PIncomingFile()}
        onSimulateClipboard={(text) => deviceManager.broadcastClipboard(text)}
      />

      {/* Quick Actions Sidebar for Hardware Daemon RPC */}
      <QuickActionsSidebar
        isOpen={isQuickActionsOpen}
        onClose={() => setIsQuickActionsOpen(false)}
        onExecuteAction={(action, params) => deviceManager.executeDaemonAction(action, params)}
        daemonOnline={isLiveDaemon}
        latencyMs={latencyMs}
      />
    </div>
  );
}
