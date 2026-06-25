// Unit tests for the Stripe helpers. Run with:
//   deno test supabase/functions/_shared/stripe.test.ts
import { assert, assertEquals } from "jsr:@std/assert@1";
import {
  parseSignatureHeader,
  toMinorUnits,
  verifyStripeSignature,
} from "./stripe.ts";

const SECRET = "whsec_test_secret";

async function signPayload(payload: string, timestamp: number): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${timestamp}.${payload}`),
  );
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.test("toMinorUnits rounds rupees to integer paise", () => {
  assertEquals(toMinorUnits(500), 50000);
  assertEquals(toMinorUnits(499.99), 49999);
  assertEquals(toMinorUnits(0.1), 10);
});

Deno.test("parseSignatureHeader extracts timestamp and v1 signatures", () => {
  const parsed = parseSignatureHeader("t=123,v1=abc,v0=zzz,v1=def");
  assertEquals(parsed.timestamp, 123);
  assertEquals(parsed.signatures, ["abc", "def"]);
});

Deno.test("verifyStripeSignature accepts a valid, fresh signature", async () => {
  const payload = JSON.stringify({ id: "evt_1", type: "checkout.session.completed" });
  const ts = Math.floor(Date.now() / 1000);
  const sig = await signPayload(payload, ts);
  const header = `t=${ts},v1=${sig}`;
  assert(await verifyStripeSignature(payload, header, SECRET));
});

Deno.test("verifyStripeSignature rejects a tampered body", async () => {
  const payload = JSON.stringify({ id: "evt_1" });
  const ts = Math.floor(Date.now() / 1000);
  const sig = await signPayload(payload, ts);
  const header = `t=${ts},v1=${sig}`;
  assertEquals(
    await verifyStripeSignature(payload + "x", header, SECRET),
    false,
  );
});

Deno.test("verifyStripeSignature rejects a stale timestamp", async () => {
  const payload = JSON.stringify({ id: "evt_1" });
  const ts = Math.floor(Date.now() / 1000) - 1000; // outside 5m tolerance
  const sig = await signPayload(payload, ts);
  const header = `t=${ts},v1=${sig}`;
  assertEquals(await verifyStripeSignature(payload, header, SECRET), false);
});

Deno.test("verifyStripeSignature rejects empty header or secret", async () => {
  assertEquals(await verifyStripeSignature("{}", "", SECRET), false);
  assertEquals(await verifyStripeSignature("{}", "t=1,v1=x", ""), false);
});
