import { loadConfig } from "./config/index.js";
import { buildGateway } from "./src/server.js";

const config = loadConfig();
const gateway = buildGateway(config);

gateway.server.listen(config.port, config.host, () => {
  process.stdout.write(`Web4 Gateway listening on ${config.host}:${config.port}\n`);
});

const shutdown = () => gateway.close().finally(() => process.exit(0));
process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
