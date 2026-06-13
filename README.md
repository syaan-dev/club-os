# Club OS

Initial Phase 1 scaffold for Club OS.

## Project Structure

- `apps/mobile` - React Native (Expo) app workspace.
- `supabase` - database migrations, RLS policies, and seed data.
- `functions` - Node.js serverless functions for integrations/workers.

## First Setup

1. Install Supabase CLI.
2. Initialize local Supabase if needed: `supabase init`.
3. Start local services: `supabase start`.
4. Apply migrations: `supabase db reset` (or `supabase migration up`).
5. Load sample data: `supabase db reset` will apply `supabase/seed.sql` automatically.

## Phase 1 Coverage

The first migration set includes:

- Clubs and member roles
- Invite links and membership states
- Dues plans/cycles/member dues
- Manual income/expense ledger
- Audit events
- RLS baseline policies for club-scoped isolation
