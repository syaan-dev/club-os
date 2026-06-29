-- Ledger refactor: separate transactions (renamed to ledger_entries) from dues.
-- - Rename transactions → ledger_entries
-- - Add method, source, member_due_id, external_ref, occurred_at
-- - Create post_dues_ledger_entry() helper (shared by manual + Stripe RPCs)
-- - Update record_due_payment(_due_id, _amount, _method) to post a ledger entry
-- - Update record_gateway_due_payment() to use post_dues_ledger_entry, idempotency via external_ref
-- - Create club_ledger_summary(_club_id) RPC for treasury balance
-- - Update indexes + triggers

-- ---------------------------------------------------------------------------
-- Step 1: Create new ledger_entries table (copy from transactions)
-- ---------------------------------------------------------------------------

create table if not exists public.ledger_entries (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  member_id uuid references public.members(id),
  recorded_by uuid not null references public.members(id),
  type varchar(10) not null check (type in ('income','expense')),
  amount numeric(12,2) not null check (amount > 0),
  category varchar(100) not null,
  method varchar(50) not null default 'UPI',
  status varchar(20) not null default 'completed' check (status in ('pending','completed','failed','reversed')),
  source varchar(30) not null default 'manual' check (source in ('manual','gateway','adjustment')),
  member_due_id uuid references public.member_dues(id),
  external_ref text,
  occurred_at timestamptz,
  receipt_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_ledger_entries_club_created_at on public.ledger_entries(club_id, created_at desc);
create index if not exists idx_ledger_entries_member_id on public.ledger_entries(member_id);
create index if not exists idx_ledger_entries_type on public.ledger_entries(type);
create index if not exists idx_ledger_entries_external_ref on public.ledger_entries(external_ref);

-- Idempotency: gateway payments keyed by external_ref (Stripe PI)
create unique index if not exists uq_ledger_entries_external_ref
  on public.ledger_entries(external_ref)
  where external_ref is not null;

-- ---------------------------------------------------------------------------
-- Step 2: Migrate data from transactions → ledger_entries
-- ---------------------------------------------------------------------------

insert into public.ledger_entries (
  id, club_id, member_id, recorded_by, type, amount, category,
  method, status, source, member_due_id, external_ref, occurred_at,
  receipt_url, created_at, updated_at
)
select
  t.id, t.club_id, t.member_id, t.recorded_by, t.type, t.amount, t.category,
  t.payment_method, t.status, t.source, null,
  case
    when t.source = 'gateway' and t.description like 'stripe_pi:%'
    then substr(t.description, 11)
    else null
  end as external_ref,
  t.created_at, t.receipt_url, t.created_at, t.updated_at
from public.transactions t
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Step 3: Update cross-club trigger for ledger_entries (copy + tweak)
-- ---------------------------------------------------------------------------

create or replace function public.check_ledger_entry_cross_club()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_member_in_club(new.member_id, new.club_id);
  perform public.assert_member_in_club(new.recorded_by, new.club_id);
  if new.member_due_id is not null then
    if not exists (
      select 1 from public.member_dues md
      where md.id = new.member_due_id and md.club_id = new.club_id
    ) then
      raise exception 'cross-club reference: member_due % is not in club %',
        new.member_due_id, new.club_id
        using errcode = 'check_violation';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_ledger_entry_cross_club on public.ledger_entries;
create trigger trg_ledger_entry_cross_club
before insert or update on public.ledger_entries
for each row execute function public.check_ledger_entry_cross_club();

drop trigger if exists trg_ledger_entries_updated_at on public.ledger_entries;
create trigger trg_ledger_entries_updated_at
before update on public.ledger_entries
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Step 4a: Helper to get current user's member ID in a club
-- ---------------------------------------------------------------------------

create or replace function public.my_member_id(_club_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select m.id
  from public.members m
  where m.club_id = _club_id
    and m.user_id = auth.uid()
    and m.membership_status = 'active'
    and m.is_active = true
  limit 1;
$$;

grant execute on function public.my_member_id(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Step 4b: Shared helper: post_dues_ledger_entry()
-- ---------------------------------------------------------------------------
-- Called by both manual (record_due_payment) and Stripe (record_gateway_due_payment)
-- to post a consistent income ledger entry.

create or replace function public.post_dues_ledger_entry(
  _club_id uuid,
  _member_id uuid,
  _recorded_by uuid,
  _amount numeric,
  _method varchar,
  _source varchar,
  _member_due_id uuid,
  _external_ref text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  _entry_id uuid;
begin
  if _amount is null or _amount <= 0 then
    raise exception 'ledger entry amount must be positive' using errcode = 'check_violation';
  end if;

  insert into public.ledger_entries (
    club_id, member_id, recorded_by, type, amount, category,
    method, status, source, member_due_id, external_ref, occurred_at
  ) values (
    _club_id, _member_id, _recorded_by, 'income', _amount, 'Dues',
    _method, 'completed', _source, _member_due_id, _external_ref, now()
  )
  returning id into _entry_id;

  return _entry_id;
end;
$$;

grant execute on function public.post_dues_ledger_entry(uuid, uuid, uuid, numeric, varchar, varchar, uuid, text)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Step 5: Update record_due_payment() to accept _method and post ledger
-- ---------------------------------------------------------------------------

create or replace function public.record_due_payment(
  _due_id uuid,
  _amount numeric,
  _method varchar default 'UPI'
)
returns public.member_dues
language plpgsql
security definer
set search_path = public
as $$
declare
  _row public.member_dues;
  _role text;
  _entry_id uuid;
  _recorded_by uuid;
  _amount_to_post numeric(12,2);
begin
  select * into _row from public.member_dues where id = _due_id;
  if _row.id is null then
    raise exception 'member due % not found', _due_id using errcode = 'no_data_found';
  end if;

  _role := public.my_member_role(_row.club_id);
  if _role is null or _role not in ('owner', 'treasurer') then
    raise exception 'not authorized to record payment for club %', _row.club_id
      using errcode = 'insufficient_privilege';
  end if;

  if _amount is null or _amount <= 0 then
    raise exception 'payment amount must be positive' using errcode = 'check_violation';
  end if;

  if _method is null or _method = '' then
    _method := 'UPI';
  end if;

  _recorded_by := public.my_member_id(_row.club_id);
  if _recorded_by is null then
    raise exception 'member record not found for current user in club %', _row.club_id
      using errcode = 'no_data_found';
  end if;

  -- Calculate amount to post (clamped to remaining balance)
  _amount_to_post := least(_amount, greatest(_row.amount_due - _row.amount_paid, 0));

  update public.member_dues
  set amount_paid = least(amount_paid + _amount, amount_due),
      status = case
        when amount_paid + _amount >= amount_due then 'paid'
        else status
      end,
      paid_at = case
        when amount_paid + _amount >= amount_due then now()
        else paid_at
      end
  where id = _due_id
  returning * into _row;

  -- Post the income ledger entry (manual payment).
  if _amount_to_post > 0 then
    _entry_id := public.post_dues_ledger_entry(
      _row.club_id,
      _row.member_id,
      _recorded_by,
      _amount_to_post,
      _method,
      'manual',
      _due_id,
      null
    );
  end if;

  return _row;
end;
$$;

grant execute on function public.record_due_payment(uuid, numeric, varchar) to authenticated;

-- ---------------------------------------------------------------------------
-- Step 6: Update record_gateway_due_payment() for new idempotency model
-- ---------------------------------------------------------------------------

create or replace function public.record_gateway_due_payment(
  _due_id uuid,
  _amount numeric,
  _payment_intent text,
  _checkout_session text
)
returns public.member_dues
language plpgsql
security definer
set search_path = public
as $$
declare
  _row public.member_dues;
  _remaining numeric(12,2);
  _applied numeric(12,2);
  _cycle_label text;
  _entry_id uuid;
begin
  select * into _row from public.member_dues where id = _due_id;
  if _row.id is null then
    raise exception 'member due % not found', _due_id using errcode = 'no_data_found';
  end if;

  -- Idempotency: if this payment intent already produced a completed gateway
  -- ledger entry, do nothing and return the current row.
  if _payment_intent is not null and exists (
    select 1 from public.ledger_entries le
    where le.club_id = _row.club_id
      and le.source = 'gateway'
      and le.status = 'completed'
      and le.external_ref = _payment_intent
  ) then
    return _row;
  end if;

  if _amount is null or _amount <= 0 then
    raise exception 'payment amount must be positive' using errcode = 'check_violation';
  end if;

  _remaining := greatest(_row.amount_due - _row.amount_paid, 0);
  _applied := least(_amount, _remaining);

  if _applied > 0 then
    update public.member_dues
    set amount_paid = least(amount_paid + _applied, amount_due),
        status = case
          when amount_paid + _applied >= amount_due then 'paid'
          else status
        end,
        paid_at = case
          when amount_paid + _applied >= amount_due then now()
          else paid_at
        end
    where id = _due_id
    returning * into _row;

    -- Post the income ledger entry (gateway payment, idempotent on external_ref).
    _entry_id := public.post_dues_ledger_entry(
      _row.club_id,
      _row.member_id,
      _row.member_id,
      _applied,
      'stripe',
      'gateway',
      _due_id,
      _payment_intent
    );
  end if;

  -- Reconcile the payment link record.
  update public.due_payment_links
  set status = 'paid',
      stripe_payment_intent_id = _payment_intent,
      stripe_checkout_session_id = _checkout_session,
      paid_at = now()
  where member_due_id = _due_id;

  -- Notify the member their payment landed.
  select dc.cycle_label into _cycle_label
  from public.dues_cycles dc where dc.id = _row.dues_cycle_id;

  perform public.notify_member(
    _row.club_id,
    _row.member_id,
    'dues_paid',
    'Payment received',
    'We received your dues payment of ' || coalesce(_applied, _amount)::text
      || coalesce(' for ' || _cycle_label, '') || '.',
    jsonb_build_object('dueId', _row.id, 'amountPaid', coalesce(_applied, _amount))
  );

  return _row;
end;
$$;

revoke all on function
  public.record_gateway_due_payment(uuid, numeric, text, text) from public;
grant execute on function
  public.record_gateway_due_payment(uuid, numeric, text, text) to service_role;

-- ---------------------------------------------------------------------------
-- Step 7: New RPC: club_ledger_summary() for treasury balance
-- ---------------------------------------------------------------------------

create or replace function public.club_ledger_summary(_club_id uuid)
returns table (
  income numeric,
  expense numeric,
  net numeric,
  entry_count bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  _role text;
  _income numeric(12,2);
  _expense numeric(12,2);
  _count bigint;
begin
  _role := public.my_member_role(_club_id);
  if _role is null or _role not in ('owner', 'treasurer') then
    raise exception 'not authorized to view ledger for club %', _club_id
      using errcode = 'insufficient_privilege';
  end if;

  select
    coalesce(sum(case when le.type = 'income' then le.amount else 0 end), 0),
    coalesce(sum(case when le.type = 'expense' then le.amount else 0 end), 0),
    count(*)
  into _income, _expense, _count
  from public.ledger_entries le
  where le.club_id = _club_id and le.status = 'completed';

  return query select
    _income,
    _expense,
    _income - _expense as net,
    _count;
end;
$$;

grant execute on function public.club_ledger_summary(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Step 8: RLS for ledger_entries
-- ---------------------------------------------------------------------------

alter table public.ledger_entries enable row level security;

drop policy if exists ledger_entries_select_same_club on public.ledger_entries;
create policy ledger_entries_select_same_club
on public.ledger_entries
for select
using (public.is_club_member(club_id));

drop policy if exists ledger_entries_manage_owner_treasurer on public.ledger_entries;
create policy ledger_entries_manage_owner_treasurer
on public.ledger_entries
for all
using (public.my_member_role(club_id) in ('owner','treasurer'))
with check (public.my_member_role(club_id) in ('owner','treasurer'));

-- ---------------------------------------------------------------------------
-- Step 9: Drop old transactions table (after verification)
-- ---------------------------------------------------------------------------
-- NOTE: Commented out for now. Uncomment after mobile app deployed + verified.
-- drop table if exists public.transactions;
