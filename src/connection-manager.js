import { randomUUID } from "node:crypto";

export class ConnectionManager {
  #connections = new Map();

  add(socket, metadata = {}) {
    const id = randomUUID();
    this.#connections.set(id, { socket, metadata, connectedAt: new Date().toISOString() });
    return id;
  }

  remove(id) {
    return this.#connections.delete(id);
  }

  sendTo(id, message) {
    const entry = this.#connections.get(id);
    if (!entry || entry.socket.readyState !== entry.socket.OPEN) return false;
    entry.socket.send(JSON.stringify(message));
    return true;
  }

  get size() {
    return this.#connections.size;
  }

  closeAll(code = 1001, reason = "Gateway shutting down") {
    for (const { socket } of this.#connections.values()) {
      socket.close(code, reason);
    }
  }
}
