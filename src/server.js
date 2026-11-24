import http from "node:http";
import { timingSafeEqual } from "node:crypto";
import { WebSocket, WebSocketServer } from "ws";
import { loadConfig } from "./config.js";
import { ConnectionManager } from "./connection-manager.js";
import { routeMessage } from "./message-router.js";

function safeEqual(a, b) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

function authorized(req, token) {
  if (!token) return false;
  const header = req.headers.authorization ?? "";
  if (!header.startsWith("Bearer ")) return false;
  return safeEqual(header.slice(7), token);
}

function createHandshakeLimiter(config) {
  const buckets = new Map();
  return (ip) => {
    const now = Date.now();
    const current = buckets.get(ip);
    if (!current || now - current.startedAt >= config.handshakeWindowMs) {
      buckets.set(ip, { startedAt: now, count: 1 });
      return true;
    }
    current.count += 1;
    return current.count <= config.handshakeMax;
  };
}

export function createGatewayServer(config = loadConfig()) {
  const connections = new ConnectionManager();
  const allowHandshake = createHandshakeLimiter(config);
  const server = http.createServer((req, res) => {
    if (req.url === "/healthz") {
      res.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" });
      res.end(JSON.stringify({ status: "ok" }));
      return;
    }
    if (req.url === "/readyz") {
      res.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" });
      res.end(JSON.stringify({ status: "ready", connections: connections.size }));
      return;
    }
    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "NOT_FOUND" }));
  });

  const wss = new WebSocketServer({
    noServer: true,
    maxPayload: config.maxPayload,
    perMessageDeflate: false
  });

  server.on("upgrade", (req, socket, head) => {
    const reject = (status, reason) => {
      socket.write(`HTTP/1.1 ${status} ${reason}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`);
      socket.destroy();
    };

    let url;
    try {
      url = new URL(req.url, "http://gateway.internal");
    } catch {
      reject(400, "Bad Request");
      return;
    }

    if (url.pathname !== "/ws") return reject(404, "Not Found");

    const origin = req.headers.origin;
    if (config.allowedOrigins.length && (!origin || !config.allowedOrigins.includes(origin))) {
      return reject(403, "Forbidden");
    }

    if (!allowHandshake(req.socket.remoteAddress ?? "unknown")) {
      return reject(429, "Too Many Requests");
    }

    if (!authorized(req, config.token)) return reject(401, "Unauthorized");

    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req);
    });
  });

  wss.on("connection", (ws, req) => {
    const connectionId = connections.add(ws, {
      remoteAddress: req.socket.remoteAddress ?? null
    });
    ws.isAlive = true;

    ws.on("pong", () => { ws.isAlive = true; });
    ws.on("message", (raw) => {
      const result = routeMessage({ raw, senderId: connectionId, connections });
      if (result.error) {
        ws.send(JSON.stringify({ type: "error", code: result.error }));
      } else if (result.response) {
        ws.send(JSON.stringify(result.response));
      }
    });

    ws.on("close", () => connections.remove(connectionId));
    ws.on("error", () => connections.remove(connectionId));
    ws.send(JSON.stringify({ type: "connected", connectionId }));
  });

  const heartbeat = setInterval(() => {
    for (const client of wss.clients) {
      if (client.isAlive === false) {
        client.terminate();
        continue;
      }
      client.isAlive = false;
      client.ping();
    }
  }, config.heartbeatIntervalMs);
  heartbeat.unref();

  function close() {
    clearInterval(heartbeat);
    connections.closeAll();
    wss.close();
    server.close();
  }

  return { server, wss, connections, close };
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const config = loadConfig();
  const gateway = createGatewayServer(config);
  gateway.server.listen(config.port, config.host, () => {
    console.log(`Web4 Gateway listening on ${config.host}:${config.port}`);
  });

  const shutdown = () => gateway.close();
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}
