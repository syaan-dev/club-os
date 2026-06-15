-- Club OS server-side functions (consolidated).
--   (1) Cross-club referential integrity triggers. Foreign keys guarantee a
--       referenced row EXISTS, but not that it belongs to the SAME club. These
--       SECURITY DEFINER triggers reject cross-club references regardless of the
--       caller's RLS visibility.
--   (2) Dues helpers used by the mobile client / Edge Functions:
--         - generate_dues_for_cycle(cycle): bill every active member once.
--         - record_due_payment(due, amount): pending/overdue -> paid (idempotent).
--         - waive_member_due(due): -> waived.
--         - mark_overdue_dues(club): pending past due_date -> overdue.
--         - ensure_dues_cycles_for_plan(plan): roll auto-billing cycles forward.

-- ---------------------------------------------------------------------------
-- (1) Cross-club referential integrity
-- ---------------------------------------------------------------------------

create or replace function public.assert_member_in_club(_member_id uuid, _club_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if _member_id is null then
    return;
  end if;
  if not exists (
    select 1 from public.members m
    where m.id = _member_id and m.club_id = _club_id
  ) then
    raise exception 'cross-club reference: member % is not in club %', _member_id, _club_id
      using errcode = 'check_violation';
  end if;
end;
$$;

create or replace function public.check_invite_cross_club()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_member_in_club(new.invited_by, new.club_id);
  return new;
end;
$$;

create or replace function public.check_dues_plan_cross_club()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_member_in_club(new.created_by, new.club_id);
  return new;
end;
$$;

create or replace function public.check_dues_cycle_cross_club()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.dues_plans dp
    where dp.id = new.dues_plan_id and dp.club_id = new.club_id
  ) then
    raise exception 'cross-club reference: dues_plan % is not in club %', new.dues_plan_id, new.club_id
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create or replace function public.check_member_dues_cross_club()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_member_in_club(new.member_id, new.club_id);
  if not exists (
    select 1 from public.dues_cycles dc
    where dc.id = new.dues_cycle_id and dc.club_id = new.club_id
  ) then
    raise exception 'cross-club reference: dues_cycle % is not in club %', new.dues_cycle_id, new.club_id
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create or replace function public.check_transaction_cross_club()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_member_in_club(new.member_id, new.club_id);
  perform public.assert_member_in_club(new.recorded_by, new.club_id);
  return new;
end;
$$;

create or replace function public.check_audit_event_cross_club()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_member_in_club(new.actor_member_id, new.club_id);
  return new;
end;
$$;

drop trigger if exists trg_invite_cross_club on public.club_invites;
create trigger trg_invite_cross_club
before insert or update on public.club_invites
for each row execute function public.check_invite_cross_club();

drop trigger if exists trg_dues_plan_cross_club on public.dues_plans;
create trigger trg_dues_plan_cross_club
before insert or update on public.dues_plans
for each row execute function public.check_dues_plan_cross_club();

drop trigger if exists trg_dues_cycle_cross_club on public.dues_cycles;
create trigger trg_dues_cycle_cross_club
before insert or update on public.dues_cycles
for each row execute function public.check_dues_cycle_cross_club();

drop trigger if exists trg_member_dues_cross_club on public.member_dues;
create trigger trg_member_dues_cross_club
before insert or update on public.member_dues
for each row execute function public.check_member_dues_cross_club();

drop trigger if exists trg_transaction_cross_club on public.transactions;
create trigger trg_transaction_cross_club
before insert or update on public.transactions
for each row execute function public.check_transaction_cross_club();

drop trigger if exists trg_audit_event_cross_club on public.audit_events;
create trigger trg_audit_event_cross_club
before insert or update on public.audit_events
for each row execute function public.check_audit_event_cross_club();

-- ---------------------------------------------------------------------------
-- (2) Dues helpers (owner/treasurer authorized via my_member_role)
-- ---------------------------------------------------------------------------

