import { randomUUID } from "node:crypto";
import { WebSocket } from "ws";

export class ConnectionManager {
  #connections = new Map();

  add(socket, principal) {
    const id = randomUUID();
    this.#connections.set(id, { socket, principal });
    return id;
  }

  get(id) {
    return this.#connections.get(id) ?? null;
  }

  remove(id) {
    return this.#connections.delete(id);
  }

  sendTo(id, message) {
    const entry = this.#connections.get(id);
    if (!entry || entry.socket.readyState !== WebSocket.OPEN) return false;
    entry.socket.send(JSON.stringify(message));
    return true;
  }

  get size() {
    return this.#connections.size;
  }

  closeAll() {
    for (const { socket } of this.#connections.values()) {
      socket.close(1001, "Gateway shutting down");
    }
  }
}
