-- Phase 1 initial schema
-- Covers onboarding, members, dues core, manual ledger, and audit trail.

create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.clubs (
  id uuid primary key default gen_random_uuid(),
  name varchar(255) not null,
  description text,
  currency varchar(10) not null default 'INR',
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  user_id uuid references auth.users(id),
  name varchar(255) not null,
  email varchar(255),
  phone varchar(20),
  role varchar(20) not null check (role in ('owner','treasurer','secretary','member')),
  membership_status varchar(20) not null default 'invited' check (membership_status in ('invited','active','suspended','left')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uq_members_club_user_nonnull
  on public.members(club_id, user_id)
  where user_id is not null;

create table if not exists public.club_invites (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  invited_phone varchar(20),
  invited_email varchar(255),
  token varchar(255) not null unique,
  invited_by uuid not null references public.members(id),
  status varchar(20) not null default 'pending' check (status in ('pending','accepted','expired','revoked')),
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.dues_plans (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  name varchar(100) not null,
  amount numeric(12,2) not null check (amount > 0),
  frequency varchar(20) not null check (frequency in ('one_time','monthly','quarterly')),
  grace_days int not null default 0 check (grace_days >= 0),
  is_active boolean not null default true,
  created_by uuid not null references public.members(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.dues_cycles (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  dues_plan_id uuid not null references public.dues_plans(id) on delete cascade,
  cycle_label varchar(50) not null,
  due_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.member_dues (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  dues_cycle_id uuid not null references public.dues_cycles(id) on delete cascade,
  amount_due numeric(12,2) not null check (amount_due >= 0),
  amount_paid numeric(12,2) not null default 0 check (amount_paid >= 0),
  status varchar(20) not null default 'pending' check (status in ('pending','paid','overdue','waived')),
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (member_id, dues_cycle_id)
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  member_id uuid references public.members(id),
  recorded_by uuid not null references public.members(id),
  type varchar(10) not null check (type in ('income','expense')),
  amount numeric(12,2) not null check (amount > 0),
  category varchar(100) not null,
  payment_method varchar(50) not null default 'UPI',
  status varchar(20) not null default 'completed' check (status in ('pending','completed','failed','reversed')),
  description text,
  source varchar(30) not null default 'manual' check (source in ('manual','gateway','adjustment')),
  receipt_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  actor_member_id uuid references public.members(id),
  event_type varchar(100) not null,
  entity_type varchar(50) not null,
  entity_id uuid,
  event_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create trigger trg_clubs_updated_at
before update on public.clubs
for each row execute function public.set_updated_at();

create trigger trg_members_updated_at
before update on public.members
for each row execute function public.set_updated_at();

create trigger trg_dues_plans_updated_at
before update on public.dues_plans
for each row execute function public.set_updated_at();

create trigger trg_dues_cycles_updated_at
before update on public.dues_cycles
for each row execute function public.set_updated_at();

create trigger trg_member_dues_updated_at
before update on public.member_dues
for each row execute function public.set_updated_at();

create trigger trg_transactions_updated_at
before update on public.transactions
for each row execute function public.set_updated_at();
