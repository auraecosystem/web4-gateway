import { timingSafeEqual } from "node:crypto";

export function authenticateRequest(req, token) {
  const header = req.headers.authorization ?? "";
  if (!header.startsWith("Bearer ")) return null;

  const supplied = Buffer.from(header.slice(7));
  const expected = Buffer.from(token);
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    return null;
  }

  return Object.freeze({
    id: "gateway-client",
    method: "bearer",
    scopes: ["gateway:connect", "gateway:route"]
  });
}

export function requirePrincipal(token) {
  return (req, res, next) => {
    const principal = authenticateRequest(req, token);
    if (!principal) return res.status(401).json({ error: "UNAUTHENTICATED" });
    req.principal = principal;
    next();
  };
}
