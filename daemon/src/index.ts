import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import { collectSystemMetrics } from './collector.js';
import { ClientCommand, HostTelemetryPayload } from './types.js';

const PORT = parseInt(process.env.DAEMON_PORT || '9123', 10);
const HOST = process.env.DAEMON_HOST || '0.0.0.0';
const DEFAULT_INTERVAL_MS = 1000;

const server = http.createServer((req, res) => {
  // Simple health check endpoint
  if (req.url === '/health' || req.url === '/') {
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(JSON.stringify({
      status: 'online',
      service: 'omnihub-daemon',
      uptime: process.uptime(),
      version: '1.0.0'
    }));
    return;
  }

  res.writeHead(404);
  res.end();
});

const wss = new WebSocketServer({ server });

let pollIntervalMs = DEFAULT_INTERVAL_MS;
let latestPayload: HostTelemetryPayload | null = null;
let broadcastTimer: NodeJS.Timeout | null = null;

async function broadcastMetrics() {
  try {
    latestPayload = await collectSystemMetrics();
    const payloadStr = JSON.stringify(latestPayload);

    for (const client of wss.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payloadStr);
      }
    }
  } catch (err) {
    console.error('[OmniHub Daemon] Broadcast cycle error:', err);
  }
}

function startPolling(intervalMs: number) {
  if (broadcastTimer) {
    clearInterval(broadcastTimer);
  }
  pollIntervalMs = Math.max(250, intervalMs);
  broadcastTimer = setInterval(broadcastMetrics, pollIntervalMs);
  // Immediate initial collection
  broadcastMetrics();
}

wss.on('connection', (ws: WebSocket, req: http.IncomingMessage) => {
  const remoteAddr = req.socket.remoteAddress || 'unknown';
  console.log(`[OmniHub Daemon] New client connected from ${remoteAddr} (Active: ${wss.clients.size})`);

  // Send initial immediate frame if available
  if (latestPayload) {
    ws.send(JSON.stringify(latestPayload));
  } else {
    collectSystemMetrics().then(metrics => {
      latestPayload = metrics;
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(metrics));
      }
    });
  }

  ws.on('message', async (data: Buffer | string) => {
    try {
      const msg = JSON.parse(data.toString()) as ClientCommand;
      
      switch (msg.action) {
        case 'ping': {
          ws.send(JSON.stringify({
            type: 'PONG',
            clientTimestamp: (msg.payload as any)?.clientTimestamp,
            serverTimestamp: Date.now()
          }));
          break;
        }

        case 'request_metrics': {
          const metrics = await collectSystemMetrics();
          ws.send(JSON.stringify(metrics));
          break;
        }

        case 'set_interval': {
          const newInterval = Number((msg.payload as any)?.intervalMs);
          if (newInterval && newInterval >= 250) {
            console.log(`[OmniHub Daemon] Polling interval updated to ${newInterval}ms`);
            startPolling(newInterval);
          }
          break;
        }

        case 'execute_action': {
          console.log('[OmniHub Daemon] Received action execution:', msg.payload);
          ws.send(JSON.stringify({
            type: 'ACTION_RESULT',
            action: (msg.payload as any)?.targetAction,
            success: true,
            timestamp: Date.now()
          }));
          break;
        }

        default:
          console.warn('[OmniHub Daemon] Unknown client action:', (msg as any).action);
      }
    } catch (parseErr) {
      console.error('[OmniHub Daemon] Failed to parse client message:', parseErr);
    }
  });

  ws.on('close', (code: number, reason: Buffer) => {
    console.log(`[OmniHub Daemon] Client disconnected (${code} - ${reason.toString() || 'normal'}). Remaining: ${wss.clients.size}`);
  });

  ws.on('error', (error: Error) => {
    console.error('[OmniHub Daemon] WebSocket client error:', error);
  });
});

server.listen(PORT, HOST, () => {
  console.log('====================================================');
  console.log(`⚡ OmniHub Hardware Telemetry Daemon v1.0.0 Started`);
  console.log(`📡 Listening on: ws://${HOST}:${PORT}`);
  console.log(`⏱️ Polling telemetry every ${pollIntervalMs}ms`);
  console.log('====================================================');
  startPolling(pollIntervalMs);
});

process.on('SIGTERM', () => {
  console.log('[OmniHub Daemon] Shutting down gracefully...');
  if (broadcastTimer) clearInterval(broadcastTimer);
  wss.close();
  server.close(() => process.exit(0));
});

process.on('SIGINT', () => {
  console.log('[OmniHub Daemon] Interrupted. Terminating...');
  if (broadcastTimer) clearInterval(broadcastTimer);
  wss.close();
  server.close(() => process.exit(0));
});
