export class MessageRouter {
  constructor({ connections, trustPolicy, maxPayload }) {
    this.connections = connections;
    this.trustPolicy = trustPolicy;
    this.maxPayload = maxPayload;
  }

  route({ raw, senderId, principal }) {
    if (Buffer.byteLength(raw) > this.maxPayload) {
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

    const recipient = this.connections.get(message.to);
    if (!recipient) return { error: "RECIPIENT_UNAVAILABLE" };

    const decision = this.trustPolicy.evaluate({
      principal,
      target: { principalId: recipient.principal.id },
      action: "route"
    });
    if (!decision.allowed) return { error: decision.reason };

    const delivered = this.connections.sendTo(message.to, {
      type: "message",
      from: senderId,
      payload: message.payload ?? null
    });
    return delivered
      ? { response: { type: "accepted" } }
      : { error: "RECIPIENT_UNAVAILABLE" };
  }
}
