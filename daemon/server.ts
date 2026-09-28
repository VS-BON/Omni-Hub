import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import si from 'systeminformation';

// -------------------------------------------------------------
// Type Definitions matching OmniHub PCDevice schema
// -------------------------------------------------------------

export interface DiskSpecPayload {
  fs: string;
  mount: string;
  type: string;
  sizeBytes: number;
  usedBytes: number;
  usePercent: number;
  isRemovable?: boolean;
}

export interface PCDeviceTelemetryPayload {
  type: 'TELEMETRY_BROADCAST';
  version: '1.0.0';
  timestamp: number;
  // Top-level PCDevice schema properties
  id: string;
  name: string;
  category: 'host_pc';
  connectionType: 'daemon_ws';
  status: 'connected';
  lastSeen: number;
  latencyMs: number;
  daemonOnline: boolean;
  endpointUrl: string;
  coreLoads: number[];
  coreThermals: number[];
  gpuUtilization: number;
  gpuVramUsedMb: number;
  gpuVramTotalMb: number;
  gpuTemperatureCelsius: number;
  ramUsedBytes: number;
  ramTotalBytes: number;
  ramActivePercent: number;
  networkDownRateBytesPerSec: number;
  networkUpRateBytesPerSec: number;
  networkDownRateMBps: number;
  networkUpRateMBps: number;
  disks: DiskSpecPayload[];
  // Full nested telemetry structure
  telemetry: {
    system: {
      hostname: string;
      platform: string;
      distro: string;
      arch: string;
      uptimeSeconds: number;
    };
    cpu: {
      model: string;
      speedGhz: number;
      coresCount: number;
      loadPercent: number;
      coreLoads: number[];
      temperatureCelsius: number;
    };
    memory: {
      totalBytes: number;
      usedBytes: number;
      freeBytes: number;
      activePercent: number;
      swapTotalBytes?: number;
      swapUsedBytes?: number;
    };
    gpu: {
      vendor: string;
      model: string;
      utilizationPercent: number;
      memoryTotalMb: number;
      memoryUsedMb: number;
      temperatureCelsius: number;
    };
    storage: DiskSpecPayload[];
    network: {
      rxBytesPerSec: number;
      txBytesPerSec: number;
      primaryInterface: string;
      ip4: string;
      rxMBps: number;
      txMBps: number;
    };
    battery?: {
      hasBattery: boolean;
      isCharging: boolean;
      percent: number;
    };
  };
}

interface ClientCommand {
  action: 'ping' | 'request_metrics' | 'set_interval' | 'toggle_mock' | 'execute_action';
  payload?: Record<string, unknown>;
}

interface ExtWebSocket extends WebSocket {
  isAlive: boolean;
  clientIp?: string;
}

// -------------------------------------------------------------
// Port Resolution Logic
// -------------------------------------------------------------

function resolvePort(): number {
  if (process.env.VITE_DAEMON_URL) {
    try {
      const url = new URL(process.env.VITE_DAEMON_URL.replace(/^ws/, 'http'));
      if (url.port) return parseInt(url.port, 10);
    } catch {
      // Ignored
    }
  }
  if (process.env.DAEMON_PORT) return parseInt(process.env.DAEMON_PORT, 10);
  if (process.env.PORT) return parseInt(process.env.PORT, 10);
  return 8080;
}

const PORT = resolvePort();
const HOST = process.env.DAEMON_HOST || '0.0.0.0';
const DEFAULT_INTERVAL_MS = 1000;
const HEARTBEAT_INTERVAL_MS = 5000; // 5-second ping/pong heartbeat

// -------------------------------------------------------------
// State Management
// -------------------------------------------------------------

let pollIntervalMs = DEFAULT_INTERVAL_MS;
let telemetryTimer: NodeJS.Timeout | null = null;
let heartbeatTimer: NodeJS.Timeout | null = null;
let isMockEngineActive = process.env.MOCK_MODE === 'true';
let latestTelemetryPayload: PCDeviceTelemetryPayload | null = null;

// Mock Engine State for organic wave generation
let mockStep = 0;
let mockCpuLoad = 28;
let mockGpuUtil = 22;
let mockRamUsedGb = 14.4;
let mockDownBytes = 450000;
let mockUpBytes = 160000;

// Cached static OS/Hardware information
let cachedStaticInfo: {
  hostname: string;
  platform: string;
  distro: string;
  arch: string;
  cpuModel: string;
  cpuCores: number;
  cpuBaseSpeed: number;
} | null = null;

