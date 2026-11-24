const MAX_MESSAGE_BYTES = 1024 * 1024;

export function routeMessage({ raw, senderId, connections }) {
  if (Buffer.byteLength(raw) > MAX_MESSAGE_BYTES) {
    return { error: "MESSAGE_TOO_LARGE" };
  }

  let message;
  try {
    message = JSON.parse(raw.toString());
  } catch {
    return { error: "INVALID_JSON" };
  }

  if (!message || typeof message !== "object" || Array.isArray(message)) {
    return { error: "INVALID_ENVELOPE" };
  }

  if (message.type === "ping") {
    return { response: { type: "pong", timestamp: new Date().toISOString() } };
  }

  if (message.type !== "message" || typeof message.to !== "string" || !message.to) {
    return { error: "UNSUPPORTED_MESSAGE" };
  }

  const delivered = connections.sendTo(message.to, {
    type: "message",
    from: senderId,
    payload: message.payload ?? null
  });

  return delivered
    ? { response: { type: "accepted" } }
    : { error: "RECIPIENT_UNAVAILABLE" };
}
