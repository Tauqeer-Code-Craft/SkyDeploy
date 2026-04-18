const express = require("express");
const http = require("http");
const httpProxy = require("http-proxy");

const app = express();
const PORT = 8080;

const proxy = httpProxy.createProxy({
  ws: true,
  changeOrigin: true,
  xfwd: true
});

// 🔑 Dynamic registry
const apps = {};

// 🛡️ Rate limiter logic
const requestCounts = {};
const RATE_LIMIT_WINDOW = 60000;
const MAX_REQUESTS = 100;
setInterval(() => {
  for (let key in requestCounts) {
    requestCounts[key] = 0;
  }
}, RATE_LIMIT_WINDOW);

function addApp(appName, port) {
  apps[appName] = `http://127.0.0.1:${port}`;
  console.log(`[Proxy] Registered ${appName} → ${apps[appName]}`);
}

function removeApp(appName) {
  delete apps[appName];
  console.log(`[Proxy] Removed ${appName}`);
}

// HTTP requests
app.use((req, res) => {
  const hostname = req.hostname;
  if (!hostname) return res.status(400).send("Bad Request");

  const subdomain = hostname.split(".")[0];
  const target = apps[subdomain];

  if (!target) {
    return res.status(404).send(`No app registered for ${subdomain}`);
  }

  // Rate Limiting Check
  requestCounts[subdomain] = (requestCounts[subdomain] || 0) + 1;
  if (requestCounts[subdomain] > MAX_REQUESTS) {
    return res.status(429).send("Too Many Requests");
  }

  proxy.web(req, res, { target }, err => {
    console.error("Proxy error:", err);
    res.status(502).send("Bad Gateway");
  });
});

// ⚠️ IMPORTANT: create server manually
const server = http.createServer(app);

// ✅ WebSocket upgrades (Streamlit, Next.js, etc.)
server.on("upgrade", (req, socket, head) => {
  const host = req.headers.host;
  if (!host) return socket.destroy();

  const hostname = host.split(":")[0];
  const subdomain = hostname.split(".")[0];
  const target = apps[subdomain];

  if (!target) {
    console.log(`[WS] No app for ${subdomain}`);
    return socket.destroy();
  }

  console.log(`[WS] ${subdomain} → ${req.url}`);

  proxy.ws(req, socket, head, { target });
});

server.listen(PORT, () => {
  console.log(`[Proxy] Running at http://localhost:${PORT}`);
});

module.exports = { addApp, removeApp };