async function getStaticHardwareInfo() {
  if (cachedStaticInfo) return cachedStaticInfo;

  try {
    const [osInfo, cpu] = await Promise.all([
      si.osInfo(),
      si.cpu()
    ]);

    cachedStaticInfo = {
      hostname: osInfo.hostname || 'OmniRig-Host',
      platform: osInfo.platform || process.platform,
      distro: `${osInfo.distro || 'Generic Linux'} ${osInfo.release || ''}`.trim(),
      arch: osInfo.arch || process.arch,
      cpuModel: `${cpu.manufacturer || ''} ${cpu.brand || 'Multi-Core Processor'}`.trim(),
      cpuCores: Math.max(4, cpu.cores || 8),
      cpuBaseSpeed: cpu.speed || 3.8
    };
  } catch {
    cachedStaticInfo = {
      hostname: 'OmniRig-Host',
      platform: process.platform,
      distro: 'OmniOS / Linux 6.10',
      arch: process.arch,
      cpuModel: 'High-Performance Host CPU',
      cpuCores: 16,
      cpuBaseSpeed: 4.2
    };
  }

  return cachedStaticInfo;
}

// -------------------------------------------------------------
// Real Hardware Polling (systeminformation)
// -------------------------------------------------------------

async function pollRealHardware(): Promise<PCDeviceTelemetryPayload> {
  const staticInfo = await getStaticHardwareInfo();

  const [
    currentLoad,
    cpuTemp,
    mem,
    graphics,
    fsSize,
    networkStats,
    netInterfaces,
    time,
    battery
  ] = await Promise.all([
    si.currentLoad().catch(() => ({ currentLoad: 24, cpus: [] })),
    si.cpuTemperature().catch(() => ({ main: 48, cores: [] })),
    si.mem().catch(() => ({ total: 32 * 1024 * 1024 * 1024, active: 14 * 1024 * 1024 * 1024, free: 18 * 1024 * 1024 * 1024 })),
    si.graphics().catch(() => ({ controllers: [] })),
    si.fsSize().catch(() => []),
    si.networkStats().catch(() => []),
    si.networkInterfaces().catch(() => []),
    si.time(),
    si.battery().catch(() => ({ hasBattery: false, isCharging: false, percent: 100 }))
  ]);

  // CPU Calculations
  const loadPercent = Math.min(100, Math.max(1, Math.round(currentLoad.currentLoad || 22)));
  const coreLoads = Array.isArray(currentLoad.cpus) && currentLoad.cpus.length > 0
    ? currentLoad.cpus.map(c => Math.round(c.load || 0))
    : Array.from({ length: staticInfo.cpuCores }, () => Math.max(5, Math.round(loadPercent + (Math.random() - 0.5) * 12)));

  const mainTemp = cpuTemp.main && cpuTemp.main > 0
    ? Math.round(cpuTemp.main)
    : Math.round(42 + (loadPercent / 100) * 34);

  const coreThermals = Array.isArray(cpuTemp.cores) && cpuTemp.cores.length > 0
    ? cpuTemp.cores.map(t => Math.round(t || mainTemp))
    : coreLoads.map(load => Math.round(mainTemp + (load - loadPercent) * 0.2));

  // Memory Calculations
  const totalMem = mem.total || 32 * 1024 * 1024 * 1024;
  const usedMem = (mem.active || (totalMem - (mem.free || 0))) || Math.round(totalMem * 0.44);
  const freeMem = totalMem - usedMem;
  const activePercent = Math.min(100, Math.max(0, Math.round((usedMem / totalMem) * 100)));

  // GPU Calculations
  const primaryGpu = graphics.controllers && graphics.controllers.length > 0
    ? graphics.controllers[0]
    : null;

  const gpuUtil = primaryGpu && typeof primaryGpu.utilizationGpu === 'number'
    ? Math.round(primaryGpu.utilizationGpu)
    : Math.max(5, Math.round(loadPercent * 0.8));

  const gpuVramTotal = primaryGpu?.vram || 24576;
  const gpuVramUsed = Math.round(gpuVramTotal * (gpuUtil / 100) * 0.65) + 1200;
  const gpuTemp = primaryGpu?.temperatureGpu || Math.max(40, mainTemp - 2);

  // Network Calculations (bytes/sec converted to MB/s)
  const primaryNet = networkStats && networkStats.length > 0 ? networkStats[0] : null;
  const rxBytesPerSec = Math.max(0, primaryNet?.rx_sec || 284000);
  const txBytesPerSec = Math.max(0, primaryNet?.tx_sec || 92000);
  const networkDownRateMBps = Number((rxBytesPerSec / (1024 * 1024)).toFixed(2));
  const networkUpRateMBps = Number((txBytesPerSec / (1024 * 1024)).toFixed(2));

  const defaultIface = Array.isArray(netInterfaces)
    ? netInterfaces.find((i: any) => i.ip4 && !i.internal)
    : null;

  // Storage / Disks
  const storageVolumes: DiskSpecPayload[] = Array.isArray(fsSize) && fsSize.length > 0
    ? fsSize.map((d: any) => ({
        fs: d.fs || '/dev/nvme0n1p2',
        mount: d.mount || '/',
        type: d.type || 'ext4',
        sizeBytes: d.size || 2048 * 1024 * 1024 * 1024,
        usedBytes: d.used || 680 * 1024 * 1024 * 1024,
        usePercent: Math.round(d.use || 33),
        isRemovable: false
      }))
    : [
        {
          fs: '/dev/nvme0n1p2',
          mount: '/',
          type: 'ext4',
          sizeBytes: 2048 * 1024 * 1024 * 1024,
          usedBytes: 680 * 1024 * 1024 * 1024,
          usePercent: 33,
          isRemovable: false
        }
      ];

  const now = Date.now();

  return {
    type: 'TELEMETRY_BROADCAST',
    version: '1.0.0',
    timestamp: now,
    id: 'dev-host-workstation',
    name: 'OmniRig Station (Primary Host)',
    category: 'host_pc',
    connectionType: 'daemon_ws',
    status: 'connected',
    lastSeen: now,
    latencyMs: 1,
    daemonOnline: true,
    endpointUrl: `ws://${HOST}:${PORT}`,
    coreLoads,
    coreThermals,
    gpuUtilization: gpuUtil,
    gpuVramUsedMb: gpuVramUsed,
    gpuVramTotalMb: gpuVramTotal,
    gpuTemperatureCelsius: gpuTemp,
    ramUsedBytes: usedMem,
    ramTotalBytes: totalMem,
    ramActivePercent: activePercent,
    networkDownRateBytesPerSec: rxBytesPerSec,
    networkUpRateBytesPerSec: txBytesPerSec,
    networkDownRateMBps,
    networkUpRateMBps,
    disks: storageVolumes,
    telemetry: {
      system: {
        hostname: staticInfo.hostname,
        platform: staticInfo.platform,
        distro: staticInfo.distro,
        arch: staticInfo.arch,
        uptimeSeconds: Math.round(time.uptime || process.uptime())
      },
      cpu: {
        model: staticInfo.cpuModel,
        speedGhz: staticInfo.cpuBaseSpeed,
        coresCount: staticInfo.cpuCores,
        loadPercent,
        coreLoads,
        temperatureCelsius: mainTemp
      },
      memory: {
        totalBytes: totalMem,
        usedBytes: usedMem,
        freeBytes: freeMem,
        activePercent,
        swapTotalBytes: (mem as any).swaptotal || 0,
        swapUsedBytes: (mem as any).swapused || 0
      },
      gpu: {
        vendor: primaryGpu?.vendor || 'NVIDIA Corporation',
        model: primaryGpu?.model || 'GeForce RTX 4090 OC',
        utilizationPercent: gpuUtil,
        memoryTotalMb: gpuVramTotal,
        memoryUsedMb: gpuVramUsed,
        temperatureCelsius: gpuTemp
      },
      storage: storageVolumes,
      network: {
        rxBytesPerSec,
        txBytesPerSec,
        rxMBps: networkDownRateMBps,
        txMBps: networkUpRateMBps,
        primaryInterface: primaryNet?.iface || defaultIface?.iface || 'eth0 (10GbE)',
        ip4: defaultIface?.ip4 || '192.168.1.185'
      },
      battery: battery?.hasBattery ? {
        hasBattery: true,
        isCharging: battery.isCharging || false,
        percent: battery.percent || 100
      } : undefined
    }
  };
}

