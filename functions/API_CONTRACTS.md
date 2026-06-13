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
