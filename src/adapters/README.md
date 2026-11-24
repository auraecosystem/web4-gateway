# Protocol adapter boundaries

DID, LCT, MCP and A2A adapters are provider-neutral integration points, not falsely advertised integrations. A production adapter must define its protocol/version, key or issuer trust roots, endpoint allowlists, timeouts, replay protection, schema validation and audit events. DID resolution and LCT verification remain unimplemented until the DID method, LCT schema and issuer roots are selected. MCP tool invocation and A2A task dispatch are not enabled in this release. Blockchain transaction signing is intentionally outside the gateway transport core.