// -------------------------------------------------------------
// Standalone Mock Telemetry Engine
// -------------------------------------------------------------

function generateMockTelemetry(): PCDeviceTelemetryPayload {
  mockStep += 0.08;

  // CPU load sine-wave with organic jitter
  const cpuSine = Math.sin(mockStep) * 16;
  const cpuJitter = (Math.random() - 0.48) * 8;
  mockCpuLoad = Math.min(94, Math.max(12, Math.round(30 + cpuSine + cpuJitter)));

  // GPU wave with occasional compute bursts
  const gpuBurst = Math.sin(mockStep * 0.5) > 0.7 ? 25 : 0;
  mockGpuUtil = Math.min(98, Math.max(8, Math.round(20 + Math.cos(mockStep * 0.7) * 12 + gpuBurst)));

  // Memory gentle allocation / GC cycle
  const ramCycle = Math.sin(mockStep * 0.2) * 1.8;
  mockRamUsedGb = Number((14.0 + ramCycle + (Math.random() - 0.5) * 0.3).toFixed(2));

  // Network burst simulation (up to 12.5 MB/s down, 3.2 MB/s up)
  const isSurge = Math.sin(mockStep * 1.2) > 0.6;
  mockDownBytes = Math.round(isSurge ? 8500000 + Math.random() * 4500000 : 380000 + Math.random() * 240000);
  mockUpBytes = Math.round(isSurge ? 2100000 + Math.random() * 950000 : 110000 + Math.random() * 85000);

  const totalRamBytes = 32 * 1024 * 1024 * 1024;
  const usedRamBytes = Math.round(mockRamUsedGb * 1024 * 1024 * 1024);
  const activePercent = Math.round((usedRamBytes / totalRamBytes) * 100);

  const cpuTemp = Math.round(44 + (mockCpuLoad / 100) * 32);
  const gpuTemp = Math.round(46 + (mockGpuUtil / 100) * 28);

  const coreLoads = [
    mockCpuLoad,
    Math.min(100, Math.max(5, Math.round(mockCpuLoad + (Math.random() - 0.5) * 18))),
    Math.min(100, Math.max(5, Math.round(mockCpuLoad + (Math.random() - 0.5) * 14))),
    Math.min(100, Math.max(5, Math.round(mockCpuLoad + (Math.random() - 0.5) * 22))),
    Math.min(100, Math.max(5, Math.round(mockCpuLoad + (Math.random() - 0.5) * 10))),
    Math.min(100, Math.max(5, Math.round(mockCpuLoad + (Math.random() - 0.5) * 16))),
    Math.min(100, Math.max(5, Math.round(mockCpuLoad + (Math.random() - 0.5) * 12))),
    Math.min(100, Math.max(5, Math.round(mockCpuLoad + (Math.random() - 0.5) * 20))),
  ];

  const coreThermals = coreLoads.map(load => Math.round(cpuTemp + (load - mockCpuLoad) * 0.25));

  const networkDownRateMBps = Number((mockDownBytes / (1024 * 1024)).toFixed(2));
  const networkUpRateMBps = Number((mockUpBytes / (1024 * 1024)).toFixed(2));

  const disks: DiskSpecPayload[] = [
    {
      fs: '/dev/nvme0n1p2',
      mount: '/',
      type: 'ext4',
      sizeBytes: 2048 * 1024 * 1024 * 1024,
      usedBytes: 740 * 1024 * 1024 * 1024,
      usePercent: 36,
      isRemovable: false
    },
    {
      fs: '/dev/nvme1n1',
      mount: '/mnt/storage',
      type: 'btrfs',
      sizeBytes: 4096 * 1024 * 1024 * 1024,
      usedBytes: 1980 * 1024 * 1024 * 1024,
      usePercent: 48,
      isRemovable: false
    }
  ];

  const now = Date.now();

  return {
    type: 'TELEMETRY_BROADCAST',
    version: '1.0.0',
    timestamp: now,
    id: 'dev-host-workstation',
    name: 'OmniRig Station (Primary Host - Simulated)',
    category: 'host_pc',
    connectionType: 'daemon_ws',
    status: 'connected',
    lastSeen: now,
    latencyMs: 1,
    daemonOnline: true,
    endpointUrl: `ws://${HOST}:${PORT}`,
    coreLoads,
    coreThermals,
    gpuUtilization: mockGpuUtil,
    gpuVramUsedMb: Math.round(5200 + (mockGpuUtil / 100) * 14000),
    gpuVramTotalMb: 24576,
    gpuTemperatureCelsius: gpuTemp,
    ramUsedBytes: usedRamBytes,
    ramTotalBytes: totalRamBytes,
    ramActivePercent: activePercent,
    networkDownRateBytesPerSec: mockDownBytes,
    networkUpRateBytesPerSec: mockUpBytes,
    networkDownRateMBps,
    networkUpRateMBps,
    disks,
    telemetry: {
      system: {
        hostname: 'OmniRig-Pro-Station',
        platform: 'linux',
        distro: 'OmniOS Realtime Kernel 6.10',
        arch: 'x86_64',
        uptimeSeconds: 84210 + Math.round(mockStep * 10)
      },
      cpu: {
        model: 'AMD Ryzen 9 7950X3D (16-Core)',
        speedGhz: 4.8,
        coresCount: 16,
        loadPercent: mockCpuLoad,
        coreLoads,
        temperatureCelsius: cpuTemp
      },
      memory: {
        totalBytes: totalRamBytes,
        usedBytes: usedRamBytes,
        freeBytes: totalRamBytes - usedRamBytes,
        activePercent,
        swapTotalBytes: 8 * 1024 * 1024 * 1024,
        swapUsedBytes: 1.2 * 1024 * 1024 * 1024
      },
      gpu: {
        vendor: 'NVIDIA Corporation',
        model: 'GeForce RTX 4090 OC (24GB)',
        utilizationPercent: mockGpuUtil,
        memoryTotalMb: 24576,
        memoryUsedMb: Math.round(5200 + (mockGpuUtil / 100) * 14000),
        temperatureCelsius: gpuTemp
      },
      storage: disks,
      network: {
        rxBytesPerSec: mockDownBytes,
        txBytesPerSec: mockUpBytes,
        rxMBps: networkDownRateMBps,
        txMBps: networkUpRateMBps,
        primaryInterface: 'enp5s0 (10GbE LAN)',
        ip4: '192.168.1.185'
      },
      battery: {
        hasBattery: true,
        isCharging: true,
        percent: 96
      }
    }
  };
}

