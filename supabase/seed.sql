-- Seed for local development
-- Requires at least one user in auth.users (create one via local auth flow first).
-- Produces a demo club with a full role matrix (owner + treasurer + secretary +
-- 3 members), a dues plan, a dues cycle with billed dues across all members in
-- mixed states (paid / pending / overdue / waived), and a couple of ledger
-- transactions so the dashboards render meaningful data.

do $$
declare
  owner_user_id uuid;
  owner_member_id uuid;
  treasurer_member_id uuid;
  secretary_member_id uuid;
  member1_id uuid;
  member2_id uuid;
  member3_id uuid;
  club_id_var uuid;
  dues_plan_id_var uuid;
  dues_cycle_id_var uuid;
begin
  select id into owner_user_id
  from auth.users
  order by created_at asc
  limit 1;

  if owner_user_id is null then
    raise notice 'No auth.users found. Create a user first, then rerun seed.';
    return;
  end if;

  insert into public.clubs (name, description, currency, created_by)
  values ('Demo Cricket Club', 'Local development seed club', 'INR', owner_user_id)
  returning id into club_id_var;

  -- Owner (linked to the local auth user so you can log in as owner)
  insert into public.members (club_id, user_id, name, email, phone, role, membership_status, is_active)
  values (club_id_var, owner_user_id, 'Club Owner', 'owner@example.com', '+910000000000', 'owner', 'active', true)
  returning id into owner_member_id;

  -- Treasurer / Secretary / Members (active, not linked to an auth user)
  insert into public.members (club_id, user_id, name, email, phone, role, membership_status, is_active)
  values (club_id_var, null, 'Tara Treasurer', 'treasurer@example.com', '+910000000001', 'treasurer', 'active', true)
  returning id into treasurer_member_id;

  insert into public.members (club_id, user_id, name, email, phone, role, membership_status, is_active)
  values (club_id_var, null, 'Sam Secretary', 'secretary@example.com', '+910000000002', 'secretary', 'active', true)
  returning id into secretary_member_id;

  insert into public.members (club_id, user_id, name, email, phone, role, membership_status, is_active)
  values (club_id_var, null, 'Mia Member', 'mia@example.com', '+910000000003', 'member', 'active', true)
  returning id into member1_id;

  insert into public.members (club_id, user_id, name, email, phone, role, membership_status, is_active)
  values (club_id_var, null, 'Noah Member', 'noah@example.com', '+910000000004', 'member', 'active', true)
  returning id into member2_id;

  insert into public.members (club_id, user_id, name, email, phone, role, membership_status, is_active)
  values (club_id_var, null, 'Ravi Member', 'ravi@example.com', '+910000000005', 'member', 'active', true)
  returning id into member3_id;

  insert into public.dues_plans (club_id, name, amount, frequency, grace_days, created_by)
  values (club_id_var, 'Monthly Membership', 1000.00, 'monthly', 3, owner_member_id)
  returning id into dues_plan_id_var;

  -- One cycle that is already past due so overdue states are realistic.
  insert into public.dues_cycles (club_id, dues_plan_id, cycle_label, due_date)
  values (club_id_var, dues_plan_id_var, to_char(current_date, 'Mon-YYYY'), current_date - interval '2 days')
  returning id into dues_cycle_id_var;

  -- Bill every active member for the cycle (pending by default).
  insert into public.member_dues (club_id, member_id, dues_cycle_id, amount_due, amount_paid, status)
  select club_id_var, m.id, dues_cycle_id_var, 1000.00, 0, 'pending'
  from public.members m
  where m.club_id = club_id_var
    and m.membership_status = 'active'
    and m.is_active = true;

  -- Mixed states for a realistic dashboard.
  update public.member_dues
  set amount_paid = 1000.00, status = 'paid', paid_at = now()
  where dues_cycle_id = dues_cycle_id_var and member_id in (owner_member_id, treasurer_member_id);

  update public.member_dues
  set status = 'overdue'
  where dues_cycle_id = dues_cycle_id_var and member_id in (member1_id, member2_id);

  update public.member_dues
  set status = 'waived'
  where dues_cycle_id = dues_cycle_id_var and member_id = secretary_member_id;

  insert into public.transactions (club_id, member_id, recorded_by, type, amount, category, payment_method, status, description, source)
  values
    (club_id_var, owner_member_id, treasurer_member_id, 'income', 1000.00, 'Membership Dues', 'UPI', 'completed', 'Owner monthly dues', 'manual'),
    (club_id_var, null, treasurer_member_id, 'expense', 350.00, 'Ground Booking', 'Cash', 'completed', 'Weekend net practice', 'manual');

  insert into public.audit_events (club_id, actor_member_id, event_type, entity_type, entity_id, event_data)
  values (club_id_var, owner_member_id, 'club.seeded', 'club', club_id_var, jsonb_build_object('note', 'Local multi-member seed completed'));
end
$$;
