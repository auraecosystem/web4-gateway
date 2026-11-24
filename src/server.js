import { loadConfig } from "./config/index.js";
import { createApp } from "./app.js";
import { createHttpServer } from "./server/http-server.js";
import { attachWebSocketServer } from "./server/websocket-server.js";
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
  const server = createHttpServer(app);
  const wss = attachWebSocketServer({ server, config, sessions, connections, router, metrics, audit });

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
