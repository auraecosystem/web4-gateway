# Web4 Gateway

Identity-aware HTTP and WebSocket gateway behind NGINX TLS termination.

## Topology
Client -- HTTPS POST /api/sessions (bootstrap bearer) --> NGINX TLS --> Express session manager
Client -- WSS /ws?ticket=<one-time-ticket> --> NGINX --> WebSocket gateway
Gateway --> identity authentication, trust policy, connection manager, message router, agent registry.

## Included
- Express HTTP API and WebSocket server share the same session, identity, trust and agent services.
- Constant-time comparison for bootstrap bearer secret; production requires a 32+ character secret and explicit exact Origin allowlist.
- Browser-friendly one-time, short-lived WebSocket tickets minted over authenticated HTTPS. Tickets are consumed once and stored hashed in memory.
- Payload bounds, disabled WebSocket compression, ping/pong heartbeat, request limits, health/readiness, identity, trust, agents and metrics endpoints.
- Point-to-point routing enforces same-principal boundary; authenticated identity is not automatically universal trust.
- Agent registry validates HTTP(S) endpoints and metadata only; it does not invoke agents.

## API
GET /api/healthz, GET /api/readyz
POST /api/sessions (Authorization: Bearer <GATEWAY_TOKEN>) -> {ticket, expiresIn}
GET /api/identity, GET /api/trust/evaluate, GET /api/agents, POST /api/agents, GET /api/metrics (bearer required)
WSS /ws?ticket=<ticket> (ticket one-use)

Bootstrap bearer is a service credential, not a multi-user identity provider. Replace it with your chosen identity provider before public multi-user operation. Trust policy is an explicit authorization boundary, not a cryptographic trust score.

## Adapters and limitations
DID, LCT, MCP and A2A are defined as future provider-neutral adapter boundaries in src/adapters/README.md. No cryptographic DID/LCT verification, MCP tool execution, A2A task dispatch, blockchain adapter, Redis-backed sessions, distributed presence or cross-node message bus is claimed as implemented. These require protocol selection, trust roots, secrets and shared infrastructure.

## Run
Node.js 22+: npm install; copy .env.example to .env; set GATEWAY_TOKEN (32+ random characters) and ALLOWED_ORIGINS; npm start.
Docker: supply TLS certs at certs/fullchain.pem and certs/privkey.pem, set real hostname in deploy/nginx.conf, then docker compose up --build -d. Only NGINX publishes 80/443.

## Scale
This is a secure single-process baseline. Session tickets and live connections are in-memory. Before horizontal replicas, add shared expiring ticket/session storage, distributed presence and pub/sub message routing, coordinated rate limits, and integration tests.
