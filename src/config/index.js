const integer = (value, fallback, min, max) => {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isInteger(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
};

export function loadConfig(env = process.env) {
  const token = env.GATEWAY_TOKEN ?? "";
  if (env.NODE_ENV !== "test" && token.length < 32) {
    throw new Error("GATEWAY_TOKEN must contain at least 32 characters");
  }

  const allowedOrigins = (env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (env.NODE_ENV === "production" && allowedOrigins.length === 0) {
    throw new Error("ALLOWED_ORIGINS is required in production");
  }

  return Object.freeze({
    env: env.NODE_ENV ?? "development",
    host: env.HOST ?? "127.0.0.1",
    port: integer(env.PORT, 3000, 1, 65535),
    token,
    allowedOrigins,
    sessionTtlSeconds: integer(env.SESSION_TTL_SECONDS, 60, 10, 300),
    maxPayload: integer(env.MAX_PAYLOAD_BYTES, 1048576, 1024, 16777216),
    heartbeatIntervalMs: integer(env.HEARTBEAT_INTERVAL_MS, 30000, 5000, 120000),
    trustProxyHops: integer(env.TRUST_PROXY_HOPS, 1, 0, 5)
  });
}
