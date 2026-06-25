// stripe-webhook: receives Stripe events for dues payments. Authenticated by
// the Stripe signature (NOT a user JWT), so deploy with `--no-verify-jwt`.
//
// On `checkout.session.completed` it marks the linked due paid, writes a
// gateway ledger transaction and notifies the member — all via the idempotent
// record_gateway_due_payment RPC. A processed-events table guards against
// replays; a failed RPC unwinds that guard so Stripe's retry can succeed.
import { corsHeaders } from "../_shared/cors.ts";
import { errorResponse, getServiceClient, jsonResponse } from "../_shared/http.ts";
import { verifyStripeSignature } from "../_shared/stripe.ts";

type StripeEvent = {
  id?: string;
  type?: string;
  data?: { object?: Record<string, unknown> };
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  const secret = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";
  const signature = req.headers.get("Stripe-Signature") ?? "";
  const rawBody = await req.text();

  const valid = await verifyStripeSignature(rawBody, signature, secret);
  if (!valid) {
    return errorResponse("Invalid signature", 400);
  }

  let event: StripeEvent;
  try {
    event = JSON.parse(rawBody) as StripeEvent;
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  if (!event.id || !event.type) {
    return errorResponse("Missing event id or type", 422);
  }

  const svc = getServiceClient();

  // Idempotency: claim the event. A unique violation means it's already done.
  const { error: claimError } = await svc
    .from("processed_stripe_events")
    .insert({ event_id: event.id, type: event.type });

  if (claimError) {
    // 23505 = unique_violation -> duplicate delivery, ack without reprocessing.
    if ((claimError as { code?: string }).code === "23505") {
      return jsonResponse({ received: true, duplicate: true });
    }
    return errorResponse(claimError.message, 500);
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = (event.data?.object ?? {}) as Record<string, unknown>;
      const metadata = (session.metadata ?? {}) as Record<string, string>;
      const dueId = metadata.dueId;

      if (dueId) {
        const amountTotal = Number(session.amount_total ?? 0);
        const amount = amountTotal / 100; // minor units -> major
        const paymentIntent = typeof session.payment_intent === "string"
          ? session.payment_intent
          : (session.payment_intent as { id?: string } | null)?.id ?? null;

        const { error: rpcError } = await svc.rpc(
          "record_gateway_due_payment",
          {
            _due_id: dueId,
            _amount: amount,
            _payment_intent: paymentIntent,
            _checkout_session: typeof session.id === "string"
              ? session.id
              : null,
          },
        );

        if (rpcError) {
          throw new Error(rpcError.message);
        }
      }
    }
  } catch (err) {
    // Unwind the idempotency claim so Stripe's retry can reprocess.
    await svc.from("processed_stripe_events").delete().eq("event_id", event.id);
    const message = err instanceof Error ? err.message : "Processing failed";
    return errorResponse(message, 500);
  }

  return jsonResponse({ received: true });
});
