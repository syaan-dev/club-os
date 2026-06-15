# Supabase Edge Functions

Deno 2 Edge Functions for Club OS. Tooling (`npm` scripts) and full API
contracts live in [`../../functions/`](../../functions): see
[`README.md`](../../functions/README.md) and
[`API_CONTRACTS.md`](../../functions/API_CONTRACTS.md).

```
_shared/        cors, validation (+ tests), http, members helpers
create-club/    create a club + bootstrap owner
create-invite/  invite member by phone (owner/treasurer)
accept-invite/  claim & activate membership (invited user)
update-member-role/  change a member's role
create-dues-plan/    define a dues plan (owner/treasurer)
create-dues-cycle/   open a billing cycle (owner/treasurer)
generate-member-dues/ bill active members via RPC (idempotent)
record-transaction/  manual income/expense ledger entry
dues-dashboard/      aggregated dues + ledger summary (read-only)
send-push/      deliver a notification to Expo push tokens (system-to-system)
```

Push notifications (Expo + FCM/APNs) setup, EAS project id, and how to trigger
a notification: [`send-push/README.md`](./send-push/README.md).

Each function is a `Deno.serve(handlePost(...))` handler that runs under the
**caller's JWT**, so Row Level Security applies. Mutations validate input via
`_shared/validation.ts` and write a best-effort `audit_events` row.
