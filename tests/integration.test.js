import test from "node:test";
import assert from "node:assert/strict";
import WebSocket from "ws";
import { buildGateway } from "../src/server.js";

test("authenticated HTTP session can establish one WebSocket connection", async t => {
  const config = { env: "test", host: "127.0.0.1", port: 0, token: "t".repeat(40), allowedOrigins: ["https://client.example"], sessionTtlSeconds: 30, maxPayload: 4096, heartbeatIntervalMs: 30000, trustProxyHops: 0 };
  const gateway = buildGateway(config);
  await new Promise(resolve => gateway.server.listen(0, "127.0.0.1", resolve));
  t.after(() => gateway.close());
  const address = gateway.server.address();
  const base = `http://127.0.0.1:${address.port}`;
  const health = await fetch(base + "/api/healthz");
  assert.equal(health.status, 200);
  const denied = await fetch(base + "/api/sessions", { method: "POST" });
  assert.equal(denied.status, 401);
  const response = await fetch(base + "/api/sessions", { method: "POST", headers: { authorization: `Bearer ${config.token}`, origin: "https://client.example" } });
  assert.equal(response.status, 201);
  const { ticket } = await response.json();
  const ws = new WebSocket(`ws://127.0.0.1:${address.port}/ws?ticket=${encodeURIComponent(ticket)}`, { headers: { origin: "https://client.example" } });
  const connected = await new Promise((resolve, reject) => { ws.once("message", data => resolve(JSON.parse(data))); ws.once("error", reject); });
  assert.equal(connected.type, "connected");
  ws.close();
  const reused = new WebSocket(`ws://127.0.0.1:${address.port}/ws?ticket=${encodeURIComponent(ticket)}`, { headers: { origin: "https://client.example" } });
  const rejected = await new Promise(resolve => reused.once("unexpected-response", (_, res) => resolve(res.statusCode)));
  assert.equal(rejected, 401);
});
