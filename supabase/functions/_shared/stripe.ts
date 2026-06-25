// Shared Stripe helpers for the dues payment flow.
//
// Two concerns, both dependency-free (Web Crypto + fetch) so they can be unit
// tested under `deno test` without network access for the signature path:
//   - createDuePaymentLink(): POST /v1/payment_links with an inline price so a
//     reusable hosted URL is minted per due (UPI + cards come from the Stripe
//     account's payment-method configuration; override with paymentMethodTypes).
//   - verifyStripeSignature(): validates the `Stripe-Signature` header against
//     the endpoint signing secret, exactly as the Stripe SDK would.

const STRIPE_API_BASE = "https://api.stripe.com/v1";

export type CreateDuePaymentLinkParams = {
  secretKey: string;
  amount: number; // major units (rupees)
  currency: string; // ISO code, e.g. "INR"
  productName: string;
  metadata: Record<string, string>;
  successUrl?: string;
  // Optional explicit payment method allow-list. When omitted, the account's
  // default payment-method configuration decides (recommended: enable UPI +
  // card in the Stripe Dashboard).
  paymentMethodTypes?: string[];
};

export type StripePaymentLink = {
  id: string;
  url: string;
};

// Convert major units to the smallest currency unit Stripe expects (paise for
// INR). Stripe rejects fractional minor units, so round to an integer.
export function toMinorUnits(amount: number): number {
  return Math.round(amount * 100);
}

export async function createDuePaymentLink(
  params: CreateDuePaymentLinkParams,
): Promise<StripePaymentLink> {
  const form = new URLSearchParams();
  form.set("line_items[0][quantity]", "1");
  form.set(
    "line_items[0][price_data][currency]",
    params.currency.toLowerCase(),
  );
  form.set(
    "line_items[0][price_data][unit_amount]",
    String(toMinorUnits(params.amount)),
  );
  form.set(
    "line_items[0][price_data][product_data][name]",
    params.productName,
  );

  for (const [key, value] of Object.entries(params.metadata)) {
    form.set(`metadata[${key}]`, value);
  }

  if (params.successUrl) {
    form.set("after_completion[type]", "redirect");
    form.set("after_completion[redirect][url]", params.successUrl);
  }

  if (params.paymentMethodTypes && params.paymentMethodTypes.length > 0) {
    params.paymentMethodTypes.forEach((pm, i) => {
      form.set(`payment_method_types[${i}]`, pm);
    });
  }

  const resp = await fetch(`${STRIPE_API_BASE}/payment_links`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
      // Idempotency-Key is set by the caller per due to dedupe retries.
      ...(params.metadata.dueId
        ? { "Idempotency-Key": `due-link-${params.metadata.dueId}` }
        : {}),
    },
    body: form.toString(),
  });

  const json = await resp.json();
  if (!resp.ok) {
    const message = json?.error?.message ?? "Failed to create Stripe payment link";
    throw new Error(message);
  }
  return { id: json.id as string, url: json.url as string };
}

// ---------------------------------------------------------------------------
// Webhook signature verification (Stripe scheme v1, HMAC-SHA256).
// ---------------------------------------------------------------------------

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export type ParsedSignatureHeader = {
  timestamp: number;
  signatures: string[];
};

export function parseSignatureHeader(header: string): ParsedSignatureHeader {
  let timestamp = 0;
  const signatures: string[] = [];
  for (const part of header.split(",")) {
    const [key, value] = part.split("=");
    if (key === "t") {
      timestamp = Number(value);
    } else if (key === "v1" && value) {
      signatures.push(value);
    }
  }
  return { timestamp, signatures };
}

// Validates the Stripe-Signature header. Returns true when at least one v1
// signature matches HMAC-SHA256(`${t}.${rawBody}`) under the secret and the
// timestamp is within tolerance (default 5 minutes, matching Stripe's SDK).
export async function verifyStripeSignature(
  rawBody: string,
  signatureHeader: string,
  secret: string,
  toleranceSeconds = 300,
): Promise<boolean> {
  if (!signatureHeader || !secret) {
    return false;
  }
  const { timestamp, signatures } = parseSignatureHeader(signatureHeader);
  if (!timestamp || signatures.length === 0) {
    return false;
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSeconds - timestamp) > toleranceSeconds) {
    return false;
  }

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signed = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${timestamp}.${rawBody}`),
  );
  const expected = toHex(signed);

  return signatures.some((sig) => timingSafeEqual(sig, expected));
}
