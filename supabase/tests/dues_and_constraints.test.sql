-- Database-level tests for Phase 1 dues lifecycle and cross-club integrity.
--
-- Self-contained: runs inside a single transaction that is rolled back, so it
-- never mutates your data and needs no pre-existing rows (it creates a
-- throwaway auth user if none exists):
--
--   docker exec -i supabase_db_club-os psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 -f - < supabase/tests/dues_and_constraints.test.sql
--
-- Any failed assertion raises an exception and aborts with a non-zero exit code.

begin;

do $$
declare
  u uuid;
  club_a uuid;
  club_b uuid;
  owner_a uuid;
  owner_b uuid;
  plan uuid;
  cycle uuid;
  generated int;
  overdue_count int;
  due_id uuid;
  row_after public.member_dues;
  rejected boolean;
begin
  -- Use an existing auth user if present, otherwise create a throwaway one.
  -- Everything is rolled back at the end, so this never persists.
  select id into u from auth.users order by created_at asc limit 1;
  if u is null then
    u := gen_random_uuid();
    insert into auth.users(id, instance_id, aud, role, email)
    values (
      u,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'dbtest+' || u::text || '@example.com'
    );
  end if;

  insert into public.clubs(name, description, created_by) values ('Test Club A', 'a', u) returning id into club_a;
  insert into public.clubs(name, description, created_by) values ('Test Club B', 'b', u) returning id into club_b;

  insert into public.members(club_id, user_id, name, role, membership_status, is_active)
  values (club_a, u, 'Owner A', 'owner', 'active', true) returning id into owner_a;
  insert into public.members(club_id, user_id, name, role, membership_status, is_active)
  values (club_b, null, 'Owner B', 'owner', 'active', true) returning id into owner_b;
  insert into public.members(club_id, user_id, name, role, membership_status, is_active)
  values (club_a, null, 'Member A1', 'member', 'active', true);
  insert into public.members(club_id, user_id, name, role, membership_status, is_active)
  values (club_a, null, 'Member A2', 'member', 'active', true);

  -- Authorize subsequent SECURITY DEFINER calls as Owner A.
  perform set_config('request.jwt.claims',
    json_build_object('sub', u::text, 'role', 'authenticated')::text, true);

  ----------------------------------------------------------------------------
  -- 1. Cross-club reference is rejected
  ----------------------------------------------------------------------------
  rejected := false;
  begin
    insert into public.transactions(club_id, member_id, recorded_by, type, amount, category)
    values (club_a, owner_b, owner_a, 'income', 100, 'x');
  exception when others then
    rejected := true;
  end;
  if not rejected then
    raise exception 'ASSERT FAILED: cross-club transaction reference was allowed';
  end if;

  ----------------------------------------------------------------------------
  -- 2. Dues generation bills every active member exactly once
  ----------------------------------------------------------------------------
  insert into public.dues_plans(club_id, name, amount, frequency, created_by)
  values (club_a, 'Plan', 500, 'monthly', owner_a) returning id into plan;
  insert into public.dues_cycles(club_id, dues_plan_id, cycle_label, due_date)
  values (club_a, plan, 'Cycle', current_date - 1) returning id into cycle;

  generated := public.generate_dues_for_cycle(cycle);
  if generated <> 3 then
    raise exception 'ASSERT FAILED: expected 3 dues generated, got %', generated;
  end if;

  -- Idempotent: a second run bills nobody new.
  if public.generate_dues_for_cycle(cycle) <> 0 then
    raise exception 'ASSERT FAILED: dues generation is not idempotent';
  end if;

  ----------------------------------------------------------------------------
  -- 3. State transitions: pending -> paid (partial then full)
  ----------------------------------------------------------------------------
  select id into due_id from public.member_dues where dues_cycle_id = cycle and member_id = owner_a;

  row_after := public.record_due_payment(due_id, 200);
  if row_after.status <> 'pending' or row_after.amount_paid <> 200 then
    raise exception 'ASSERT FAILED: partial payment should stay pending, got % / %', row_after.status, row_after.amount_paid;
  end if;

  row_after := public.record_due_payment(due_id, 500);
  if row_after.status <> 'paid' or row_after.amount_paid <> 500 then
    raise exception 'ASSERT FAILED: full payment should be paid and capped at amount_due, got % / %', row_after.status, row_after.amount_paid;
  end if;

  ----------------------------------------------------------------------------
  -- 4. State transition: pending -> overdue (past due date)
  ----------------------------------------------------------------------------
  overdue_count := public.mark_overdue_dues(club_a);
  if overdue_count <> 2 then
    raise exception 'ASSERT FAILED: expected 2 overdue dues, got %', overdue_count;
  end if;

  ----------------------------------------------------------------------------
  -- 5. State transition: -> waived
  ----------------------------------------------------------------------------
  select id into due_id from public.member_dues where dues_cycle_id = cycle and status = 'overdue' limit 1;
  row_after := public.waive_member_due(due_id);
  if row_after.status <> 'waived' then
    raise exception 'ASSERT FAILED: due should be waived, got %', row_after.status;
  end if;

  ----------------------------------------------------------------------------
  -- 6. Authorization: a non owner/treasurer cannot generate dues
  ----------------------------------------------------------------------------
  perform set_config('request.jwt.claims',
    json_build_object('sub', gen_random_uuid()::text, 'role', 'authenticated')::text, true);
  rejected := false;
  begin
    perform public.generate_dues_for_cycle(cycle);
  exception when others then
    rejected := true;
  end;
  if not rejected then
    raise exception 'ASSERT FAILED: non-member was allowed to generate dues';
  end if;

  raise notice 'ALL DATABASE TESTS PASSED';
end;
$$;

rollback;
