-- Club OS Stripe dues payments.
--   (1) due_payment_links: one reusable Stripe Payment Link per member due
--       (created by Edge Functions with the service role; never by clients).
--   (2) processed_stripe_events: webhook idempotency ledger so a replayed
--       Stripe event can never double-credit a due.
--   (3) record_gateway_due_payment(): SECURITY DEFINER RPC invoked by the
--       stripe-webhook Edge Function to mark a due paid, write a gateway
--       ledger transaction and notify the member — all idempotently.
--   (4) on_member_due_payable(): trigger that, when configured, asks the
--       send-due-payment-links Edge Function (via pg_net) to create + deliver
--       a payment link the moment a due is assigned or goes overdue.
--
-- RLS: a member reads only their OWN payment links; managers read all links in
-- their club. Rows are written exclusively by service-role Edge Functions
-- (no client INSERT/UPDATE policy). processed_stripe_events is server-only.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.due_payment_links (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  member_due_id uuid not null references public.member_dues(id) on delete cascade,
  stripe_payment_link_id text not null,
  url text not null,
  amount numeric(12,2) not null check (amount > 0),
  currency varchar(10) not null default 'INR',
  status varchar(20) not null default 'pending'
    check (status in ('pending','paid','expired','void')),
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (member_due_id)
);

create index if not exists idx_due_payment_links_club
  on public.due_payment_links(club_id);
create index if not exists idx_due_payment_links_member
  on public.due_payment_links(member_id);
create unique index if not exists uq_due_payment_links_stripe_id
  on public.due_payment_links(stripe_payment_link_id);

drop trigger if exists trg_due_payment_links_updated_at on public.due_payment_links;
create trigger trg_due_payment_links_updated_at
before update on public.due_payment_links
for each row execute function public.set_updated_at();

-- Webhook idempotency: a Stripe event is processed at most once.
create table if not exists public.processed_stripe_events (
  event_id text primary key,
  type text not null,
  processed_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Cross-club guard (mirror of the existing assert_member_in_club triggers)
-- ---------------------------------------------------------------------------

create or replace function public.check_due_payment_link_cross_club()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_member_in_club(new.member_id, new.club_id);
  if not exists (
    select 1 from public.member_dues md
    where md.id = new.member_due_id and md.club_id = new.club_id
  ) then
    raise exception 'cross-club reference: member_due % is not in club %',
      new.member_due_id, new.club_id
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_due_payment_link_cross_club on public.due_payment_links;
create trigger trg_due_payment_link_cross_club
before insert or update on public.due_payment_links
for each row execute function public.check_due_payment_link_cross_club();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.due_payment_links enable row level security;
alter table public.processed_stripe_events enable row level security;

-- A member sees the links addressed to them; managers see all links in the
-- club. Writes happen only through service-role Edge Functions, so there is
-- deliberately no INSERT/UPDATE/DELETE policy.
drop policy if exists due_payment_links_select_self_or_manager on public.due_payment_links;
create policy due_payment_links_select_self_or_manager
on public.due_payment_links
for select
to authenticated
using (
  exists (
    select 1
    from public.members m
    where m.id = due_payment_links.member_id
      and m.user_id = auth.uid()
      and m.club_id = due_payment_links.club_id
  )
  or public.my_member_role(due_payment_links.club_id) in ('owner', 'treasurer')
);

-- processed_stripe_events has no client policies: only the service role (which
-- bypasses RLS) ever touches it.

-- ---------------------------------------------------------------------------
-- record_gateway_due_payment: webhook -> mark paid + ledger + notify
-- ---------------------------------------------------------------------------
-- Idempotent on the Stripe payment intent: a replayed webhook (or two events
-- for the same intent) credits the due at most once. Invoked by the
-- stripe-webhook Edge Function with the service role.

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
begin
  select * into _row from public.member_dues where id = _due_id;
  if _row.id is null then
    raise exception 'member due % not found', _due_id using errcode = 'no_data_found';
  end if;

  -- Idempotency: if this payment intent already produced a completed gateway
  -- transaction, do nothing and return the current row.
  if _payment_intent is not null and exists (
    select 1 from public.transactions t
    where t.club_id = _row.club_id
      and t.source = 'gateway'
      and t.status = 'completed'
      and t.description = 'stripe_pi:' || _payment_intent
  ) then
    return _row;
  end if;

  if _amount is null or _amount <= 0 then
    raise exception 'payment amount must be positive' using errcode = 'check_violation';
  end if;

  _remaining := greatest(_row.amount_due - _row.amount_paid, 0);
  _applied := least(_amount, _remaining);

  if _applied <= 0 then
    -- Already fully paid; still reconcile the link below.
    _applied := 0;
  else
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

    -- Gateway ledger entry. recorded_by is the paying member (no staff actor in
    -- a self-serve payment); description carries the Stripe intent for
    -- idempotency lookups above.
    insert into public.transactions (
      club_id, member_id, recorded_by, type, amount, category,
      payment_method, status, description, source
    ) values (
      _row.club_id, _row.member_id, _row.member_id, 'income', _applied, 'Dues',
      'stripe', 'completed', 'stripe_pi:' || coalesce(_payment_intent, ''), 'gateway'
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
    'We received your dues payment of ' || _applied::text
      || coalesce(' for ' || _cycle_label, '') || '.',
    jsonb_build_object('dueId', _row.id, 'amountPaid', _applied)
  );

  return _row;
end;
$$;

-- Only the service role (stripe-webhook) calls this; never the public roles.
revoke all on function
  public.record_gateway_due_payment(uuid, numeric, text, text) from public;
grant execute on function
  public.record_gateway_due_payment(uuid, numeric, text, text) to service_role;

-- ---------------------------------------------------------------------------
-- Auto-deliver a payment link when a due becomes payable
-- ---------------------------------------------------------------------------
-- Mirrors dispatch_push_notification: when vault holds edge_url +
-- payment_webhook_secret, pg_net POSTs to the send-due-payment-links Edge
-- Function so it can create (or reuse) a Stripe link and notify the member.
-- No-ops in local/test where edge_url is unset; never rolls back the due write.

create or replace function public.on_member_due_payable()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _edge_url text;
  _secret text;
  _should_send boolean := false;
begin
  if tg_op = 'INSERT' and new.status in ('pending', 'overdue') then
    _should_send := true;
  elsif tg_op = 'UPDATE'
    and new.status = 'overdue'
    and old.status is distinct from 'overdue' then
    _should_send := true;
  end if;

  if not _should_send then
    return new;
  end if;

  select decrypted_secret into _edge_url
    from vault.decrypted_secrets where name = 'edge_url';
  select decrypted_secret into _secret
    from vault.decrypted_secrets where name = 'payment_webhook_secret';

  if _edge_url is null or _edge_url = '' then
    return new; -- link delivery not configured (local/test)
  end if;

  perform net.http_post(
    url := _edge_url || '/functions/v1/send-due-payment-links',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || coalesce(_secret, '')
    ),
    body := jsonb_build_object('dueId', new.id)
  );
  return new;
exception
  when others then
    -- Never let link delivery roll back the dues write.
    return new;
end;
$$;

drop trigger if exists trg_member_due_payable on public.member_dues;
create trigger trg_member_due_payable
after insert or update on public.member_dues
for each row execute function public.on_member_due_payable();