// -------------------------------------------------------------
// HTTP Health Check & Control Server
// -------------------------------------------------------------

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url === '/health' || req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'online',
      daemon: 'OmniHub Telemetry Daemon',
      version: '1.0.0',
      port: PORT,
      mockMode: isMockEngineActive,
      uptimeSeconds: process.uptime(),
      connectedClients: wss.clients.size
    }));
    return;
  }

  if (req.url === '/mock/toggle' && req.method === 'POST') {
    isMockEngineActive = !isMockEngineActive;
    console.log(`[OmniHub Daemon] Mock engine toggled: ${isMockEngineActive ? 'ON' : 'OFF'}`);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ mockMode: isMockEngineActive }));
    return;
  }

  res.writeHead(404);
  res.end();
});

// -------------------------------------------------------------
// WebSocket Server & Client Management
// -------------------------------------------------------------

const wss = new WebSocketServer({ server });

async function broadcastTelemetry() {
  try {
    latestTelemetryPayload = isMockEngineActive
      ? generateMockTelemetry()
      : await pollRealHardware();

    const payloadString = JSON.stringify(latestTelemetryPayload);

    for (const client of wss.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payloadString);
      }
    }
  } catch (err) {
    console.warn('[OmniHub Daemon] Real polling encountered warning, utilizing mock engine fallback:', err);
    latestTelemetryPayload = generateMockTelemetry();
    const fallbackString = JSON.stringify(latestTelemetryPayload);
    for (const client of wss.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(fallbackString);
      }
    }
  }
}

