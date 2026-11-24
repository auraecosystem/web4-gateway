import http from "node:http";
import { WebSocketServer } from "ws";
import { loadConfig } from "./config/index.js";
import { createApp } from "./app.js";
import { ConnectionManager } from "./gateway/connection-manager.js";
import { SessionManager } from "./gateway/session-manager.js";
import { MessageRouter } from "./gateway/message-router.js";
import { TrustPolicy } from "./trust/trust-policy.js";
import { AgentRegistry } from "./agents/agent-registry.js";
import { Metrics } from "./observability/metrics.js";
import { AuditLog } from "./observability/audit.js";

export function buildGateway(config = loadConfig()) {
  const connections = new ConnectionManager();
  const sessions = new SessionManager({ ttlSeconds: config.sessionTtlSeconds });
  const trust = new TrustPolicy();
  const agents = new AgentRegistry();
  const metrics = new Metrics();
  const audit = new AuditLog();
  const router = new MessageRouter({ connections, trustPolicy: trust, maxPayload: config.maxPayload });
  const app = createApp({ config, connections, sessions, trust, agents, metrics, audit });
  const server = http.createServer(app);
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
      return reject(400, "Bad Request");
    }
    if (url.pathname !== "/ws") return reject(404, "Not Found");

    const origin = req.headers.origin;
    if (config.allowedOrigins.length &&
        (!origin || !config.allowedOrigins.includes(origin))) {
      return reject(403, "Forbidden");
    }

    const principal = sessions.consume(url.searchParams.get("ticket"));
    if (!principal) return reject(401, "Unauthorized");

    wss.handleUpgrade(req, socket, head, (ws) => wss.emit("connection", ws, principal));
  });

  wss.on("connection", (ws, principal) => {
    const connectionId = connections.add(ws, principal);
    metrics.connected();
    audit.record("websocket.connected", { connectionId, subject: principal.id });
    ws.isAlive = true;

    ws.on("pong", () => { ws.isAlive = true; });
    ws.on("message", (raw) => {
      metrics.message();
      const result = router.route({ raw, senderId: connectionId, principal });
      if (result.error) {
        metrics.rejected();
        ws.send(JSON.stringify({ type: "error", code: result.error }));
      } else if (result.response) {
        ws.send(JSON.stringify(result.response));
      }
    });
    ws.on("close", () => {
      connections.remove(connectionId);
      metrics.disconnected();
      audit.record("websocket.disconnected", { connectionId });
    });
    ws.on("error", (error) => {
      audit.record("websocket.error", { connectionId, message: error.message });
      connections.remove(connectionId);
    });
    ws.send(JSON.stringify({ type: "connected", connectionId, subject: principal.id }));
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

  return {
    app, server, wss, connections, sessions, metrics, audit,
    close: () => {
      clearInterval(heartbeat);
      connections.closeAll();
      wss.close();
      return new Promise((resolve) => server.close(() => resolve()));
    }
  };
}

if (process.argv[1] && new URL(import.meta.url).pathname === process.argv[1]) {
  const config = loadConfig();
  const gateway = buildGateway(config);
  gateway.server.listen(config.port, config.host, () => {
    process.stdout.write(`Web4 Gateway listening on ${config.host}:${config.port}\n`);
  });
  const shutdown = () => gateway.close().finally(() => process.exit(0));
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}
