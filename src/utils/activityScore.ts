import {
  GamepadDevice,
  HostPcDevice,
  P2PPeerDevice,
  SmartTvDevice,
  UniversalDevice,
  WearableDevice
} from '../types/index.js';

export interface DeviceActivityScore {
  score: number;
  highlightReason: string;
  isHighActivity: boolean;
  intensity: 'idle' | 'moderate' | 'high' | 'critical';
}

/**
 * Calculates a dynamic telemetry activity score for any UniversalDevice.
 * Higher scores mean more real-time throughput, user interaction, or hardware load.
 */
export function calculateDeviceActivityScore(device: UniversalDevice): DeviceActivityScore {
  let score = 0;
  let reason = 'Idle';
  let isHighActivity = false;

  // Base connection penalty/reward
  if (device.status === 'connected') {
    score += 50;
  } else if (device.status === 'connecting' || device.status === 'pairing') {
    score += 30;
  } else {
    score += 5; // Disconnected / error
    return {
      score,
      highlightReason: 'Disconnected',
      isHighActivity: false,
      intensity: 'idle'
    };
  }

  switch (device.category) {
    case 'host_pc': {
      const pc = device as HostPcDevice;
      const tel = pc.telemetry;
      const cpuLoad = tel?.cpu?.loadPercent ?? pc.coreLoads?.[0] ?? 20;
      const gpuUtil = tel?.gpu?.utilizationPercent ?? pc.gpuUtilization ?? 15;
      const rxBytes = tel?.network?.rxBytesPerSec ?? pc.networkDownRateBytesPerSec ?? 0;
      const txBytes = tel?.network?.txBytesPerSec ?? pc.networkUpRateBytesPerSec ?? 0;
      const netMBps = Number(((rxBytes + txBytes) / (1024 * 1024)).toFixed(2));

      // Workload calculations
      const cpuPoints = cpuLoad * 1.1; // up to 110 pts
      const gpuPoints = gpuUtil * 0.9; // up to 90 pts
      const netPoints = Math.min(60, netMBps * 12); // up to 60 pts
      const daemonPoints = pc.daemonOnline ? 25 : 10;

      score += cpuPoints + gpuPoints + netPoints + daemonPoints;

      if (cpuLoad > 65 || gpuUtil > 70) {
        reason = `Heavy Load: ${cpuLoad}% CPU • ${gpuUtil}% GPU`;
        isHighActivity = true;
      } else if (netMBps > 2.0) {
        reason = `Network Burst: ${netMBps} MB/s`;
        isHighActivity = true;
      } else if (cpuLoad > 40 || gpuUtil > 35) {
        reason = `Active: ${cpuLoad}% CPU • ${gpuUtil}% GPU`;
      } else {
        reason = `Nominal: ${cpuLoad}% CPU`;
      }
      break;
    }

    case 'gamepad_hid': {
      const gp = device as GamepadDevice;
      const tel = gp.telemetry;
      const isVibrating = tel?.vibratingNow ?? false;
      const axes = tel?.axes || [];
      const buttons = tel?.buttons || [];

      // Check thumbstick deflection
      const leftStickActive = axes.slice(0, 2).some(a => Math.abs(a.value) > 0.08);
      const rightStickActive = axes.slice(2, 4).some(a => Math.abs(a.value) > 0.08);
      const thumbstickActive = leftStickActive || rightStickActive;

      // Check active button presses or triggers
      const pressedButtons = buttons.filter(b => b.pressed || b.value > 0.12);
      const hasButtonPressed = pressedButtons.length > 0;

      if (isVibrating) {
        score += 180;
        reason = 'Haptic Dual-Rumble Active';
        isHighActivity = true;
      } else if (hasButtonPressed && thumbstickActive) {
        score += 150;
        reason = `Gameplay Active (${pressedButtons.length} Inputs)`;
        isHighActivity = true;
      } else if (hasButtonPressed) {
        score += 120;
        reason = `Input Pressed: ${pressedButtons[0]?.name || 'Trigger'}`;
        isHighActivity = true;
      } else if (thumbstickActive) {
        score += 90;
        reason = 'Analog Stick Deflected';
        isHighActivity = true;
      } else {
        score += 20;
        reason = 'Gamepad Connected (Standby)';
      }
      break;
    }

    case 'p2p_peer': {
      const p2p = device as P2PPeerDevice;
      const tel = p2p.telemetry;
      const transfers = tel?.activeTransfers || [];
      const activeTransfer = transfers.find(t => t.status === 'transferring');
      const recentClips = tel?.clipboardHistory || [];
      const recentClip = recentClips[0];
      const isRecentClip = recentClip && Date.now() - recentClip.timestamp < 35000;

      if (activeTransfer) {
        const speedMBps = activeTransfer.speedMBps || Number((activeTransfer.speedBytesPerSec / (1024 * 1024)).toFixed(1));
        score += 190 + Math.min(50, speedMBps * 6);
        reason = `Transferring ${activeTransfer.name} (${activeTransfer.progressPercent}%) • ${speedMBps} MB/s`;
        isHighActivity = true;
      } else if (isRecentClip) {
        score += 130;
        reason = `Clipboard Sync Broadcast`;
        isHighActivity = true;
      } else if (tel?.dataChannelState === 'open') {
        score += 45;
        reason = `P2P DataChannel Open (${tel.latencyRttMs || 8}ms RTT)`;
      } else {
        score += 15;
        reason = 'P2P Ready';
      }
      break;
    }

    case 'smart_tv': {
      const tv = device as SmartTvDevice;
      const tel = tv.telemetry;
      const isPowerOn = tel?.powerState === 'on';
      const currentApp = tel?.currentApp;
      const isStreaming = isPowerOn && currentApp && currentApp !== 'Home Screen';

      if (isStreaming) {
        score += 140;
        reason = `Streaming: ${currentApp} (${tv.currentVolumeLevel ?? tel?.volume ?? 26}% Vol)`;
        isHighActivity = true;
      } else if (isPowerOn) {
        score += 90;
        reason = `TV Active (${tel?.activeInput || 'HDMI 1'})`;
      } else {
        score += 10;
        reason = 'TV in Standby Mode';
      }
      break;
    }

    case 'bluetooth_peripheral': {
      const bt = device as WearableDevice;
      const tel = bt.telemetry;
      const isCharging = tel?.isCharging;
      const ancMode = bt.ancMode || tel?.ancMode || 'off';
      const rssi = bt.rssiSignalStrengthDbm || tel?.rssiSignalDbm || -50;

      if (isCharging) {
        score += 80;
        reason = `Charging (${tel?.batteryLevel || 88}%)`;
      } else if (ancMode !== 'off') {
        score += 75;
        reason = `ANC ${ancMode.toUpperCase()} Active (${rssi} dBm)`;
      } else {
        score += 35;
        reason = `Connected (${tel?.batteryLevel || 85}% Battery)`;
      }
      break;
    }
  }

  let intensity: 'idle' | 'moderate' | 'high' | 'critical' = 'idle';
  if (score >= 170) intensity = 'critical';
  else if (score >= 120) intensity = 'high';
  else if (score >= 70) intensity = 'moderate';

  return {
    score: Math.round(score),
    highlightReason: reason,
    isHighActivity,
    intensity
  };
}
