# Club OS Edge Function API Contracts (Phase 1)

All functions live in [`supabase/functions/`](../supabase/functions) and run on the
Supabase Edge Runtime (Deno 2). They form an **additive server-side API layer**;
the mobile app currently writes directly to Postgres (RLS-protected) for the
flows that already shipped. These functions exist so future clients (web admin,
automations, webhooks) can reuse the same authorized operations.

## Conventions

- **Method:** `POST` only. `OPTIONS` is handled for CORS preflight.
- **Auth:** Send the caller's Supabase JWT in `Authorization: Bearer <token>`.
  Every function builds a Supabase client bound to that JWT, so **Row Level
  Security applies to the caller** — functions never silently escalate.
- **Body:** JSON object. Field validation is centralized in
  [`_shared/validation.ts`](../supabase/functions/_shared/validation.ts).
- **Responses:** JSON. Success is `200`/`201`. Errors use:
  - `401` — not authenticated (`AuthError`)
  - `403` — authenticated but not authorized (role/membership)
  - `404` — referenced entity not found / not visible
  - `405` — non-POST method
  - `409` — conflict (duplicate, already-claimed, revoked invite)
  - `422` — request validation failed (`ValidationError`)
  - `400` — other database/operation errors
- **Error shape:** `{ "error": "human readable message" }`
- **Audit:** Mutations write a best-effort `audit_events` row (never blocks the
  primary operation).

---

## 1. `create-club`

Creates a club and bootstraps the caller as its active **owner**.

**Request**
```json
{ "name": "Sunrise Runners", "description": "Weekend running club" }
```
**Response `201`**
```json
{ "club": { "id": "<uuid>", "name": "Sunrise Runners" }, "ownerMemberId": "<uuid>" }
```

## 2. `create-invite`

Owner/treasurer invites someone by phone. Creates a pending `members` row plus a
`club_invites` token (7-day expiry).

**Request**
```json
{ "clubId": "<uuid>", "phone": "+919876543210", "name": "Asha", "email": "asha@example.com" }
```
**Response `201`**
```json
{ "inviteId": "<uuid>", "memberId": "<uuid>", "token": "invite_<uuid>" }
```
**Errors:** `403` not a manager · `409` phone already on record.

## 3. `accept-invite`

The invited user (authenticated via their phone) claims and activates their
membership.

**Request**
```json
{ "token": "invite_<uuid>", "name": "Asha Rao", "email": "asha@example.com", "location": "Pune", "skills": "Treasury" }
```
**Response `200`**
```json
{ "memberId": "<uuid>", "clubId": "<uuid>" }
```
**Errors:** `404` invite not found · `409` invite revoked/expired or nothing to claim.

## 4. `update-member-role`

Owner/treasurer changes a member's role. Only the **owner** may grant or remove
the `owner` role.

**Request**
```json
{ "clubId": "<uuid>", "memberId": "<uuid>", "role": "treasurer" }
```
**Response `200`**
```json
{ "memberId": "<uuid>", "role": "treasurer" }
```
**Errors:** `403` not a manager / not owner for owner changes · `404` member not found.

## 5. `create-dues-plan`

Owner/treasurer defines a recurring dues plan.

**Request**
```json
{ "clubId": "<uuid>", "name": "Monthly Membership", "amount": 1000, "frequency": "monthly", "graceDays": 3 }
```
`frequency` ∈ `one_time | monthly | quarterly`.

**Response `201`**
```json
{ "plan": { "id": "<uuid>", "name": "Monthly Membership", "amount": "1000.00", "frequency": "monthly", "grace_days": 3 } }
```

## 6. `create-dues-cycle`

Owner/treasurer opens a billing cycle for a plan.

**Request**
```json
{ "clubId": "<uuid>", "duesPlanId": "<uuid>", "cycleLabel": "2026-06", "dueDate": "2026-06-30" }
```
**Response `201`**
```json
{ "cycle": { "id": "<uuid>", "cycle_label": "2026-06", "due_date": "2026-06-30", "dues_plan_id": "<uuid>" } }
```

## 7. `generate-member-dues`

Bills every active member for a cycle. Wraps the idempotent
`generate_dues_for_cycle` RPC (re-running never double-bills).

**Request**
```json
{ "clubId": "<uuid>", "cycleId": "<uuid>" }
```
**Response `201`**
```json
{ "generated": 6 }
```
**Errors:** `403` caller not owner/treasurer (raised by the RPC).

## 8. `record-transaction`

Owner/treasurer records a manual income/expense ledger entry.

