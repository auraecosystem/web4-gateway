
'use strict';

const crypto = require('node:crypto');

function web4RequestContext(req, res, next) {
    const requestId = crypto.randomUUID();

    // req.ip relies on Express trust-proxy configuration.
    const context = {
        requestId,
        method: req.method,
        path: req.path,
        host: req.hostname,
        protocol: req.protocol,

        client: {
            ip: req.ip,
            country: req.get('cf-ipcountry') || null,
            language: req.get('accept-language') || null,
            userAgent: req.get('user-agent') || null
        },

        network: {
            cloudflareRay: req.get('cf-ray') || null,
            proxied: Boolean(req.get('cf-ray'))
        },

        timestamp: new Date().toISOString()
    };

    req.web4 = Object.freeze(context);

    res.setHeader('X-Request-ID', requestId);

    next();
}

module.exports = web4RequestContext;
