-- Versioned, append-only consent records for Terms, Privacy Policy and the 18+
-- age gate. Replaces relying solely on the `terms_accepted_at` auth-metadata
-- stamp with an auditable, per-policy, per-version record (DPDP Act, 2023).
--
-- History is never mutated: there are deliberately NO update/delete policies so
-- rows are immutable from the client. Withdrawal is recorded by setting
-- `withdrawn_at` (server-side) or by inserting a new row, never by deleting.

create table if not exists public.policy_acceptances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  policy_type text not null
    check (policy_type in ('terms', 'privacy', 'age_18_plus')),
  policy_version text not null,
  content_hash text,
  accepted_at timestamptz not null default now(),
  method text,
  app_version text,
  platform text,
  locale text,
  withdrawn_at timestamptz
);

create index if not exists idx_policy_acceptances_user
  on public.policy_acceptances (user_id, policy_type, accepted_at desc);

alter table public.policy_acceptances enable row level security;

-- A user may read only their own consent history.
drop policy if exists policy_acceptances_select_self on public.policy_acceptances;
create policy policy_acceptances_select_self
  on public.policy_acceptances for select to authenticated
  using (user_id = auth.uid());

-- A user may record consent only for themselves.
drop policy if exists policy_acceptances_insert_self on public.policy_acceptances;
create policy policy_acceptances_insert_self
  on public.policy_acceptances for insert to authenticated
  with check (user_id = auth.uid());

-- No update/delete policies: the audit trail is immutable from the client.
