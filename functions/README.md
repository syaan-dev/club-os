# Serverless Functions (Phase 1)

Phase 1 ships a server-side API layer implemented as **Supabase Edge Functions**
(Deno 2) under [`../supabase/functions/`](../supabase/functions). This folder
holds the Node-based tooling wrapper (`package.json`) and the API documentation.

> The mobile app still performs RLS-protected direct DB writes for already-shipped
> flows. These Edge Functions are additive: they expose the same authorized
> operations to future clients (web admin, automations, webhooks).

## Functions

| Function | Auth | Purpose |
| --- | --- | --- |
| `create-club` | any user | Create a club + bootstrap the owner |
| `create-invite` | owner/treasurer | Invite a member by phone |
| `accept-invite` | invited user | Claim & activate membership |
| `update-member-role` | owner (for owner role) / owner+treasurer | Change a member's role |
| `create-dues-plan` | owner/treasurer | Define a dues plan |
| `create-dues-cycle` | owner/treasurer | Open a billing cycle |
| `generate-member-dues` | owner/treasurer | Bill all active members (idempotent) |
| `record-transaction` | owner/treasurer | Manual income/expense ledger entry |
| `dues-dashboard` | any active member | Aggregated dues + ledger summary |
| `send-push` | shared secret (system) | Deliver a notification to a recipient's Expo push tokens |
| `create-due-payment-link` | due owner / owner+treasurer | Create or reuse a Stripe payment link for one due |
| `send-due-payment-links` | shared secret (system) / owner+treasurer | Ensure links exist and notify members (auto on overdue or treasurer-triggered) |
| `stripe-webhook` | Stripe signature (system) | Reconcile `checkout.session.completed` → mark due paid + ledger entry |

Push setup (EAS project id, FCM/APNs credentials) and how to trigger a
notification: [`../supabase/functions/send-push/README.md`](../supabase/functions/send-push/README.md).

Full request/response/error contracts: [`API_CONTRACTS.md`](./API_CONTRACTS.md).

## Shared modules

- [`_shared/validation.ts`](../supabase/functions/_shared/validation.ts) — pure,
  dependency-free request validators (unit-tested in `validation.test.ts`).
- [`_shared/http.ts`](../supabase/functions/_shared/http.ts) — `handlePost`
  wrapper, JWT-bound client factory, JSON/error responses, audit helper.
- [`_shared/cors.ts`](../supabase/functions/_shared/cors.ts) — CORS headers.
- [`_shared/members.ts`](../supabase/functions/_shared/members.ts) — resolve the
  caller's active membership + role.
- [`_shared/stripe.ts`](../supabase/functions/_shared/stripe.ts) — Stripe payment
  link creation + webhook signature verification (raw `fetch`/Web Crypto, no SDK;
  unit-tested in `stripe.test.ts`).

## Commands

```bash
npm run serve       # supabase functions serve --no-verify-jwt
npm run deploy      # supabase functions deploy
npm run check       # deno type-check every function
npm run lint        # deno lint
npm run fmt:check   # deno fmt --check
npm run test        # deno test for _shared (validation helpers)
```

These wrap the Supabase CLI and its bundled Deno runtime. A standalone Deno
install also works.

## Stripe dues payments

Deploy the system endpoints without JWT verification and set the secrets:

```bash
supabase functions deploy stripe-webhook --no-verify-jwt
supabase functions deploy send-due-payment-links --no-verify-jwt
supabase functions deploy create-due-payment-link

supabase secrets set \
  STRIPE_SECRET_KEY=sk_live_... \
  STRIPE_WEBHOOK_SECRET=whsec_... \
  PAYMENT_WEBHOOK_SECRET=<random> \
  PAYMENT_SUCCESS_URL=https://example.com/paid   # optional
  # STRIPE_PAYMENT_METHOD_TYPES=card,upi          # optional CSV override
```

Then, once per project, store the trigger secret in Vault and register the
Stripe webhook (see [`API_CONTRACTS.md`](./API_CONTRACTS.md) §13):

```sql
select vault.create_secret('<same as PAYMENT_WEBHOOK_SECRET>', 'payment_webhook_secret');
```

Enable **UPI + cards** on the Stripe account's default payment-method
configuration and point the webhook at `…/stripe-webhook` for
`checkout.session.completed`.

## Phase 3 (future)

- Reconciliation pipeline
- Reminder scheduler workers
