# Web4 Gateway

A small authenticated WebSocket gateway designed to run behind an NGINX TLS-terminating reverse proxy.

## Request path

```text
Client -- wss://gateway.example.com/ws --> NGINX (TLS termination)
                                               |
                                               | HTTP/1.1 Upgrade over private network
                                               v
                                        Web4 Gateway :3000
```

NGINX owns the public TLS boundary. The gateway owns WebSocket authentication, connection lifecycle, heartbeat, message validation and point-to-point routing.

## Requirements

- Node.js 22+
- Docker and Docker Compose
- TLS certificate and private key
- Long random gateway token
- Exact browser Origin allowlist

## Configuration

Copy `.env.example` to `.env`, then set `GATEWAY_TOKEN` and `ALLOWED_ORIGINS`. The service refuses to start without a token, and production mode requires an Origin allowlist. Never commit `.env` or private TLS keys.

Other settings: `HOST`, `PORT`, `MAX_PAYLOAD_BYTES`, `HEARTBEAT_INTERVAL_MS`, `HANDSHAKE_MAX`, and `HANDSHAKE_WINDOW_MS`.

## Local development

```sh
npm install
GATEWAY_TOKEN='use-a-long-random-secret' ALLOWED_ORIGINS='http://localhost:5173' npm start
```

Endpoint: `ws://localhost:3000/ws`. Clients must send `Authorization: Bearer <token>` in the HTTP upgrade request. Browser WebSocket APIs cannot set arbitrary headers; browser deployments need a short-lived, origin-bound credential exchange. Do not put long-lived tokens in query strings.

Health endpoints: `GET /healthz` (liveness) and `GET /readyz` (readiness; keep private).

## Message protocol

The server sends `{ "type": "connected", "connectionId": "..." }` after connection. Send `{ "type": "ping" }` for an application-level pong, or `{ "type": "message", "to": "recipient-connection-id", "payload": { "hello": "world" } }` for point-to-point delivery to another connection on the same process.

## Docker deployment

1. Place the certificate at `certs/fullchain.pem` and key at `certs/privkey.pem`.
2. Create `.env` with `GATEWAY_TOKEN` and `ALLOWED_ORIGINS`.
3. Replace `gateway.example.com` in `deploy/nginx.conf`.
4. Run `docker compose up --build -d`.
5. Verify `https://gateway.example.com/healthz`.

Only NGINX publishes ports 80 and 443. The gateway is exposed solely on the private Compose network.

## Security and scope

Authentication, production Origin allowlisting, payload limits, per-IP handshake limits, ping/pong heartbeat, and disabled per-message compression are included. Forwarded headers are not used for authorization. The current router is single-process only. Before horizontal scaling, add shared presence/session state and a message bus, identity-scoped recipient authorization, token rotation/short-lived credentials, and NGINX integration tests. Browser access requires a short-lived session exchange rather than a long-lived bearer secret.