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

Full request/response/error contracts: [`API_CONTRACTS.md`](./API_CONTRACTS.md).

## Shared modules

- [`_shared/validation.ts`](../supabase/functions/_shared/validation.ts) — pure,
  dependency-free request validators (unit-tested in `validation.test.ts`).
- [`_shared/http.ts`](../supabase/functions/_shared/http.ts) — `handlePost`
  wrapper, JWT-bound client factory, JSON/error responses, audit helper.
- [`_shared/cors.ts`](../supabase/functions/_shared/cors.ts) — CORS headers.
- [`_shared/members.ts`](../supabase/functions/_shared/members.ts) — resolve the
  caller's active membership + role.

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

## Phase 3 (future)

- Payment gateway webhooks
- Reconciliation pipeline
- Reminder scheduler workers
