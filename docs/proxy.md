>Your proposed topology is correct for a **Web4 Gateway with TLS termination at the load balancer**:

# **Web4 Client**

WSS · TLS encrypted

wss\://gateway.example.com/ws

HTTPS / WebSocket Upgrade

**Load Balancer / Reverse Proxy**

TLS termination

Certificate · Routing · Authentication · Rate limiting

HTTP/1.1 Upgrade forwarded

**Private Backend**

WS · Internal network

ws\://web4-gateway-internal:3000

## **1. How the connection works**

1. The client connects to `wss://gateway.example.com/ws`.
2. The load balancer terminates TLS.
3. It forwards the HTTP WebSocket Upgrade request to the backend.
4. The backend responds with `101 Switching Protocols`.
5. The load balancer tunnels bidirectional WebSocket frames between client and backend.

The backend can use plain `ws://` if it is isolated on a trusted private network. For communication across an untrusted network, use TLS again between the load balancer and backend.

## **2. NGINX reverse proxy configuration**

A starting configuration:

```nginx
map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      close;
}

upstream web4_gateway_backend {
    least_conn;
    server 127.0.0.1:3000;
    # Add additional backend instances here.
}

server {
    listen 443 ssl;
    server_name gateway.example.com;

    ssl_certificate     /etc/letsencrypt/live/gateway.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/gateway.example.com/privkey.pem;

    location /ws {
        proxy_pass http://web4_gateway_backend;

        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;

        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;

        proxy_buffering off;
    }
}
```

Replace the example hostname, certificate paths and backend address with your deployment values.

## **3. Web4 Gateway requirements**

| Component           | Responsibility                        |
| ------------------- | ------------------------------------- |
| TLS termination     | Secure public client connections      |
| WebSocket upgrade   | Correctly forward Upgrade headers     |
| Identity middleware | Authenticate clients before upgrade   |
| Trust engine        | Apply Web4 authorization policies     |
| Connection manager  | Track active sessions                 |
| Message router      | Route messages to agents and services |
| Heartbeat           | Detect stale connections              |
| Rate limiter        | Prevent connection and message abuse  |
| Audit engine        | Record security-relevant events       |

**Important implementation details:**

- Validate `Origin` and authenticate before accepting the WebSocket upgrade.
- Never trust arbitrary `X-Forwarded-For` headers. Only trust headers from configured proxies.
- Configure load-balancer idle timeouts and WebSocket ping/pong heartbeats.
- A connection remains attached to one backend after upgrade. Sticky sessions are generally unnecessary for an established WebSocket, but reconnects need session recovery.
- If multiple backend instances share sessions or message routing, introduce a shared event bus or pub/sub layer.
- Consider disabling `permessage-deflate` unless you need it and have assessed compression-related risks.

## **4. Repository inspection**

Repository needs implementation

I checked [`auraecosystem/web4-gateway`](https://github.com/auraecosystem/web4-gateway?utm_source=chatgpt.com). The repository exists, but its `main` branch currently has an empty README and I could not find the expected application files (`package.json`, server entrypoint or proxy configuration).

I therefore cannot claim that this architecture is already implemented in the repository.

## **5. Recommended target architecture**

```bash
web4-gateway/
├── src/
│   ├── server/
│   │   ├── http-server.js
│   │   └── websocket-server.js
│   ├── gateway/
│   │   ├── connection-manager.js
│   │   ├── message-router.js
│   │   └── session-manager.js
│   ├── identity/
│   │   └── authentication.js
│   ├── trust/
│   │   └── trust-policy.js
│   ├── middleware/
│   │   ├── request-context.js
│   │   ├── proxy-verification.js
│   │   └── rate-limit.js
│   ├── agents/
│   │   └── agent-router.js
│   └── observability/
│       ├── metrics.js
│       └── audit.js
├── config/
├── deploy/
│   ├── nginx.conf
│   └── docker-compose.yml
├── tests/
│   ├── websocket.test.js
│   ├── proxy.test.js
│   └── security.test.js
├── package.json
└── README.md
```

**My recommendation:** Make the load balancer the public transport boundary, while Web4 Gateway owns connection lifecycle, identity, trust evaluation and message routing. This keeps TLS infrastructure separate from Web4's application-level security and intelligence.

>The next implementation decision is whether you want **NGINX or HAProxy** as the reference load balancer.