**Request**
```json
{ "clubId": "<uuid>", "type": "expense", "amount": 350, "category": "Venue", "paymentMethod": "UPI", "description": "Hall rent", "memberId": null }
```
`type` ∈ `income | expense`. `memberId` is optional.

**Response `201`**
```json
{ "transaction": { "id": "<uuid>", "type": "expense", "amount": "350.00", "category": "Venue", "payment_method": "UPI", "created_at": "..." } }
```

## 9. `dues-dashboard`

Read-only aggregated dues + ledger summary. Any active club member may call it.

**Request**
```json
{ "clubId": "<uuid>" }
```
**Response `200`**
```json
{
  "dues": {
    "totalBilled": 6000,
    "totalCollected": 2000,
    "totalOutstanding": 4000,
    "paidCount": 2,
    "pendingCount": 1,
    "overdueCount": 2,
    "waivedCount": 1,
    "collectionPercent": 33
  },
  "ledger": { "income": 1000, "expense": 350, "net": 650 }
}
```

---

## 10. `send-push` (system-to-system)

Delivers one notification to a recipient's registered Expo push tokens so it
reaches the device while the app is backgrounded/closed. **Not called with a
user JWT** — it is invoked by the database dispatch trigger
(`dispatch_push_notification`) when a `notifications` row is inserted.

- **Auth:** shared secret in `Authorization: Bearer <PUSH_WEBHOOK_SECRET>`
  (same value configured on the DB via `app.settings.push_webhook_secret`).
  Deploy with `--no-verify-jwt`.
- **Internals:** uses a **service-role** client to resolve the recipient member
  → `auth.users.id`, read `device_push_tokens`, POST to Expo
  (`https://exp.host/--/api/v2/push/send`), and delete tokens Expo reports as
  `DeviceNotRegistered`.

**Request** (mirrors a Supabase DB webhook payload)
```json
{
  "record": {
    "id": "<uuid>",
    "club_id": "<uuid>",
    "recipient_member_id": "<uuid>",
    "type": "meeting_scheduled",
    "title": "New meeting scheduled",
    "body": "AGM 2026",
    "data": { "meetingId": "<uuid>" }
  }
}
```
**Response `200`**
```json
{ "sent": 1, "invalidated": 0 }
```
Errors: `401` (bad/missing secret), `422` (missing record), `502` (Expo request
failed).

### Required environment / configuration

- Function env: `PUSH_WEBHOOK_SECRET`, plus the auto-provided `SUPABASE_URL` and
  `SUPABASE_SERVICE_ROLE_KEY`.
- Database (once): hosted Supabase denies custom `app.settings.*` GUCs (ERROR
  42501) for both `alter database` and `alter role`, so store config in
  **Supabase Vault**: `select vault.create_secret('https://<ref>.supabase.co',
  'edge_url');` and `select vault.create_secret('<same secret>',
  'push_webhook_secret');`. The dispatch trigger reads them via
  `vault.decrypted_secrets`.
- Mobile credentials: **Android** needs a Firebase `google-services.json`
  uploaded to EAS (referenced by `android.googleServicesFile`); **iOS** needs an
  APNs key + paid Apple Developer account managed via EAS credentials. Set
  `expo.extra.eas.projectId` in `app.json` (currently a placeholder).

---

## 11. `create-due-payment-link`

Creates (or reuses) a Stripe **Payment Link** for a single member due and
returns its hosted URL. Called with a **user JWT**.

