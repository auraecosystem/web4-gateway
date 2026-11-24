import { WebSocketServer } from "ws";

export function attachWebSocketServer({ server, config, sessions, connections, router, metrics, audit }) {
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
    });
    ws.send(JSON.stringify({ type: "connected", connectionId, subject: principal.id }));
  });

  return wss;
}