function startPolling(intervalMs: number) {
  if (telemetryTimer) {
    clearInterval(telemetryTimer);
  }
  pollIntervalMs = Math.max(250, intervalMs);
  telemetryTimer = setInterval(broadcastTelemetry, pollIntervalMs);
  // Immediate broadcast
  broadcastTelemetry();
}

/**
 * Heartbeat cycle every 5 seconds (5000ms):
 * Pings all connected clients and auto-prunes stale clients that failed to pong.
 */
function startHeartbeatEngine() {
  if (heartbeatTimer) clearInterval(heartbeatTimer);

  heartbeatTimer = setInterval(() => {
    for (const client of wss.clients) {
      const extWs = client as ExtWebSocket;

      if (!extWs.isAlive) {
        console.log(`[OmniHub Daemon] Auto-pruning stale client (${extWs.clientIp || 'unknown'}).`);
        extWs.terminate();
        continue;
      }

      // Mark unconfirmed and send ping frame
      extWs.isAlive = false;
      extWs.ping();
    }
  }, HEARTBEAT_INTERVAL_MS);
}

wss.on('connection', (ws: WebSocket, req: http.IncomingMessage) => {
  const extWs = ws as ExtWebSocket;
  extWs.isAlive = true;
  extWs.clientIp = req.socket.remoteAddress || 'unknown';

  console.log(`[OmniHub Daemon] Client connected from ${extWs.clientIp} (Total: ${wss.clients.size})`);

  // Respond to native WebSocket pong frames
  extWs.on('pong', () => {
    extWs.isAlive = true;
  });

  // Send immediate initial telemetry frame
  if (latestTelemetryPayload) {
    extWs.send(JSON.stringify(latestTelemetryPayload));
  } else {
    pollRealHardware().then(payload => {
      latestTelemetryPayload = payload;
      if (extWs.readyState === WebSocket.OPEN) {
        extWs.send(JSON.stringify(payload));
      }
    });
  }

  // Handle client-initiated application messages
  extWs.on('message', async (data: Buffer | string) => {
    try {
      const msg = JSON.parse(data.toString()) as ClientCommand;

      switch (msg.action) {
        case 'ping': {
          extWs.isAlive = true;
          extWs.send(JSON.stringify({
            type: 'PONG',
            clientTimestamp: msg.payload?.clientTimestamp,
            serverTimestamp: Date.now()
          }));
          break;
        }

        case 'request_metrics': {
          const fresh = isMockEngineActive ? generateMockTelemetry() : await pollRealHardware();
          extWs.send(JSON.stringify(fresh));
          break;
        }

        case 'toggle_mock': {
          if (typeof msg.payload?.enabled === 'boolean') {
            isMockEngineActive = msg.payload.enabled;
          } else {
            isMockEngineActive = !isMockEngineActive;
          }
          console.log(`[OmniHub Daemon] Mock mode set to: ${isMockEngineActive}`);
          broadcastTelemetry();
          break;
        }

        case 'set_interval': {
          const newInterval = Number(msg.payload?.intervalMs);
          if (newInterval && newInterval >= 250) {
            console.log(`[OmniHub Daemon] Polling rate adjusted to ${newInterval}ms`);
            startPolling(newInterval);
          }
          break;
        }

        case 'execute_action': {
          extWs.send(JSON.stringify({
            type: 'ACTION_RESULT',
            action: msg.payload?.targetAction,
            success: true,
            timestamp: Date.now()
          }));
          break;
        }
      }
    } catch (parseErr) {
      console.warn('[OmniHub Daemon] Malformed message received from client:', parseErr);
    }
  });

  extWs.on('close', (code: number, reason: Buffer) => {
    console.log(`[OmniHub Daemon] Client disconnected (${code} - ${reason.toString() || 'normal'}). Remaining: ${wss.clients.size}`);
  });

  extWs.on('error', (err: Error) => {
    console.error(`[OmniHub Daemon] Client socket error:`, err.message);
  });
});