- **Auth:** the caller must be the due's own member **or** a manager
  (owner/treasurer) of the due's club. Authorization is enforced first by RLS
  (the due is read with the caller's JWT) and then re-checked in code.
- **Idempotent:** if a `pending` link already exists for the due it is returned
  as-is; otherwise one is created via the Stripe API and upserted into
  `due_payment_links` (unique per `member_due_id`). The Stripe call uses an
  `Idempotency-Key` of `due-link-<dueId>`.
- **Amount** is always taken from the database (`amount - amount_paid`), never
  the client. Paid/waived/zero-remaining dues are rejected.

**Request**
```json
{ "dueId": "<uuid>" }
```
**Response `200`**
```json
{ "url": "https://buy.stripe.com/..." }
```
Errors: `401` (no JWT), `403` (not owner/manager), `404` (due not found),
`409` (due already paid/waived or nothing outstanding), `502` (Stripe request
failed).

## 12. `send-due-payment-links` (manager **or** system-to-system)

Ensures a payment link exists for each target due and inserts a
`dues_payment_link` notification (which fans out to push via the dispatch
trigger) so members receive the link.

- **Auth (two modes):**
  - **System:** shared secret in `Authorization: Bearer
    <PAYMENT_WEBHOOK_SECRET>`. The DB trigger `trg_member_due_payable` calls this
    with `{ "dueId": ... }` when a due becomes pending/overdue. Deploy with
    `--no-verify-jwt`.
  - **Manager:** a user JWT belonging to an owner/treasurer of every club the
    targeted dues belong to.
- Reuses or creates each link the same way as `create-due-payment-link`.

**Request** (one of)
```json
{ "cycleId": "<uuid>" }
{ "dueIds": ["<uuid>", "<uuid>"] }
{ "dueId": "<uuid>" }
```
**Response `200`**
```json
{ "sent": 3, "links": [ { "dueId": "<uuid>", "url": "https://buy.stripe.com/..." } ] }
```
Errors: `401` (bad secret / no JWT), `403` (JWT not a manager for a target
club), `404` (no payable dues matched), `502` (Stripe request failed).

## 13. `stripe-webhook` (system-to-system)

Receives Stripe events, verifies the signature, and reconciles completed
payments. **Not called with a user JWT** — Stripe POSTs directly. Deploy with
`--no-verify-jwt`.

- **Auth:** the raw request body is verified against the
  `Stripe-Signature` header using `STRIPE_WEBHOOK_SECRET` (HMAC-SHA256, 5-minute
  tolerance).
- **Idempotent:** each `event.id` is inserted into `processed_stripe_events`; a
  duplicate is acknowledged with `200` without re-processing. If reconciliation
  fails the row is removed and `500` is returned so Stripe retries.
- On `checkout.session.completed` it reads `metadata.dueId`, `amount_total`,
  `payment_intent`, and the session id, then calls the
  `record_gateway_due_payment` RPC (service role) which marks the due paid,
  inserts a `transactions` ledger row (source `gateway`, method `stripe`),
  flips the `due_payment_links` row to `paid`, and notifies the member
  (`dues_paid`). The RPC is itself idempotent on the payment intent.

**Request:** raw Stripe event JSON (handled verbatim — do not pre-parse).

**Response `200`**
```json
{ "received": true }
```
Errors: `400` (missing/invalid signature), `500` (reconciliation failed — Stripe
will retry).

### Required environment / configuration (Stripe)

- Function env (set via `supabase secrets set`):
  - `STRIPE_SECRET_KEY` — Stripe API secret (India account, INR).
  - `STRIPE_WEBHOOK_SECRET` — signing secret of the webhook endpoint registered
    for `checkout.session.completed`.
  - `PAYMENT_WEBHOOK_SECRET` — shared secret guarding `send-due-payment-links`;
    must equal the Vault `payment_webhook_secret` below.
  - `PAYMENT_SUCCESS_URL` *(optional)* — hosted page Stripe redirects to after
    payment.
  - `STRIPE_PAYMENT_METHOD_TYPES` *(optional, CSV)* — overrides the link's
    payment methods. Omit to use the Stripe account's default payment-method
    configuration (enable **UPI + cards** there).
- Database (once): add the trigger secret to **Supabase Vault** alongside the
  push ones: `select vault.create_secret('<same value as
  PAYMENT_WEBHOOK_SECRET>', 'payment_webhook_secret');`. `trg_member_due_payable`
  reads `edge_url` + `payment_webhook_secret` from `vault.decrypted_secrets`; if
  `edge_url` is unset (local/test) it no-ops.
- Stripe dashboard: enable UPI and card payment methods on the account's default
  payment-method configuration, and register the webhook endpoint
  `https://<ref>.functions.supabase.co/stripe-webhook` for
  `checkout.session.completed`.

> **Payment-method configuration note:** Stripe **Payment Links** use the
> account's *default* payment-method configuration rather than a per-link
> configuration ID. To target a specific `payment_method_configuration` you would
> have to switch to Checkout Sessions; the current implementation relies on the
> account-level UPI + card configuration.

---

## Local development


```bash
# From repo root — serve all functions (JWT verification disabled for local curl):
cd functions && npm run serve

# Type-check, lint, format-check (requires the Supabase CLI's bundled Deno or a
# standalone Deno install):
npm run check
npm run lint
npm run fmt:check

# Unit tests for the pure validation helpers (no network):
npm run test
```

### Example invocation

```bash
curl -i -X POST http://localhost:54321/functions/v1/create-dues-plan \
  -H "Authorization: Bearer $USER_JWT" \
  -H "Content-Type: application/json" \
  -d '{"clubId":"<uuid>","name":"Monthly Membership","amount":1000,"frequency":"monthly","graceDays":3}'
```
