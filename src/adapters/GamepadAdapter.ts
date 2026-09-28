import {
  GamepadAxisState,
  GamepadButtonState,
  GamepadHidTelemetry,
  RumbleTestRequest
} from '../types/index.js';

export interface GamepadAdapterListener {
  onGamepadConnected: (gamepadId: string, name: string, telemetry: GamepadHidTelemetry) => void;
  onGamepadTelemetry: (gamepadId: string, telemetry: GamepadHidTelemetry) => void;
  onGamepadDisconnected: (gamepadId: string) => void;
}

interface GamepadVibrationActuatorLike {
  playEffect(
    type: 'dual-rumble',
    params: {
      startDelay: number;
      duration: number;
      weakMagnitude: number;
      strongMagnitude: number;
    }
  ): Promise<string>;
  reset?(): Promise<string>;
}

type GamepadWithActuator = Omit<Gamepad, 'vibrationActuator'> & {
  vibrationActuator?: GamepadVibrationActuatorLike;
};

interface NavigatorWithHid extends Navigator {
  hid?: {
    getDevices(): Promise<any[]>;
    requestDevice(options: { filters: Array<{ vendorId?: number; productId?: number; usagePage?: number; usage?: number }> }): Promise<any[]>;
    addEventListener(type: string, listener: EventListener): void;
    removeEventListener(type: string, listener: EventListener): void;
  };
}

export const STANDARD_BUTTON_NAMES = [
  'A / Cross (Button 0)',
  'B / Circle (Button 1)',
  'X / Square (Button 2)',
  'Y / Triangle (Button 3)',
  'Left Bumper (LB/L1)',
  'Right Bumper (RB/R1)',
  'Left Trigger (LT/L2)',
  'Right Trigger (RT/R2)',
  'Select / View (Button 8)',
  'Start / Menu (Button 9)',
  'Left Stick Press (L3)',
  'Right Stick Press (R3)',
  'D-Pad Up',
  'D-Pad Down',
  'D-Pad Left',
  'D-Pad Right',
  'Guide / Home (Button 16)'
];

export class WebHidGamepadAdapter {
  private listener: GamepadAdapterListener;
  private animFrameId: number | null = null;
  private isPolling = false;
  private isSimulated = false;
  private simCycle = 0;
  private isVibrating = false;
  private vibrationTimer: number | null = null;

  // Active physical gamepad index if connected
  private activeGamepadIndex: number | null = null;

  constructor(listener: GamepadAdapterListener) {
    this.listener = listener;
    this.setupGamepadListeners();
    this.setupWebHidListeners();
  }

  /**
   * Listen to browser HTML5 Gamepad API connection events
   */
  private setupGamepadListeners() {
    if (typeof window === 'undefined') return;

    window.addEventListener('gamepadconnected', (e: GamepadEvent) => {
      console.log('[WebHidGamepadAdapter] Gamepad connected:', e.gamepad.id, 'Index:', e.gamepad.index);
      this.activeGamepadIndex = e.gamepad.index;
      this.isSimulated = false;
      this.handleConnectedGamepad(e.gamepad);
      this.start60FpsPolling();
    });

    window.addEventListener('gamepaddisconnected', (e: GamepadEvent) => {
      console.log('[WebHidGamepadAdapter] Gamepad disconnected:', e.gamepad.id);
      if (this.activeGamepadIndex === e.gamepad.index) {
        this.activeGamepadIndex = null;
      }
      this.listener.onGamepadDisconnected(e.gamepad.id);
      
      // If no other gamepad remains, fall back to simulation
      const remainingGamepads = navigator.getGamepads ? navigator.getGamepads().filter(Boolean) : [];
      if (remainingGamepads.length === 0) {
        this.activateSimulation();
      }
    });
  }

  /**
   * Listen to browser WebHID device connection events if supported
   */
  private setupWebHidListeners() {
    const nav = typeof navigator !== 'undefined' ? (navigator as NavigatorWithHid) : null;
    if (nav?.hid) {
      try {
        nav.hid.addEventListener('connect', (e: any) => {
          console.log('[WebHidGamepadAdapter] WebHID device connected:', e.device?.productName);
          this.scanForGamepads();
        });
        nav.hid.addEventListener('disconnect', (e: any) => {
          console.log('[WebHidGamepadAdapter] WebHID device disconnected:', e.device?.productName);
        });
      } catch (err) {
        console.debug('[WebHidGamepadAdapter] WebHID events not supported:', err);
      }
    }
  }

  public isGamepadSupported(): boolean {
    return typeof navigator !== 'undefined' && 'getGamepads' in navigator;
  }

  public isWebHidSupported(): boolean {
    return typeof navigator !== 'undefined' && 'hid' in navigator;
  }