create or replace function public.generate_dues_for_cycle(_cycle_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  _club_id uuid;
  _amount numeric(12,2);
  _role text;
  _inserted int;
begin
  select dc.club_id, dp.amount
    into _club_id, _amount
  from public.dues_cycles dc
  join public.dues_plans dp on dp.id = dc.dues_plan_id
  where dc.id = _cycle_id;

  if _club_id is null then
    raise exception 'dues cycle % not found', _cycle_id using errcode = 'no_data_found';
  end if;

  _role := public.my_member_role(_club_id);
  if _role is null or _role not in ('owner', 'treasurer') then
    raise exception 'not authorized to generate dues for club %', _club_id
      using errcode = 'insufficient_privilege';
  end if;

  insert into public.member_dues (club_id, member_id, dues_cycle_id, amount_due, amount_paid, status)
  select _club_id, m.id, _cycle_id, _amount, 0, 'pending'
  from public.members m
  where m.club_id = _club_id
    and m.membership_status = 'active'
    and m.is_active = true
    and not exists (
      select 1 from public.member_dues md
      where md.member_id = m.id and md.dues_cycle_id = _cycle_id
    );

  get diagnostics _inserted = row_count;
  return _inserted;
end;
$$;

create or replace function public.record_due_payment(_due_id uuid, _amount numeric)
returns public.member_dues
language plpgsql
security definer
set search_path = public
as $$
declare
  _row public.member_dues;
  _role text;
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

  return _row;
end;
$$;

create or replace function public.waive_member_due(_due_id uuid)
returns public.member_dues
language plpgsql
security definer
set search_path = public
as $$
declare
  _row public.member_dues;
  _role text;
begin
  select * into _row from public.member_dues where id = _due_id;
  if _row.id is null then
    raise exception 'member due % not found', _due_id using errcode = 'no_data_found';
  end if;

  _role := public.my_member_role(_row.club_id);
  if _role is null or _role not in ('owner', 'treasurer') then
    raise exception 'not authorized to waive dues for club %', _row.club_id
      using errcode = 'insufficient_privilege';
  end if;

  update public.member_dues
  set status = 'waived'
  where id = _due_id
  returning * into _row;

  return _row;
end;
$$;

create or replace function public.mark_overdue_dues(_club_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  _role text;
  _updated int;
begin
  _role := public.my_member_role(_club_id);
  if _role is null or _role not in ('owner', 'treasurer') then
    raise exception 'not authorized to update dues for club %', _club_id
      using errcode = 'insufficient_privilege';
  end if;

  update public.member_dues md
  set status = 'overdue'
  from public.dues_cycles dc
  where md.dues_cycle_id = dc.id
    and md.club_id = _club_id
    and md.status = 'pending'
    and dc.due_date < current_date;

  get diagnostics _updated = row_count;
  return _updated;
end;
$$;

-- Idempotent catch-up: create every missing cycle between start_date and today
-- for an auto-billing plan, billing active members for each new cycle.
create or replace function public.ensure_dues_cycles_for_plan(_plan_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  _club_id uuid;
  _frequency text;
  _grace int;
  _start date;
  _auto boolean;
  _role text;
  _period date;
  _label text;
  _due date;
  _cycle_id uuid;
  _created int := 0;
  _n int := 0;
begin
  select club_id, frequency, grace_days, start_date, auto_generate
    into _club_id, _frequency, _grace, _start, _auto
  from public.dues_plans
  where id = _plan_id;

  if _club_id is null then
    raise exception 'dues plan % not found', _plan_id using errcode = 'no_data_found';
  end if;

  _role := public.my_member_role(_club_id);
  if _role is null or _role not in ('owner', 'treasurer') then
    raise exception 'not authorized to manage dues for club %', _club_id
      using errcode = 'insufficient_privilege';
  end if;

  if not _auto or _start is null then
    return 0;
  end if;

  loop
    if _frequency = 'monthly' then
      _period := (_start + (_n || ' months')::interval)::date;
    elsif _frequency = 'quarterly' then
      _period := (_start + (_n * 3 || ' months')::interval)::date;
    else -- one_time
      _period := _start;
    end if;

    exit when _period > current_date;

    if _frequency = 'monthly' then
      _label := to_char(_period, 'YYYY-MM');
    elsif _frequency = 'quarterly' then
      _label := to_char(_period, 'YYYY-"Q"Q');
    else
      _label := to_char(_period, 'YYYY-MM-DD');
    end if;

    _due := (_period + (_grace || ' days')::interval)::date;

    insert into public.dues_cycles (club_id, dues_plan_id, cycle_label, due_date)
    values (_club_id, _plan_id, _label, _due)
    on conflict (dues_plan_id, cycle_label) do nothing
    returning id into _cycle_id;

    if _cycle_id is not null then
      _created := _created + 1;
      perform public.generate_dues_for_cycle(_cycle_id);
    end if;
    _cycle_id := null;

    exit when _frequency = 'one_time';
    _n := _n + 1;
  end loop;

  return _created;
end;
$$;

grant execute on function public.generate_dues_for_cycle(uuid) to authenticated;
grant execute on function public.record_due_payment(uuid, numeric) to authenticated;
grant execute on function public.waive_member_due(uuid) to authenticated;
grant execute on function public.mark_overdue_dues(uuid) to authenticated;
grant execute on function public.ensure_dues_cycles_for_plan(uuid) to authenticated;
