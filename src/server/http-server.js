import http from "node:http";

export function createHttpServer(app) {
  return http.createServer(app);
}
