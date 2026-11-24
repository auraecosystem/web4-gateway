const integer = (value, fallback, min, max) => {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isInteger(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
};

export function loadConfig(env = process.env) {
  const token = env.GATEWAY_TOKEN ?? "";
  if (!token && env.NODE_ENV !== "test") {
    throw new Error("GATEWAY_TOKEN is required; refusing to start without authentication");
  }

  const allowedOrigins = (env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (env.NODE_ENV === "production" && allowedOrigins.length === 0) {
    throw new Error("ALLOWED_ORIGINS must be configured in production");
  }

  return Object.freeze({
    host: env.HOST ?? "0.0.0.0",
    port: integer(env.PORT, 3000, 1, 65535),
    token,
    allowedOrigins,
    maxPayload: integer(env.MAX_PAYLOAD_BYTES, 1024 * 1024, 1024, 16 * 1024 * 1024),
    heartbeatIntervalMs: integer(env.HEARTBEAT_INTERVAL_MS, 30_000, 5_000, 120_000),
    handshakeWindowMs: integer(env.HANDSHAKE_WINDOW_MS, 60_000, 10_000, 300_000),
    handshakeMax: integer(env.HANDSHAKE_MAX, 30, 1, 500),
    trustProxy: env.TRUST_PROXY === "true"
  });
}