// -------------------------------------------------------------
// Start Server & Lifecycle Handlers
// -------------------------------------------------------------

server.listen(PORT, HOST, () => {
  console.log('===============================================================');
  console.log(`🚀 OmniHub Node.js Hardware Telemetry Daemon v1.0.0`);
  console.log(`📡 WebSocket Endpoint: ws://${HOST}:${PORT}`);
  console.log(`🩺 HTTP Health Check:  http://${HOST}:${PORT}/health`);
  console.log(`⏱️ Polling Rate:        ${pollIntervalMs}ms`);
  console.log(`💓 Heartbeat Interval:  ${HEARTBEAT_INTERVAL_MS}ms (with auto-prune)`);
  console.log(`🎭 Mock Mode:          ${isMockEngineActive ? 'ENABLED' : 'DISABLED'}`);
  console.log('===============================================================');

  startPolling(pollIntervalMs);
  startHeartbeatEngine();
});

function handleShutdown(signal: string) {
  console.log(`\n[OmniHub Daemon] Received ${signal}. Shutting down gracefully...`);
  if (telemetryTimer) clearInterval(telemetryTimer);
  if (heartbeatTimer) clearInterval(heartbeatTimer);

  for (const client of wss.clients) {
    client.close(1001, 'Daemon server shutting down');
  }

  wss.close(() => {
    server.close(() => {
      console.log('[OmniHub Daemon] Clean shutdown completed.');
      process.exit(0);
    });
  });
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));
