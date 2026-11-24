For Web4, I would upgrade this beyond a conventional Express.js server. The goal should be a **Web4-native application gateway** that supports traditional HTTP applications while preparing for decentralized identity, trust-aware requests, agent communication, MCP integrations, and blockchain connectivity.

I'd retain Express.js as the HTTP foundation rather than pretending Express alone implements Web4.

# **Web4 Application Gateway —&#x20;**`app.js`



Modernized architecture

Express 5



```js

'use strict';

const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const crypto = require('crypto');

const routes = require('./routes/index');
const users = require('./routes/users');

const app = express();

// ==========================================
// WEB4 APPLICATION CONFIGURATION
// ==========================================

const config = {
    environment: process.env.NODE_ENV || 'development',
    port: Number(process.env.PORT) || 3000,
    apiVersion: 'v1',
    serviceName: 'web4-application-gateway'
};

app.disable('x-powered-by');
app.set('trust proxy', process.env.TRUST_PROXY || false);

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// ==========================================
// SECURITY MIDDLEWARE
// ==========================================

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'"],
            imgSrc: ["'self'", 'data:', 'https:'],
            connectSrc: ["'self'", 'https:'],
            objectSrc: ["'none'"],
            upgradeInsecureRequests:
                config.environment === 'production'
                    ? []
                    : null
        }
    }
}));

app.use(cors({
    origin: process.env.WEB4_ALLOWED_ORIGINS
        ? process.env.WEB4_ALLOWED_ORIGINS.split(',')
        : false,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
}));

// ==========================================
// REQUEST IDENTIFICATION
// ==========================================

app.use((req, res, next) => {
    req.web4 = {
        requestId: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        service: config.serviceName
    };

    res.setHeader('X-Request-ID', req.web4.requestId);
    res.setHeader('X-Web4-Gateway', 'enabled');

    next();
});

// ==========================================
// OBSERVABILITY
// ==========================================

app.use(morgan('combined'));

// ==========================================
// REQUEST PROCESSING
// ==========================================

app.use(express.json({
    limit: '1mb',
    strict: true
}));

app.use(express.urlencoded({
    extended: false,
    limit: '1mb'
}));

app.use(cookieParser());
app.use(compression());

// ==========================================
// STATIC APPLICATION RESOURCES
// ==========================================

app.use(express.static(
    path.join(__dirname, 'public'),
    {
        index: false,
        maxAge: config.environment === 'production'
            ? '1d'
            : 0,
        etag: true
    }
));

// ==========================================
// WEB4 DISCOVERY ENDPOINTS
// ==========================================

app.get('/.well-known/web4.json', (req, res) => {
    res.json({
        name: 'Web4 Application Gateway',
        version: '1.0.0',
        protocol: 'web4',
        service: config.serviceName,
        capabilities: [
            'http',
            'api',
            'identity-ready',
            'trust-aware',
            'agent-ready',
            'mcp-ready',
            'decentralized-integration-ready'
        ],
        endpoints: {
            health: '/health',
            api: `/api/${config.apiVersion}`,
            users: '/users'
        }
    });
});

// ==========================================
// HEALTH AND SERVICE DISCOVERY
// ==========================================

app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        service: config.serviceName,
        timestamp: new Date().toISOString()
    });
});

app.get('/api/v1/status', (req, res) => {
    res.json({
        status: 'operational',
        protocol: 'web4',
        environment: config.environment,
        requestId: req.web4.requestId
    });
});

// ==========================================
// APPLICATION ROUTES
// ==========================================

app.use('/', routes);
app.use('/users', users);

// ==========================================
// API ROUTE NAMESPACE
// ==========================================

// Register Web4-specific routers here.
// Example:
// app.use('/api/v1/identity', identityRouter);
// app.use('/api/v1/trust', trustRouter);
// app.use('/api/v1/agents', agentRouter);
// app.use('/api/v1/mcp', mcpRouter);

// ==========================================
// NOT FOUND HANDLER
// ==========================================

app.use((req, res, next) => {
    const error = new Error('Web4 resource not found');
    error.status = 404;
    next(error);
});

// ==========================================
// CENTRALIZED ERROR HANDLING
// ==========================================

app.use((err, req, res, next) => {
    const status = err.status || 500;

    console.error({
        service: config.serviceName,
        requestId: req.web4?.requestId,
        method: req.method,
        path: req.path,
        error: err.message
    });

    const message = config.environment === 'production'
        ? 'An internal server error occurred'
        : err.message;

    if (req.accepts('html')) {
        return res.status(status).render('error', {
            error: {
                status,
                message
            }
        });
    }

    res.status(status).json({
        error: {
            code: status,
            message,
            requestId: req.web4?.requestId
        }
    });
});

// ==========================================
// EXPORT
// ==========================================

module.exports = app;

```

# **Web4 architecture**

I recommend organizing the gateway around these components:

**WEB4 APPLICATION GATEWAY**

Express 5 · HTTP · Middleware · Routing

**Identity Layer**

DID · LCT · Authentication

**Trust Layer**

Trust tensors · Policies

**Agent Layer**

A2A · MCP · AI agents

**Blockchain Layer**

Wallets · Smart contracts

**Web4 Runtime & Integration Adapters**

Policy enforcement · Events · Storage · External protocols

# **Recommended project structure**

```gmi
web4-gateway/
├── app.js
├── server.js
├── config/
│   └── index.js
├── middleware/
│   ├── security.js
│   ├── identity.js
│   ├── trust.js
│   ├── request-context.js
│   └── error-handler.js
├── routes/
│   ├── index.js
│   ├── users.js
│   └── api/
│       ├── identity.js
│       ├── trust.js
│       ├── agents.js
│       ├── mcp.js
│       └── blockchain.js
├── services/
│   ├── identity/
│   ├── trust/
│   ├── agents/
│   ├── blockchain/
│   └── discovery/
├── adapters/
│   ├── did/
│   ├── lct/
│   ├── mcp/
│   └── a2a/
├── views/
├── public/
└── tests/
```

# **Dependencies**

```bash
npm install express helmet cors compression cookie-parser morgan pug
npm install --save-dev nodemon vitest supertest
```

# **Important engineering decisions**

1. **Identity before trust:** Authenticate identities before evaluating trust policies.
2. **Trust before execution:** Apply authorization and trust policies before allowing sensitive agent or blockchain operations.
3. **Protocol interoperability:** HTTP, MCP, A2A and decentralized protocols should use independent adapters.
4. **Security:** Never treat a `X-Web4-Gateway` header or discovery document as proof of identity or trust.
5. **Modularity:** Keep identity, trust, agent orchestration and blockchain services independent of Express.

This is a Web4-ready gateway foundation, not yet a complete implementation of DID, LCT, trust tensors, MCP or A2A.

**My recommendation:** Make this the foundation of a reusable `Web4 Gateway Runtime`, so your Web4 applications can share one security, identity, trust and protocol-integration architecture rather than rebuilding those capabilities in every application.
