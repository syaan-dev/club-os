# Club OS Phase 1 Development Steps and Status

Last updated: 2026-06-13 (Implementation status audit)

## How to use this file

- `[x]` = addressed in current workspace
- `[~]` = partially implemented
- `[ ]` = pending work
- Keep this file updated at the end of each development session

## Phase 1 Goal

Deliver onboarding and dues core:

- Phone OTP login
- Club creation and invite links
- Member directory with role assignment
- Dues plans and dues cycles
- Manual income/expense ledger
- Member dues dashboard (outstanding, paid, overdue)

## 1. Repository and Project Setup

- [x] Create project scaffold folders (`apps/mobile`, `supabase`, `functions`)
- [x] Add root README with setup notes
- [x] Add README placeholders for mobile app and functions
- [x] Initialize Expo app in `apps/mobile`
- [x] Initialize Node.js runtime/tooling for `functions` (`functions/package.json` wrapping Supabase CLI + Deno)
- [x] Add `.env.example` for mobile + functions + Supabase keys

## 2. Database Schema (Supabase/Postgres)

- [x] Create base migration for Phase 1 tables
- [x] Add `updated_at` trigger function and per-table update triggers
- [x] Add indexes for expected Phase 1 read paths
- [x] Add RLS helper functions for membership and role checks
- [x] Enable RLS on all Phase 1 club-scoped tables
- [x] Add baseline RLS policies for select/manage rules by role
- [x] Add stricter write constraints for cross-club reference validation (`202606120002_phase1_hardening.sql` BEFORE INSERT/UPDATE triggers on invites, dues plans/cycles, member dues, transactions, audit events)
- [ ] Add migration rollback/testing notes for each migration

## 3. Seed and Local Development Bootstrap

- [x] Add local seed script with demo club, owner member, dues plan, dues cycle
- [x] Seed includes initial member dues, transaction, and audit event
- [x] Add optional multi-member seed set (owner + treasurer + secretary + members) — `supabase/seed.sql` seeds owner, treasurer, secretary, 3 members, a dues plan + past-due cycle, mixed dues states (paid/overdue/waived), and income/expense transactions
- [ ] Add script notes for reseeding and deterministic IDs in test mode

## 4. Backend APIs / Serverless Functions (Phase 1)

