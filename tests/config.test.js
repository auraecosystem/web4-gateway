import test from "node:test";
import assert from "node:assert/strict";
import { loadConfig } from "../src/config.js";

test("requires an authentication token outside test mode", () => {
  assert.throws(() => loadConfig({ NODE_ENV: "production", ALLOWED_ORIGINS: "https://app.example.com" }), /GATEWAY_TOKEN/);
});

test("requires an explicit Origin allowlist in production", () => {
  assert.throws(() => loadConfig({ NODE_ENV: "production", GATEWAY_TOKEN: "x".repeat(40) }), /ALLOWED_ORIGINS/);
});

test("loads bounded numeric configuration and exact origins", () => {
  const config = loadConfig({
    NODE_ENV: "production",
    GATEWAY_TOKEN: "x".repeat(40),
    ALLOWED_ORIGINS: "https://app.example.com, https://admin.example.com ",
    PORT: "8080",
    MAX_PAYLOAD_BYTES: "999999999"
  });
  assert.equal(config.port, 8080);
  assert.equal(config.maxPayload, 16 * 1024 * 1024);
  assert.deepEqual(config.allowedOrigins, ["https://app.example.com", "https://admin.example.com"]);
});
