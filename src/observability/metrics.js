export class Metrics {
  constructor() {
    this.startedAt = Date.now();
    this.totalConnections = 0;
    this.activeConnections = 0;
    this.messages = 0;
    this.rejectedMessages = 0;
  }

  connected() {
    this.totalConnections += 1;
    this.activeConnections += 1;
  }

  disconnected() {
    this.activeConnections = Math.max(0, this.activeConnections - 1);
  }

  message() {
    this.messages += 1;
  }

  rejected() {
    this.rejectedMessages += 1;
  }

  snapshot() {
    return {
      uptimeSeconds: Math.floor((Date.now() - this.startedAt) / 1000),
      totalConnections: this.totalConnections,
      activeConnections: this.activeConnections,
      messages: this.messages,
      rejectedMessages: this.rejectedMessages
    };
  }
}
