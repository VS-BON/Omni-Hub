# OmniHub Desktop Telemetry Daemon

A lightweight, zero-cloud Node.js background WebSocket daemon that polls hardware telemetry (CPU loads/thermals, GPU utilization, RAM usage, storage volumes, network I/O in MB/s) using `systeminformation` and broadcasts live JSON frames to the OmniHub Web Dashboard over a local WebSocket connection (`ws://localhost:8080`).

## Features
- **1000ms Real-Time Polling**: CPU average & per-core loads, CPU temperatures, memory allocation, GPU load/VRAM, and network I/O.
- **Heartbeat & Auto-Pruning**: Periodic 5000ms WebSocket ping/pong cycle with automatic cleanup for stale or abruptly disconnected sockets.
- **Toggleable Mock Engine**: Built-in mock generator for organic simulated metrics when hardware sensors or virtualized environments are restricted.
- **HTTP Health & Control Endpoints**: `/health` endpoint and `/mock/toggle` route.

## Quick Start

### 1. Prerequisites
- Node.js 18.0.0 or higher
- npm or pnpm

### 2. Install Dependencies
```bash
cd daemon
npm install
```

### 3. Run in Development Mode
```bash
npm run dev
```

The daemon will start on port `8080` (or the port defined by `VITE_DAEMON_URL` / `DAEMON_PORT`) and begin streaming telemetry frames every 1000ms.

### 4. Build & Run
```bash
npm run build
npm start
```

## Environment Variables

| Variable | Default | Description |
| :--- | :--- | :--- |
| `VITE_DAEMON_URL` | `ws://localhost:8080` | Preferred WebSocket URL (port is extracted automatically) |
| `DAEMON_PORT` | `8080` | Port for the WebSocket & HTTP health check server |
| `DAEMON_HOST` | `0.0.0.0` | Bind host IP address |
| `MOCK_MODE` | `false` | Set to `true` to force simulated telemetry data |

## Telemetry Frame Schema (`PCDeviceTelemetryPayload`)
```json
{
  "type": "TELEMETRY_BROADCAST",
  "version": "1.0.0",
  "timestamp": 1727497200000,
  "id": "dev-host-workstation",
  "name": "OmniRig Station (Primary Host)",
  "category": "host_pc",
  "connectionType": "daemon_ws",
  "status": "connected",
  "daemonOnline": true,
  "endpointUrl": "ws://0.0.0.0:8080",
  "coreLoads": [24, 20, 32, 18, 14, 28, 22, 19],
  "coreThermals": [48, 47, 49, 46, 48, 50, 47, 48],
  "gpuUtilization": 28,
  "gpuVramUsedMb": 6800,
  "gpuVramTotalMb": 24576,
  "gpuTemperatureCelsius": 51,
  "ramUsedBytes": 14817632256,
  "ramTotalBytes": 34359738368,
  "ramActivePercent": 43,
  "networkDownRateBytesPerSec": 420000,
  "networkUpRateBytesPerSec": 154000,
  "networkDownRateMBps": 0.40,
  "networkUpRateMBps": 0.15,
  "disks": [
    {
      "fs": "/dev/nvme0n1p2",
      "mount": "/",
      "type": "ext4",
      "sizeBytes": 2048000000000,
      "usedBytes": 680000000000,
      "usePercent": 33,
      "isRemovable": false
    }
  ],
  "telemetry": { ... }
}
```
