# Supabase Database

## Contents

- `migrations/202606080001_phase1_init.sql` - core schema for Phase 1
- `migrations/202606080002_phase1_rls.sql` - indexes and RLS baseline policies
- `seed.sql` - sample club bootstrap for local development

## Apply Migrations

Run from repository root:

- `supabase db reset` (local)
- `supabase migration up` (managed environments)

## Notes

- Policies are intentionally strict for money and role-sensitive writes.
- RLS helper functions rely on active membership (`membership_status='active'` and `is_active=true`).
