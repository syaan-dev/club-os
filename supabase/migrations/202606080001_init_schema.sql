-- Club OS schema (consolidated).
-- Tables, indexes and updated_at triggers for onboarding, members, dues,
-- ledger, audit trail, activities (meetings/polls/announcements) and
-- announcement read receipts. RLS lives in 202606080002_rls.sql; server-side
-- functions/triggers live in 202606080003_functions.sql.

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

-- ---------------------------------------------------------------------------
-- Core: clubs, members, invites
-- ---------------------------------------------------------------------------

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

-- ---------------------------------------------------------------------------
-- Dues: plans, cycles, member dues
-- ---------------------------------------------------------------------------

create table if not exists public.dues_plans (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  name varchar(100) not null,
  amount numeric(12,2) not null check (amount > 0),
  frequency varchar(20) not null check (frequency in ('one_time','monthly','quarterly')),
  grace_days int not null default 0 check (grace_days >= 0),
  is_active boolean not null default true,
  auto_generate boolean not null default false,
  start_date date,
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

-- Idempotency: a plan never has two cycles with the same label.
create unique index if not exists uq_dues_cycles_plan_label
  on public.dues_cycles (dues_plan_id, cycle_label);

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

-- ---------------------------------------------------------------------------
-- Ledger + audit trail
-- ---------------------------------------------------------------------------

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

-- ---------------------------------------------------------------------------
-- Activities: meetings, polls/votes, announcements + read receipts
-- ---------------------------------------------------------------------------

create table if not exists public.club_meetings (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  title varchar(150) not null,
  description text,
  location varchar(200),
  scheduled_at timestamptz not null,
  status varchar(20) not null default 'scheduled'
    check (status in ('scheduled','completed','cancelled')),
  created_by uuid not null references public.members(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.club_polls (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  question varchar(300) not null,
  options jsonb not null,
  status varchar(20) not null default 'open' check (status in ('open','closed')),
  closes_at timestamptz,
  created_by uuid not null references public.members(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint club_polls_options_shape check (
    jsonb_typeof(options) = 'array'
    and jsonb_array_length(options) between 2 and 10
  )
);

create table if not exists public.poll_votes (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  poll_id uuid not null references public.club_polls(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  option_index int not null check (option_index >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (poll_id, member_id)
);

create table if not exists public.club_announcements (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  title varchar(150) not null,
  body text not null,
  created_by uuid not null references public.members(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- A row existing = the announcement is read by that member; no row = unread.
create table if not exists public.announcement_reads (
  id uuid primary key default gen_random_uuid(),
  announcement_id uuid not null references public.club_announcements(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  club_id uuid not null references public.clubs(id) on delete cascade,
  read_at timestamptz not null default now(),
  unique (announcement_id, member_id)
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index if not exists idx_members_club_id on public.members(club_id);
create index if not exists idx_members_user_id on public.members(user_id);
create index if not exists idx_dues_plans_club_id on public.dues_plans(club_id);
create index if not exists idx_dues_cycles_club_id_due_date on public.dues_cycles(club_id, due_date);
create index if not exists idx_member_dues_member_id on public.member_dues(member_id);
create index if not exists idx_member_dues_club_status on public.member_dues(club_id, status);
create index if not exists idx_transactions_club_created_at on public.transactions(club_id, created_at desc);
create index if not exists idx_audit_events_club_created_at on public.audit_events(club_id, created_at desc);
create index if not exists idx_club_meetings_club_scheduled on public.club_meetings(club_id, scheduled_at desc);
create index if not exists idx_club_polls_club_created on public.club_polls(club_id, created_at desc);
create index if not exists idx_poll_votes_poll_id on public.poll_votes(poll_id);
create index if not exists idx_poll_votes_member_id on public.poll_votes(member_id);
create index if not exists idx_club_announcements_club_created on public.club_announcements(club_id, created_at desc);
create index if not exists idx_announcement_reads_member on public.announcement_reads(member_id);
create index if not exists idx_announcement_reads_announcement on public.announcement_reads(announcement_id);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------

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

create trigger trg_club_meetings_updated_at
before update on public.club_meetings
for each row execute function public.set_updated_at();

create trigger trg_club_polls_updated_at
before update on public.club_polls
for each row execute function public.set_updated_at();

create trigger trg_poll_votes_updated_at
before update on public.poll_votes
for each row execute function public.set_updated_at();

create trigger trg_club_announcements_updated_at
before update on public.club_announcements
for each row execute function public.set_updated_at();
