import { createHash, randomBytes } from "node:crypto";

export class SessionManager {
  #sessions = new Map();

  constructor({ ttlSeconds = 60, now = () => Date.now() } = {}) {
    this.ttlMs = ttlSeconds * 1000;
    this.now = now;
  }

  issue(principal) {
    this.sweep();
    const ticket = randomBytes(32).toString("base64url");
    const key = createHash("sha256").update(ticket).digest("hex");
    this.#sessions.set(key, {
      principal,
      expiresAt: this.now() + this.ttlMs
    });
    return { ticket, expiresIn: this.ttlMs / 1000 };
  }

  consume(ticket) {
    if (typeof ticket !== "string" || ticket.length < 32) return null;
    const key = createHash("sha256").update(ticket).digest("hex");
    const session = this.#sessions.get(key);
    this.#sessions.delete(key);
    return session && session.expiresAt > this.now() ? session.principal : null;
  }

  sweep() {
    for (const [key, session] of this.#sessions) {
      if (session.expiresAt <= this.now()) this.#sessions.delete(key);
    }
  }
}
