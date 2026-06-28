-- ---------------------------------------------------------------------------
-- Dues plan archiving
-- ---------------------------------------------------------------------------
-- Admins retire a dues plan by setting dues_plans.is_active = false (the column
-- already exists). Archiving stops all future billing but preserves the plan's
-- cycles, member dues, and transaction history (no cascade delete).
--
-- Auto-billing must respect the archived flag: re-create
-- ensure_dues_cycles_for_plan so it no-ops for inactive plans. Without this
-- guard an archived plan that still had auto_generate = true would keep minting
-- cycles on the next "Run auto-billing now".
-- ---------------------------------------------------------------------------

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
  _is_active boolean;
  _role text;
  _period date;
  _label text;
  _due date;
  _cycle_id uuid;
  _created int := 0;
  _n int := 0;
begin
  select club_id, frequency, grace_days, start_date, auto_generate, is_active
    into _club_id, _frequency, _grace, _start, _auto, _is_active
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

  -- Archived plans never roll new cycles forward.
  if not _is_active or not _auto or _start is null then
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

grant execute on function public.ensure_dues_cycles_for_plan(uuid) to authenticated;
