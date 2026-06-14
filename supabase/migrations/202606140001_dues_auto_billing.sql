-- ---------------------------------------------------------------------------
-- Dues auto-billing
--   - dues_plans gains `auto_generate` + `start_date` so a plan can roll its
--     own billing cycles forward from an anchor date based on `frequency`.
--   - ensure_dues_cycles_for_plan(plan): idempotent catch-up that creates every
--     missing cycle between start_date and today, billing active members for
--     each new cycle. Manual cycle creation + generate_dues_for_cycle remain.
-- ---------------------------------------------------------------------------

alter table public.dues_plans
  add column if not exists auto_generate boolean not null default false;

alter table public.dues_plans
  add column if not exists start_date date;

-- Idempotency: a plan never has two cycles with the same label.
create unique index if not exists uq_dues_cycles_plan_label
  on public.dues_cycles (dues_plan_id, cycle_label);

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

grant execute on function public.ensure_dues_cycles_for_plan(uuid) to authenticated;
