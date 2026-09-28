⚡ OmniHub
A high-performance, glassmorphic web dashboard for real-time local hardware management, peripheral telemetry, and zero-cloud P2P data exchange.
🚀 Features
 * 📊 Real-time PC Telemetry: Live CPU, GPU, RAM, and thermal metrics via local Node.js WebSocket daemon with interactive discharge and usage trend charts.
 * 🎧 WebBluetooth Adapter: Monitor battery health, signal strength (RSSI), and toggle ANC/sound modes on connected wearables and ANC earbuds.
 * 🎮 WebHID & Gamepad Engine: Real-time 60fps input visualization with dual-rumble haptic feedback testing for handheld controllers.
 * 📺 Smart TV Remote Protocol: Local Wi-Fi WebSocket control for LG webOS and Samsung Tizen Smart TVs (D-Pad navigation, volume/media steppers, quick app launch).
 * 📂 WebRTC P2P Data Channel: Direct local network drag-and-drop file transfers and instant cross-device clipboard synchronization.
 * ⚡ Keyboard-First UX: Global Command Palette (Cmd + K / Ctrl + K), quick-action control sidebar, responsive Bento grid, and custom hover micro-interactions.
🛠️ Tech Stack
 * Frontend: React, TypeScript, Tailwind CSS, Lucide Icons
 * Protocols & APIs: WebBluetooth API, WebHID API, WebRTC DataChannels, WebSockets
 * Backend Daemon: Node.js, ws (WebSocket), systeminformation
🏁 Quick Start
1. Clone the Repository
git clone https://github.com/YOUR_USERNAME/omnihub.git
cd omnihub

2. Install Dependencies
# Frontend setup
npm install

# Daemon setup
cd daemon
npm install
cd ..

3. Run Locally
Terminal 1 (Hardware Telemetry Daemon):
cd daemon
npm run start

Terminal 2 (React Dashboard):
npm run dev

Open http://localhost:5173 in a Chromium-based browser (Chrome, Edge, or Brave) for best WebBluetooth and WebHID performance.
