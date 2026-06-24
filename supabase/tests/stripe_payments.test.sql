-- Database-level tests for the Stripe gateway dues payment RPC.
--
-- Self-contained: runs inside a single transaction that is rolled back, so it
-- never mutates your data and needs no pre-existing rows (it creates a
-- throwaway auth user if none exists):
--
--   docker exec -i supabase_db_club-os psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 -f - < supabase/tests/stripe_payments.test.sql
--
-- Any failed assertion raises an exception and aborts with a non-zero exit code.

begin;

do $$
declare
  u uuid;
  club_a uuid;
  owner_a uuid;
  plan uuid;
  cycle uuid;
  due_id uuid;
  row_after public.member_dues;
  tx_count int;
  notif_count int;
  link_status text;
begin
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

  insert into public.clubs(name, description, created_by)
  values ('Stripe Test Club', 'a', u) returning id into club_a;

  insert into public.members(club_id, user_id, name, role, membership_status, is_active)
  values (club_a, u, 'Owner A', 'owner', 'active', true) returning id into owner_a;

  perform set_config('request.jwt.claims',
    json_build_object('sub', u::text, 'role', 'authenticated')::text, true);

  insert into public.dues_plans(club_id, name, amount, frequency, created_by)
  values (club_a, 'Plan', 500, 'monthly', owner_a) returning id into plan;
  insert into public.dues_cycles(club_id, dues_plan_id, cycle_label, due_date)
  values (club_a, plan, '2026-06', current_date + 7) returning id into cycle;

  perform public.generate_dues_for_cycle(cycle);
  select id into due_id from public.member_dues
    where dues_cycle_id = cycle and member_id = owner_a;

  -- Seed a pending payment link so the RPC can reconcile it.
  insert into public.due_payment_links(
    club_id, member_id, member_due_id, stripe_payment_link_id, url, amount, status
  ) values (
    club_a, owner_a, due_id, 'plink_test_1', 'https://buy.stripe.com/test_1', 500, 'pending'
  );

  ----------------------------------------------------------------------------
  -- 1. Gateway payment marks the due paid, writes a gateway ledger row,
  --    reconciles the link and notifies the member.
  ----------------------------------------------------------------------------
  row_after := public.record_gateway_due_payment(due_id, 500, 'pi_test_1', 'cs_test_1');
  if row_after.status <> 'paid' or row_after.amount_paid <> 500 then
    raise exception 'ASSERT FAILED: due should be fully paid, got % / %',
      row_after.status, row_after.amount_paid;
  end if;

  select count(*) into tx_count from public.transactions
    where club_id = club_a and source = 'gateway'
      and description = 'stripe_pi:pi_test_1';
  if tx_count <> 1 then
    raise exception 'ASSERT FAILED: expected 1 gateway transaction, got %', tx_count;
  end if;

  select status into link_status from public.due_payment_links
    where member_due_id = due_id;
  if link_status <> 'paid' then
    raise exception 'ASSERT FAILED: payment link should be paid, got %', link_status;
  end if;

  select count(*) into notif_count from public.notifications
    where recipient_member_id = owner_a and type = 'dues_paid';
  if notif_count <> 1 then
    raise exception 'ASSERT FAILED: expected 1 dues_paid notification, got %', notif_count;
  end if;

  ----------------------------------------------------------------------------
  -- 2. Idempotency: replaying the same payment intent does not double-credit.
  ----------------------------------------------------------------------------
  row_after := public.record_gateway_due_payment(due_id, 500, 'pi_test_1', 'cs_test_1');
  if row_after.amount_paid <> 500 then
    raise exception 'ASSERT FAILED: replay must not exceed amount_due, got %',
      row_after.amount_paid;
  end if;

  select count(*) into tx_count from public.transactions
    where club_id = club_a and source = 'gateway'
      and description = 'stripe_pi:pi_test_1';
  if tx_count <> 1 then
    raise exception 'ASSERT FAILED: replay created a duplicate transaction (% rows)', tx_count;
  end if;

  raise notice 'ALL STRIPE PAYMENT TESTS PASSED';
end;
$$;

rollback;
