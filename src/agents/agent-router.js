export class AgentRouter {
  constructor(registry) {
    this.registry = registry;
  }

  resolve(agentId) {
    const agent = this.registry.get(agentId);
    return agent ? { agent } : { error: "AGENT_NOT_FOUND" };
  }
}
