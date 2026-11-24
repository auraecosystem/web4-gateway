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