All nine implemented as Supabase Edge Functions under `supabase/functions/` (run under the caller's JWT so RLS applies). Contracts in `functions/API_CONTRACTS.md`.

- [x] Create club endpoint/function (`create-club`)
- [x] Create invite generation endpoint/function (`create-invite`)
- [x] Create accept invite endpoint/function (`accept-invite`)
- [x] Create member role update endpoint/function (`update-member-role`)
- [x] Create dues plan endpoint/function (`create-dues-plan`)
- [x] Create dues cycle endpoint/function (`create-dues-cycle`)
- [x] Create member dues generation endpoint/function (`generate-member-dues`, wraps `generate_dues_for_cycle` RPC)
- [x] Create manual ledger entry endpoint/function (`record-transaction`)
- [x] Create dues dashboard summary endpoint/function (`dues-dashboard`)
- [x] Add audit event writes for all money and role mutations (`writeAudit` in every mutating function)

## 5. Mobile App (Expo React Native)

- [x] OTP login screen and auth state handling (Supabase OTP wired)
- [x] Club creation flow (Supabase `clubs` + owner `members` insert)
- [x] Invite members flow (shareable link) — `inviteMember()`, `clubos://join?token=...` link, contacts picker
- [x] Accept-invite / phone-claim onboarding (member-requests + member-profile screens, phone-based RLS)
- [x] Member directory screen with role assignment UI guards (Owner/Treasurer `canInvite` guard)
- [x] Dues plan + cycle creation flow (`dues.tsx`: plan form, plan list, cycle form, per-cycle "Generate dues")
- [x] Manual ledger entry form (income/expense) (`dues.tsx`: type toggle, amount, category, method, description + recent transactions list)
- [x] Member dues dashboard list and summary cards (hub: billed/collected/outstanding/overdue cards + per-member dues list, real `member_dues` data)
- [x] Error/loading/empty states for all primary screens (ScreenShell error/info + loading; empty/loading states on home, members, member-requests, hub)

## 6. Quality, Security, and Observability

- [x] Add API-level input validation and error contracts (`supabase/functions/_shared/validation.ts` + documented error codes in `functions/API_CONTRACTS.md`)
- [x] Add integration tests for role matrix (owner/treasurer/secretary/member) (`apps/mobile/__tests__/duesAndLedger.test.tsx` + `canManageFinances` matrix in `duesState.test.ts`)
- [x] Add tests for dues state transitions (`pending -> paid -> overdue/waived`) (`apps/mobile/__tests__/duesState.test.ts` + `supabase/tests/dues_and_constraints.test.sql`)
- [ ] Add structured logging with request correlation ID
- [ ] Add monitoring checklist for failed writes and RLS denials

## 7. Acceptance Criteria Tracking (Phase 1)

- [x] User can create a club in under 2 minutes (OTP → club create → owner bootstrap)
- [x] Treasurer can create a dues cycle and assign to all active members (`dues.tsx` cycle form + "Generate dues" / `generate_dues_for_cycle`)
- [x] Member sees due amount and due date in app (hub per-member dues list)
- [x] Ledger supports income and expense entries with audit metadata (`record-transaction` / manual ledger form + audit events)

## 8. Currently Addressed Changes (Snapshot)

These items are already implemented in this repository:

- [x] Scaffolded core directories:
  - `apps/mobile`
  - `functions`
  - `supabase/migrations`
- [x] Added docs:
  - `README.md`
  - `apps/mobile/README.md`
  - `functions/README.md`
  - `supabase/README.md`
- [x] Added Phase 1 schema migration:
  - `supabase/migrations/202606080001_phase1_init.sql`
- [x] Added Phase 1 indexes and RLS migration:
  - `supabase/migrations/202606080002_phase1_rls.sql`
- [x] Added local seed script:
  - `supabase/seed.sql`
- [x] Added env templates:
  - `.env.example`
  - `apps/mobile/.env.example`
- [x] Wired initial Supabase mobile auth/data integration:
  - OTP send + verify (now in `apps/mobile/app/index.tsx` + `src/ClubOsContext.tsx`)
  - Club create + owner member bootstrap (`club.tsx` / `createClub()`)
  - Supabase client config in `apps/mobile/lib/supabase.ts`
- [x] Refactored mobile from single `App.tsx` to Expo Router screens under `apps/mobile/app/`
- [x] Invite + onboarding vertical slice (mobile only, direct client DB + RLS):
  - `inviteMember()` creates `members` + `club_invites` rows and a shareable `clubos://join` link
  - Invited-user inbox (`member-requests.tsx`), accept/decline, profile completion (`member-profile.tsx`)
  - Phone-claim RLS policies in migrations `202606090002`–`202606120001`
- [x] Mobile smoke tests in `apps/mobile/__tests__/App.test.tsx` (OTP, home-with-invites, routing)
- [x] Server-side API layer + dues lifecycle + tests (this iteration):
  - DB hardening migration `supabase/migrations/202606120002_phase1_hardening.sql` (6 cross-club integrity triggers + dues RPCs `generate_dues_for_cycle`, `record_due_payment`, `waive_member_due`, `mark_overdue_dues`)
  - Multi-member `supabase/seed.sql` with mixed dues states + transactions
  - Nine Supabase Edge Functions in `supabase/functions/` with shared `_shared/{cors,validation,http,members}.ts`
  - Node tooling `functions/package.json` + `functions/API_CONTRACTS.md`
  - Mobile dues & ledger UI `apps/mobile/app/dues.tsx` + context wiring, pure logic `apps/mobile/src/dues.ts`
  - Tests: `apps/mobile/__tests__/duesState.test.ts`, `apps/mobile/__tests__/duesAndLedger.test.tsx`, `supabase/tests/dues_and_constraints.test.sql`, `supabase/functions/_shared/validation.test.ts`

## 9. Immediate Next Execution Order

1. Add first serverless functions for club + invites + dues cycle
2. Implement invite members flow (link generation + accept)
3. Implement dues and ledger endpoints + screens
4. Add integration tests for role matrix and dues state transitions
5. Run acceptance checklist with one pilot test dataset

## 10. Next Sprint Task List

Sprint objective: close onboarding + invitations vertical slice with production-safe API contracts.

- [x] Create Edge Function: `create-club` with request validation, idempotency key support, and audit event write.
- [x] Create Edge Function: `create-invite` with token generation, expiry handling, and role guard (`owner|treasurer`).
- [x] Create Edge Function: `accept-invite` to activate membership and link `auth.users` to `members.user_id`.
- [ ] Replace direct client DB inserts for club creation with `create-club` function call. (Intentionally deferred — Edge Functions are an additive API layer; mobile keeps direct RLS-protected writes for now.)
- [x] Add mobile invite flow UI (generate link + share + pending invites list).
- [x] Add deterministic local test data scenario: owner + treasurer + secretary + 3 members.
- [ ] Add API contract doc for onboarding endpoints (request/response/error format).
- [ ] Add smoke tests for OTP login and club creation happy path + validation errors.
