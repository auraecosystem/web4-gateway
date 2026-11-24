This introduces an important capability to the Web4 Gateway: **browser automation through the Model Context Protocol (MCP)**.

You're combining three components:

1. **Node.js HTTP server** — handles incoming Web4 requests.
2. **Playwright MCP** — provides browser automation capabilities.
3. **MCP SSE transport** — exposes an event-stream connection for MCP clients.

I recommend implementing this as a dedicated Web4 Browser Automation Service, mounted alongside identity, trust, agents, and blockchain services.

One architectural detail matters: the SSE transport needs a corresponding message endpoint, and the Playwright connection should be managed per client session rather than recreated for every arbitrary HTTP request.

## **1. Recommended Web4 MCP browser architecture**

**Web4 Gateway**

HTTP / Express 5

**MCP Session Manager**

Authentication · Session lifecycle · Limits

**SSE Transport**

Server events

**Message Endpoint**

MCP requests

**Playwright MCP**

Browser · Navigation · Interaction · Inspection

## **2. Production-oriented implementation**

I would separate the browser MCP server from the main Express application.

```

'use strict';

import http from 'node:http';
import crypto from 'node:crypto';

import { createConnection } from '@playwright/mcp';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';

const PORT = Number(process.env.WEB4_BROWSER_PORT || 3100);

const sessions = new Map();

const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

    // Health endpoint
    if (req.method === 'GET' && url.pathname === '/health') {
        res.writeHead(200, {
            'Content-Type': 'application/json'
        });

        return res.end(JSON.stringify({
            status: 'healthy',
            service: 'web4-browser-mcp'
        }));
    }

    // Establish an MCP SSE session
    if (req.method === 'GET' && url.pathname === '/sse') {
        let connection;
        let transport;
        let sessionId;

        try {
            sessionId = crypto.randomUUID();

            connection = await createConnection({
                browser: {
                    launchOptions: {
                        headless: true
                    }
                }
            });

            transport = new SSEServerTransport(
                '/messages',
                res
            );

            sessions.set(sessionId, {
                connection,
                transport
            });

            res.on('close', () => {
                sessions.delete(sessionId);

                Promise.resolve(connection.close?.())
                    .catch(console.error);
            });

            await connection.connect(transport);

        } catch (error) {
            sessions.delete(sessionId);

            console.error('MCP connection failed:', error);

            if (!res.headersSent) {
                res.writeHead(500);
                res.end('MCP connection failed');
            }
        }

        return;
    }

    // Handle MCP messages
    if (req.method === 'POST' && url.pathname === '/messages') {
        const sessionId = url.searchParams.get('sessionId');

        const session = sessionId
            ? sessions.get(sessionId)
            : undefined;

        if (!session) {
            res.writeHead(404);
            return res.end('Unknown MCP session');
        }

        try {
            await session.transport.handlePostMessage(req, res);
        } catch (error) {
            console.error('MCP message error:', error);

            if (!res.headersSent) {
                res.writeHead(500);
                res.end('MCP message processing failed');
            }
        }

        return;
    }

    res.writeHead(404);
    res.end('Not found');
});

server.listen(PORT, '127.0.0.1', () => {
    console.log(`Web4 Browser MCP listening on ${PORT}`);
});

```

**Important implementation notes:**

- This uses the legacy SSE transport API, not the newer Streamable HTTP transport.
- Verify that your installed `@playwright/mcp` version exposes the shown `createConnection` interface.
- Verify the exact session lifecycle methods supported by your installed SDK.
- The example is a starting point, not a complete production security boundary.
- Before exposing it publicly, add authentication, session ownership checks, connection limits, browser resource limits, and safe browser navigation policies.
- The `sessionId` must be bound to an authenticated client; do not treat an unguessable UUID alone as authorization.

## **3. Install dependencies**

```
npm install express @playwright/mcp \
  @modelcontextprotocol/sdk playwright
```

## **4. Web4 integration endpoints**

| Endpoint                       | Responsibility                |
| ------------------------------ | ----------------------------- |
| `/mcp/browser/sse`             | Browser MCP connection        |
| `/mcp/browser/messages`        | MCP message exchange          |
| `/api/v1/browser/health`       | Browser service health        |
| `/api/v1/browser/sessions`     | Authorized session management |
| `/api/v1/browser/capabilities` | Browser capabilities          |

## **5. Recommended extensions**

- Browser identity integration with DID/LCT.
- Trust-policy enforcement before browser actions.
- MCP tool discovery and registration.
- A2A-compatible browser agent orchestration.
- Isolated browser contexts per identity.
- Browser activity audit logs.
- Controlled access to local and remote resources.

One architectural recommendation: adopt **Streamable HTTP as the primary transport for new MCP deployments**, while retaining SSE as a compatibility adapter where required. This gives Web4 a more maintainable integration path.

The result is a browser automation subsystem that can serve Web4 agents, AI applications, and authorized MCP clients without coupling browser execution to your core gateway.