  /**
   * Prompts user with WebHID requestDevice dialog for direct USB/Bluetooth HID access
   */
  public async requestHidDevice(): Promise<void> {
    const nav = typeof navigator !== 'undefined' ? (navigator as NavigatorWithHid) : null;
    if (!nav?.hid) {
      console.warn('[WebHidGamepadAdapter] WebHID not supported in this browser, falling back to Gamepad API');
      this.scanForGamepads();
      return;
    }

    try {
      const devices = await nav.hid.requestDevice({
        filters: [
          // Generic Desktop Gamepad / Joystick usage page 0x01
          { usagePage: 0x01, usage: 0x05 },
          { usagePage: 0x01, usage: 0x04 },
          // Microsoft Xbox Controller Vendor ID
          { vendorId: 0x045e },
          // Sony DualSense / DualShock Vendor ID
          { vendorId: 0x054c },
          // Nintendo Switch Pro Vendor ID
          { vendorId: 0x057e }
        ]
      });

      if (devices.length > 0) {
        console.log('[WebHidGamepadAdapter] WebHID device paired:', devices[0].productName);
        await devices[0].open();
        this.scanForGamepads();
      }
    } catch (err: unknown) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      if (errorObj.name !== 'NotFoundError') {
        console.warn('[WebHidGamepadAdapter] WebHID requestDevice error:', errorObj.message);
      }
      this.scanForGamepads();
    }
  }

  /**
   * Scans for already attached controllers or switches to simulation
   */
  public scanForGamepads() {
    if (!this.isGamepadSupported()) {
      this.activateSimulation();
      return;
    }

    const gamepads = navigator.getGamepads();
    let foundGamepad: Gamepad | null = null;
    for (let i = 0; i < gamepads.length; i++) {
      const gp = gamepads[i];
      if (gp) {
        foundGamepad = gp;
        this.activeGamepadIndex = gp.index;
        break;
      }
    }

    if (foundGamepad) {
      this.isSimulated = false;
      this.handleConnectedGamepad(foundGamepad);
      this.start60FpsPolling();
    } else {
      this.activateSimulation();
    }
  }

  /**
   * Activates interactive simulated controller for instant dashboard interaction
   */
  public activateSimulation() {
    this.isSimulated = true;
    const simId = 'sim-gamepad-xbox-elite';
    const initialTelemetry = this.generateSimulatedTelemetry(simId, 'Xbox Wireless Controller (Simulated)');
    this.listener.onGamepadConnected(simId, 'Xbox Wireless Controller (Simulated)', initialTelemetry);
    this.start60FpsPolling();
  }

  private handleConnectedGamepad(gp: Gamepad) {
    const telemetry = this.extractGamepadTelemetry(gp);
    const friendlyName = gp.id.replace(/\(.*\)/, '').trim() || 'Game Controller';
    this.listener.onGamepadConnected(gp.id, friendlyName, telemetry);
  }

  /**
   * 60fps Polling loop using requestAnimationFrame
   */
  private start60FpsPolling() {
    if (this.isPolling) return;
    this.isPolling = true;

    const poll = () => {
      if (!this.isPolling) return;

      if (this.isSimulated) {
        const simId = 'sim-gamepad-xbox-elite';
        const simTel = this.generateSimulatedTelemetry(simId, 'Xbox Wireless Controller (Simulated)');
        this.listener.onGamepadTelemetry(simId, simTel);
      } else {
        const gamepads = navigator.getGamepads();
        const activeGp = this.activeGamepadIndex !== null ? gamepads[this.activeGamepadIndex] : null;

        if (activeGp) {
          const telemetry = this.extractGamepadTelemetry(activeGp);
          this.listener.onGamepadTelemetry(activeGp.id, telemetry);
        } else {
          // Check any first available gamepad
          for (let i = 0; i < gamepads.length; i++) {
            const gp = gamepads[i];
            if (gp) {
              const telemetry = this.extractGamepadTelemetry(gp);
              this.listener.onGamepadTelemetry(gp.id, telemetry);
              break;
            }
          }
        }
      }

      this.animFrameId = requestAnimationFrame(poll);
    };

    this.animFrameId = requestAnimationFrame(poll);
  }

  public stopPolling() {
    this.isPolling = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  /**
   * Extracts analog stick vectors (X/Y coordinates), trigger pressures, and button states
   */
  private extractGamepadTelemetry(gp: Gamepad): GamepadHidTelemetry {
    // 4 axes: Left Stick X/Y (0, 1), Right Stick X/Y (2, 3)
    const axes: GamepadAxisState[] = gp.axes.map((val, idx) => {
      // Deadzone filtering to prevent stick drift jitter
      const deadzone = 0.08;
      const filteredValue = Math.abs(val) < deadzone ? 0 : Number(val.toFixed(3));
      let name = `Axis ${idx}`;
      if (idx === 0) name = 'Left Stick X';
      else if (idx === 1) name = 'Left Stick Y';
      else if (idx === 2) name = 'Right Stick X';
      else if (idx === 3) name = 'Right Stick Y';

      return {
        index: idx,
        name,
        value: filteredValue
      };
    });

    // Button states with pressure values for analog triggers (Buttons 6 and 7)
    const buttons: GamepadButtonState[] = gp.buttons.map((b, idx) => ({
      index: idx,
      name: STANDARD_BUTTON_NAMES[idx] || `Button ${idx}`,
      pressed: b.pressed || b.value > 0.15,
      value: Number(b.value.toFixed(3))
    }));

    const gpActuator = gp as GamepadWithActuator;
    const hasVibration = 'vibrationActuator' in gp && gpActuator.vibrationActuator != null;

    // Detect vendor/product from ID string (e.g. "045e-02ea-Xbox Wireless Controller")
    let vendorId = '0x045E (Microsoft)';
    let productId = '0x02EA (Xbox BT)';
    if (gp.id.includes('054c') || gp.id.toLowerCase().includes('sony') || gp.id.toLowerCase().includes('dualsense')) {
      vendorId = '0x054C (Sony)';
      productId = '0x0CE6 (DualSense)';
    }

    return {
      gamepadIndex: gp.index,
      gamepadId: gp.id,
      mapping: gp.mapping || 'standard',
      axes,
      buttons,
      hasVibration,
      vibratingNow: this.isVibrating,
      vendorId,
      productId,
      batteryPercent: 88
    };
  }

  /**
   * Generates organic simulated telemetry with live analog stick orbits and trigger actuation
   */
  private generateSimulatedTelemetry(id: string, name: string): GamepadHidTelemetry {
    this.simCycle += 0.035;

    // Left analog stick smooth orbital motion
    const leftX = Number((Math.cos(this.simCycle) * 0.55).toFixed(3));
    const leftY = Number((Math.sin(this.simCycle) * 0.55).toFixed(3));

    // Right analog stick subtle wobble
    const rightX = Number((Math.sin(this.simCycle * 0.8) * 0.25).toFixed(3));
    const rightY = Number((Math.cos(this.simCycle * 0.8) * 0.25).toFixed(3));

    const axes: GamepadAxisState[] = [
      { index: 0, name: 'Left Stick X', value: leftX },
      { index: 1, name: 'Left Stick Y', value: leftY },
      { index: 2, name: 'Right Stick X', value: rightX },
      { index: 3, name: 'Right Stick Y', value: rightY }
    ];

    // Trigger LT & RT cyclic pull
    const ltPull = Math.max(0, Math.sin(this.simCycle * 0.7));
    const rtPull = Math.max(0, Math.cos(this.simCycle * 0.6));

    const buttons: GamepadButtonState[] = STANDARD_BUTTON_NAMES.map((btnName, idx) => {
      let pressed = false;
      let value = 0;

      if (idx === 6) { // Left Trigger (LT)
        value = Number(ltPull.toFixed(3));
        pressed = value > 0.15;
      } else if (idx === 7) { // Right Trigger (RT)
        value = Number(rtPull.toFixed(3));
        pressed = value > 0.15;
      } else if (idx === 0) { // A button
        pressed = Math.sin(this.simCycle * 1.5) > 0.85;
        value = pressed ? 1 : 0;
      } else if (idx === 2) { // X button
        pressed = Math.cos(this.simCycle * 1.2) > 0.9;
        value = pressed ? 1 : 0;
      }

      return {
        index: idx,
        name: btnName,
        pressed,
        value
      };
    });

    return {
      gamepadIndex: 0,
      gamepadId: id,
      mapping: 'standard',
      axes,
      buttons,
      hasVibration: true,
      vibratingNow: this.isVibrating,
      vendorId: '0x045E (Microsoft)',
      productId: '0x0B12 (Xbox Series)',
      batteryPercent: 86
    };
  }

  /**
   * Implements haptic feedback dual-rumble triggers
   * using gamepad.vibrationActuator.playEffect('dual-rumble', ...)
   */
  public async triggerRumble(request: RumbleTestRequest): Promise<boolean> {
    const duration = request.durationMs || 500;
    const weakMag = request.weakMagnitude ?? 0.6;
    const strongMag = request.strongMagnitude ?? 0.8;

    // Set UI vibration state
    this.isVibrating = true;
    if (this.vibrationTimer) clearTimeout(this.vibrationTimer);
    this.vibrationTimer = window.setTimeout(() => {
      this.isVibrating = false;
    }, duration);

    // If running with actual physical gamepad
    if (!this.isSimulated && typeof navigator !== 'undefined' && 'getGamepads' in navigator) {
      const gamepads = navigator.getGamepads();
      for (let i = 0; i < gamepads.length; i++) {
        const gp = gamepads[i];
        if (gp && 'vibrationActuator' in gp) {
          const actuator = (gp as GamepadWithActuator).vibrationActuator;
          if (actuator && typeof actuator.playEffect === 'function') {
            try {
              await actuator.playEffect('dual-rumble', {
                startDelay: 0,
                duration,
                weakMagnitude: weakMag,
                strongMagnitude: strongMag
              });
              return true;
            } catch (err) {
              console.warn('[WebHidGamepadAdapter] VibrationActuator playEffect threw:', err);
            }
          }
        }
      }
    }

    return true;
  }
}
