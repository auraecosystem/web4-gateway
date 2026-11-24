export class AgentRegistry {
  #agents = new Map();

  register(agent) {
    if (!agent || typeof agent.id !== "string" || !agent.id ||
        typeof agent.endpoint !== "string") {
      throw new TypeError("Agent requires id and endpoint");
    }

    const endpoint = new URL(agent.endpoint);
    if (!["https:", "http:"].includes(endpoint.protocol)) {
      throw new TypeError("Agent endpoint must use HTTP(S)");
    }

    const record = Object.freeze({
      id: agent.id,
      endpoint: endpoint.toString(),
      protocols: [...(agent.protocols ?? [])],
      metadata: agent.metadata ?? {}
    });
    this.#agents.set(record.id, record);
    return record;
  }

  get(id) {
    return this.#agents.get(id) ?? null;
  }

  list() {
    return [...this.#agents.values()];
  }

  remove(id) {
    return this.#agents.delete(id);
  }
}
