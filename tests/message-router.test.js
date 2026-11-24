import test from "node:test";
import assert from "node:assert/strict";
import { routeMessage } from "../src/message-router.js";

test("responds to application ping", () => {
  const result = routeMessage({
    raw: Buffer.from(JSON.stringify({ type: "ping" })),
    senderId: "sender",
    connections: { sendTo: () => false }
  });
  assert.equal(result.response.type, "pong");
});

test("routes a message to a live recipient", () => {
  let recipient;
  const result = routeMessage({
    raw: Buffer.from(JSON.stringify({ type: "message", to: "receiver", payload: { ok: true } })),
    senderId: "sender",
    connections: { sendTo: (id, message) => { recipient = { id, message }; return true; } }
  });
  assert.equal(result.response.type, "accepted");
  assert.equal(recipient.id, "receiver");
  assert.equal(recipient.message.from, "sender");
  assert.deepEqual(recipient.message.payload, { ok: true });
});

test("rejects malformed and unsupported envelopes", () => {
  const connections = { sendTo: () => false };
  assert.equal(routeMessage({ raw: Buffer.from("{"), senderId: "a", connections }).error, "INVALID_JSON");
  assert.equal(routeMessage({ raw: Buffer.from("[]"), senderId: "a", connections }).error, "INVALID_ENVELOPE");
  assert.equal(routeMessage({ raw: Buffer.from('{"type":"unknown"}'), senderId: "a", connections }).error, "UNSUPPORTED_MESSAGE");
});

test("reports unavailable recipients", () => {
  const result = routeMessage({
    raw: Buffer.from('{"type":"message","to":"missing"}'),
    senderId: "sender",
    connections: { sendTo: () => false }
  });
  assert.equal(result.error, "RECIPIENT_UNAVAILABLE");
});
