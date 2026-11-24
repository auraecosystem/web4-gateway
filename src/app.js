import express from "express";
import { requirePrincipal } from "./identity/authentication.js";

export function createApp(deps) {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", deps.config.trustProxyHops);
  app.use(express.json({ limit: "64kb", strict: true }));

  app.get("/api/healthz", (_req, res) => res.json({ status: "ok" }));
  app.get("/api/readyz", (_req, res) => res.json({ status: "ready" }));

  const authenticate = requirePrincipal(deps.config.token);
  app.post("/api/sessions", authenticate, (req, res) => {
    const session = deps.sessions.issue(req.principal);
    deps.audit.record("session.issued", { subject: req.principal.id });
    res.status(201).json(session);
  });

  app.get("/api/identity", authenticate, (req, res) => {
    res.json({
      subject: req.principal.id,
      method: req.principal.method,
      scopes: req.principal.scopes
    });
  });

  app.get("/api/trust/evaluate", authenticate, (req, res) => {
    res.json(deps.trust.evaluate({ principal: req.principal, action: "route" }));
  });

  app.get("/api/agents", authenticate, (_req, res) => {
    res.json({ agents: deps.agents.list() });
  });

  app.post("/api/agents", authenticate, (req, res) => {
    try {
      const agent = deps.agents.register(req.body);
      deps.audit.record("agent.registered", { agentId: agent.id });
      res.status(201).json(agent);
    } catch (error) {
      res.status(400).json({ error: "INVALID_AGENT", detail: error.message });
    }
  });

  app.get("/api/metrics", authenticate, (_req, res) => res.json(deps.metrics.snapshot()));
  app.use((_req, res) => res.status(404).json({ error: "NOT_FOUND" }));
  app.use((error, _req, res, _next) => {
    deps.audit.record("http.error", { status: error.status ?? 500 });
    res.status(error.status ?? 500).json({ error: "REQUEST_ERROR" });
  });
  return app;
}
