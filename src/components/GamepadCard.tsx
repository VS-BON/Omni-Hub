import React, { useState } from 'react';
import {
  Gamepad2,
  Vibrate,
  Battery,
  SlidersHorizontal,
  RefreshCw,
  Crosshair,
  Sparkles,
  Zap,
  Radio
} from 'lucide-react';
import { GamepadHidDevice, RumbleTestRequest } from '../types/index.js';
import { soundFx } from '../services/audioFeedback.js';

interface GamepadCardProps {
  device: GamepadHidDevice;
  onTriggerRumble: (request: RumbleTestRequest) => void;
  onScanGamepads: () => void;
  activityRank?: number;
  activityReason?: string;
  isAutoSorted?: boolean;
}

export const GamepadCard: React.FC<GamepadCardProps> = ({
  device,
  onTriggerRumble,
  onScanGamepads,
  activityRank,
  activityReason,
  isAutoSorted
}) => {
  const { telemetry } = device;
  const [duration, setDuration] = useState(500);
  const [strongMotor, setStrongMotor] = useState(0.8);
  const [weakMotor, setWeakMotor] = useState(0.6);

  // Analog stick vectors
  const leftX = device.leftStick?.x ?? telemetry.axes[0]?.value ?? 0;
  const leftY = device.leftStick?.y ?? telemetry.axes[1]?.value ?? 0;
  const rightX = device.rightStick?.x ?? telemetry.axes[2]?.value ?? 0;
  const rightY = device.rightStick?.y ?? telemetry.axes[3]?.value ?? 0;

  // Analog triggers: Button 6 (LT), Button 7 (RT)
  const ltValue = telemetry.buttons[6]?.value ?? 0;
  const rtValue = telemetry.buttons[7]?.value ?? 0;

  // Bumpers: Button 4 (LB), Button 5 (RB)
  const isLbPressed = telemetry.buttons[4]?.pressed ?? false;
  const isRbPressed = telemetry.buttons[5]?.pressed ?? false;

  // Face buttons: 0 (A), 1 (B), 2 (X), 3 (Y)
  const isAPressed = telemetry.buttons[0]?.pressed ?? false;
  const isBPressed = telemetry.buttons[1]?.pressed ?? false;
  const isXPressed = telemetry.buttons[2]?.pressed ?? false;
  const isYPressed = telemetry.buttons[3]?.pressed ?? false;

  // D-Pad: 12 (Up), 13 (Down), 14 (Left), 15 (Right)
  const isDpadUp = telemetry.buttons[12]?.pressed ?? false;
  const isDpadDown = telemetry.buttons[13]?.pressed ?? false;
  const isDpadLeft = telemetry.buttons[14]?.pressed ?? false;
  const isDpadRight = telemetry.buttons[15]?.pressed ?? false;

  // Center buttons: 8 (Select/Back), 9 (Start/Menu), 16 (Home/Guide)
  const isSelectPressed = telemetry.buttons[8]?.pressed ?? false;
  const isStartPressed = telemetry.buttons[9]?.pressed ?? false;
  const isHomePressed = telemetry.buttons[16]?.pressed ?? false;

  const handleRumbleTest = () => {
    soundFx.playRumbleBlip();
    onTriggerRumble({
      deviceId: device.id,
      durationMs: duration,
      strongMagnitude: strongMotor,
      weakMagnitude: weakMotor
    });
  };

  return (
    <div
      id={`device-card-${device.id}`}
      data-device-id={device.id}
      className={`glass-card rounded-2xl p-5 md:p-6 col-span-1 md:col-span-1 lg:col-span-1 relative overflow-hidden flex flex-col justify-between transition-all duration-300 ${
        telemetry.vibratingNow ? 'ring-2 ring-cyan-400 shadow-glow-cyan' : ''
      }`}
    >
      {/* Background ambient glow */}
      <div className="absolute -top-16 -left-16 w-52 h-52 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

      <div>
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div
              className={`p-3 rounded-xl border transition-all ${
                telemetry.vibratingNow
                  ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 animate-pulse'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-glow-emerald'
              }`}
            >
              <Gamepad2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-100 truncate max-w-[155px] sm:max-w-none" title={device.name}>
                {device.name}
              </h3>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <p className="text-[11px] font-mono text-slate-400">
                  WebHID Port #{device.connectedPortIndex ?? telemetry.gamepadIndex} • {telemetry.vendorId || '0x045E'}
                </p>
                {isAutoSorted && activityRank !== undefined && (
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full border ${
                      activityRank === 1
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-glow-amber animate-pulse font-bold'
                        : activityRank === 2
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-semibold'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                    title={`Auto-Sort Priority #${activityRank}: ${activityReason || 'Active Gamepad'}`}
                  >
                    #{activityRank}
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              soundFx.playClick(700);
              onScanGamepads();
            }}
            title="Scan / Pair Gamepads (WebHID & Gamepad API)"
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-cyan-300 border border-slate-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Live Controller Visual Tester (Dual Analog Sticks & Trigger Pressures) */}
        <div className="mb-4 space-y-3">
          {/* Dual Analog Sticks Grid */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* Left Thumbstick Area */}
            <div className="glass-panel rounded-xl p-2.5 border border-slate-800 flex flex-col items-center">
              <div className="flex items-center justify-between w-full text-[10px] text-slate-400 mb-1.5">
                <span className="font-medium flex items-center gap-1">
                  <Crosshair className="w-3 h-3 text-cyan-400" /> Left Stick
                </span>
                <span className="font-mono text-slate-300">
                  {leftX.toFixed(2)}, {leftY.toFixed(2)}
                </span>
              </div>

              {/* 2D Circular Stick Boundary */}
              <div className="relative w-18 h-18 rounded-full border border-slate-700 bg-slate-900/90 flex items-center justify-center overflow-hidden shadow-inner">
                <div className="absolute w-full h-[1px] bg-slate-800" />
                <div className="absolute h-full w-[1px] bg-slate-800" />
                <div className="absolute w-2.5 h-2.5 rounded-full border border-slate-600/40" />

                {/* Moving Stick Disc */}
                <div
                  className="w-5 h-5 rounded-full bg-gradient-to-br from-cyan-400 to-cyan-600 border border-cyan-200 shadow-glow-cyan transition-transform duration-75 ease-out"
                  style={{
                    transform: `translate(${leftX * 22}px, ${leftY * 22}px)`
                  }}
                />
              </div>
            </div>

            {/* Right Thumbstick Area */}
            <div className="glass-panel rounded-xl p-2.5 border border-slate-800 flex flex-col items-center">
              <div className="flex items-center justify-between w-full text-[10px] text-slate-400 mb-1.5">
                <span className="font-medium flex items-center gap-1">
                  <Crosshair className="w-3 h-3 text-violet-400" /> Right Stick
                </span>
                <span className="font-mono text-slate-300">
                  {rightX.toFixed(2)}, {rightY.toFixed(2)}
                </span>
              </div>

              {/* 2D Circular Stick Boundary */}
              <div className="relative w-18 h-18 rounded-full border border-slate-700 bg-slate-900/90 flex items-center justify-center overflow-hidden shadow-inner">
                <div className="absolute w-full h-[1px] bg-slate-800" />
                <div className="absolute h-full w-[1px] bg-slate-800" />
                <div className="absolute w-2.5 h-2.5 rounded-full border border-slate-600/40" />

                {/* Moving Stick Disc */}
                <div
                  className="w-5 h-5 rounded-full bg-gradient-to-br from-violet-400 to-violet-600 border border-violet-200 shadow-glow-violet transition-transform duration-75 ease-out"
                  style={{
                    transform: `translate(${rightX * 22}px, ${rightY * 22}px)`
                  }}
                />
              </div>
            </div>
          </div>

          {/* Analog Triggers & Bumpers Row */}
          <div className="glass-panel rounded-xl p-2.5 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
              <div className="flex items-center gap-1.5">
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${isLbPressed ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>
                  LB
                </span>
                <span>LT: {Math.round(ltValue * 100)}%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span>RT: {Math.round(rtValue * 100)}%</span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${isRbPressed ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>
                  RB
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-cyan-500 to-cyan-300 h-full transition-all duration-75"
                  style={{ width: `${ltValue * 100}%` }}
                />
              </div>
              <div className="bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-violet-500 to-violet-300 h-full transition-all duration-75"
                  style={{ width: `${rtValue * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* D-Pad & Face Buttons Matrix */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* D-Pad */}
            <div className="glass-panel rounded-xl p-2 border border-slate-800 flex items-center justify-center">
              <div className="grid grid-cols-3 gap-1 w-20 text-center text-[9px] font-bold font-mono">
                <div />
                <div className={`p-1 rounded ${isDpadUp ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>▲</div>
                <div />
                <div className={`p-1 rounded ${isDpadLeft ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>◀</div>
                <div className={`p-1 rounded ${isHomePressed ? 'bg-amber-400 text-slate-950' : 'bg-slate-800/50 text-slate-600'}`}>●</div>
                <div className={`p-1 rounded ${isDpadRight ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>▶</div>
                <div />
                <div className={`p-1 rounded ${isDpadDown ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>▼</div>
                <div />
              </div>
            </div>

            {/* Face Buttons (X, Y, A, B) */}
            <div className="glass-panel rounded-xl p-2 border border-slate-800 flex items-center justify-center">
              <div className="grid grid-cols-3 gap-1 w-20 text-center text-[9px] font-bold font-mono">
                <div />
                <div className={`p-1 rounded transition-colors ${isYPressed ? 'bg-amber-400 text-slate-950 font-black' : 'bg-slate-800 text-amber-300'}`}>Y</div>
                <div />
                <div className={`p-1 rounded transition-colors ${isXPressed ? 'bg-cyan-500 text-slate-950 font-black' : 'bg-slate-800 text-cyan-300'}`}>X</div>
                <div className="p-1 text-slate-600">ABXY</div>
                <div className={`p-1 rounded transition-colors ${isBPressed ? 'bg-rose-500 text-white font-black' : 'bg-slate-800 text-rose-300'}`}>B</div>
                <div />
                <div className={`p-1 rounded transition-colors ${isAPressed ? 'bg-emerald-400 text-slate-950 font-black' : 'bg-slate-800 text-emerald-300'}`}>A</div>
                <div />
              </div>
            </div>
          </div>
        </div>

        {/* Dual-Motor Haptic Rumble Testing Panel */}
        <div className="glass-panel rounded-xl p-3 border border-slate-800 mb-3 bg-slate-900/50">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-200 mb-2">
            <span className="flex items-center gap-1.5">
              <Vibrate className={`w-3.5 h-3.5 ${telemetry.vibratingNow ? 'text-cyan-400 animate-spin' : 'text-slate-400'}`} />
              Dual-Motor Rumble Haptics
            </span>
            <span className="text-[10px] font-mono text-slate-400">{duration}ms</span>
          </div>

          {/* Motor Sliders */}
          <div className="space-y-2 mb-3">
            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span>Low-Freq (Heavy Motor):</span>
              <span className="font-mono text-cyan-300">{Math.round(strongMotor * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={strongMotor}
              onChange={(e) => setStrongMotor(parseFloat(e.target.value))}
              className="w-full accent-cyan-400 h-1 bg-slate-800 rounded-lg cursor-pointer"
            />

            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span>High-Freq (Light Motor):</span>
              <span className="font-mono text-violet-300">{Math.round(weakMotor * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={weakMotor}
              onChange={(e) => setWeakMotor(parseFloat(e.target.value))}
              className="w-full accent-violet-400 h-1 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>

          {/* Test Dual Haptic Rumble Button */}
          <button
            onClick={handleRumbleTest}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-400 hover:to-cyan-300 text-slate-950 font-bold text-xs shadow-glow-cyan transition-all active:scale-95"
          >
            <Vibrate className="w-3.5 h-3.5" />
            <span>{telemetry.vibratingNow ? 'Testing Dual Rumble...' : 'Test Dual Haptic Rumble'}</span>
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
        <span>60 FPS WebHID Loop</span>
        <span className="flex items-center gap-1 text-slate-300">
          <Battery className="w-3.5 h-3.5 text-emerald-400" /> {telemetry.batteryPercent ?? 88}%
        </span>
      </div>
    </div>
  );
};
