-- UI test-data seed for the local Supabase DB.
-- Fully self-contained: creates its own auth user, club ("Trojans") and owner,
-- then populates members, dues plans/cycles, member dues (mixed statuses),
-- ledger transactions, meetings (+RSVPs), polls (+votes) and announcements
-- (+read receipts). No pre-existing club or club_id is required.
--
-- Safe to re-run: every seeded row uses a fixed `5eed....` UUID (or is a child
-- that cascades), so a second run replaces the data instead of duplicating it.
-- The bootstrap auth user + club are upserted (kept) across runs; only the
-- seeded child rows churn. Other clubs / real auth-linked members are untouched.
--
-- Run:
--   docker exec -i supabase_db_club-os psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 -f - < supabase/snippets/seed_ui_testdata.sql

-- Fixed identifiers so the seed is fully self-contained and re-runnable.
-- club_id is stored pre-quoted (used bare as :club_id); the *_uid / owner_id
-- vars are stored raw (used as :'auth_uid' etc., which add the quotes).
-- auth_uid + member_uid are real phone-login users: signing in via OTP with
-- +919876543210 lands as the club owner, +919876543211 as a member.
\set auth_uid   '5eed7777-0000-4000-8000-000000000000'
\set member_uid '5eed7778-0000-4000-8000-000000000000'
\set club_id    '''5eed9999-0000-4000-8000-000000000000'''
\set owner_id   '5eed0000-0000-4000-8000-000000000000'

begin;

-- Bootstrap two phone-login auth users + the club so nothing pre-exists.
-- auth.users is required because clubs.created_by references it, and the
-- members rows link to these ids so the test phones can sign in. auth.users.phone
-- is stored WITHOUT the leading '+' (GoTrue convention). Upserted (kept) across
-- runs; only the seeded child rows churn.
--
-- The token columns (confirmation_token, recovery_token, email_change*) MUST be
-- '' not NULL: GoTrue scans them into non-nullable Go strings. created_at /
-- updated_at MUST be set (no DB default) — GoTrue scans created_at into a
-- *time.Time and a NULL throws "Database error finding user".
insert into auth.users (
  id, instance_id, aud, role, phone, phone_confirmed_at, email,
  created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new
)
values
  (:'auth_uid',   '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '919876543210', now(), 'owner@seed.test',  now(), now(), '', '', '', ''),
  (:'member_uid', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '919876543211', now(), 'member@seed.test', now(), now(), '', '', '', '')
on conflict (id) do update
  set phone = excluded.phone,
      phone_confirmed_at = excluded.phone_confirmed_at,
      email = excluded.email,
      created_at = coalesce(auth.users.created_at, excluded.created_at),
      updated_at = excluded.updated_at,
      confirmation_token = '',
      recovery_token = '',
      email_change = '',
      email_change_token_new = '';

-- Phone-provider identity rows (a real signup creates one). provider_id = the
-- user id; identity_data carries sub + phone. created_at/updated_at MUST be set
-- (no default) — GoTrue scans them into *time.Time and a NULL breaks login.
insert into auth.identities (provider_id, user_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
values
  (:'auth_uid',   :'auth_uid',   'phone', jsonb_build_object('sub', :'auth_uid',   'phone', '919876543210'), now(), now(), now()),
  (:'member_uid', :'member_uid', 'phone', jsonb_build_object('sub', :'member_uid', 'phone', '919876543211'), now(), now(), now())
on conflict (provider_id, provider) do update
  set identity_data = excluded.identity_data,
      created_at = coalesce(auth.identities.created_at, excluded.created_at),
      updated_at = excluded.updated_at;

insert into public.clubs (id, name, description, currency, created_by)
values (
  :club_id, 'Trojans', 'Seeded demo club for UI testing.', 'INR', :'auth_uid'
)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Clean previous seed (children cascade from these deletes / member delete).
-- ---------------------------------------------------------------------------
delete from public.transactions
where id in (
  '5eed0006-0000-4000-8000-000000000001','5eed0006-0000-4000-8000-000000000002',
  '5eed0006-0000-4000-8000-000000000003','5eed0006-0000-4000-8000-000000000004',
  '5eed0006-0000-4000-8000-000000000005','5eed0006-0000-4000-8000-000000000006',
  '5eed0006-0000-4000-8000-000000000007','5eed0006-0000-4000-8000-000000000008',
  '5eed0006-0000-4000-8000-000000000009','5eed0006-0000-4000-8000-00000000000a'
);
delete from public.club_announcements
where id in (
  '5eed0005-0000-4000-8000-000000000001','5eed0005-0000-4000-8000-000000000002',
  '5eed0005-0000-4000-8000-000000000003','5eed0005-0000-4000-8000-000000000004'
);
delete from public.club_polls
where id in (
  '5eed0004-0000-4000-8000-000000000001','5eed0004-0000-4000-8000-000000000002',
  '5eed0004-0000-4000-8000-000000000003','5eed0004-0000-4000-8000-000000000004'
);
delete from public.club_meetings
where id in (
  '5eed0003-0000-4000-8000-000000000001','5eed0003-0000-4000-8000-000000000002',
  '5eed0003-0000-4000-8000-000000000003','5eed0003-0000-4000-8000-000000000004',
  '5eed0003-0000-4000-8000-000000000005','5eed0003-0000-4000-8000-000000000006'
);
delete from public.dues_plans
where id in (
  '5eed0001-0000-4000-8000-000000000001','5eed0001-0000-4000-8000-000000000002',
  '5eed0001-0000-4000-8000-000000000003'
);
delete from public.members
where club_id = :club_id and email like '%@seed.test';

-- ---------------------------------------------------------------------------
-- Members (no user_id: directory display only; mixed roles + statuses).
-- ---------------------------------------------------------------------------
insert into public.members (id, club_id, user_id, name, email, phone, role, membership_status, is_active) values
  (:'owner_id',                            :club_id, :'auth_uid',   'Maya Kapoor', 'owner@seed.test',  '+919876543210', 'owner',     'active',  true),
  ('5eed0000-0000-4000-8000-000000000001', :club_id, null,          'Priya Sharma','priya@seed.test',  '+919800000001', 'treasurer', 'active',  true),
  ('5eed0000-0000-4000-8000-000000000002', :club_id, null, 'Arjun Menon',    'arjun@seed.test',   '+919800000002', 'secretary', 'active',  true),
  ('5eed0000-0000-4000-8000-000000000003', :club_id, :'member_uid', 'Kavya Reddy',    'kavya@seed.test',   '+919876543211', 'member',    'active',  true),
  ('5eed0000-0000-4000-8000-000000000004', :club_id, null, 'Rohan Gupta',    'rohan@seed.test',   '+919800000004', 'member',    'active',  true),
  ('5eed0000-0000-4000-8000-000000000005', :club_id, null, 'Ananya Iyer',    'ananya@seed.test',  '+919800000005', 'member',    'active',  true),
  ('5eed0000-0000-4000-8000-000000000006', :club_id, null, 'Vikram Singh',   'vikram@seed.test',  '+919800000006', 'member',    'active',  true),
  ('5eed0000-0000-4000-8000-000000000007', :club_id, null, 'Meera Nair',     'meera@seed.test',   '+919800000007', 'member',    'active',  true),
  ('5eed0000-0000-4000-8000-000000000008', :club_id, null, 'Karthik Rao',    'karthik@seed.test', '+919800000008', 'member',    'active',  true),
  ('5eed0000-0000-4000-8000-000000000009', :club_id, null, 'Sneha Patel',    'sneha@seed.test',   '+919800000009', 'member',    'invited', true),
  ('5eed0000-0000-4000-8000-00000000000a', :club_id, null, 'Aditya Kumar',   'aditya@seed.test',  '+919800000010', 'member',    'invited', true);

-- ---------------------------------------------------------------------------
-- Dues plans + cycles.
-- ---------------------------------------------------------------------------
insert into public.dues_plans (id, club_id, name, amount, frequency, grace_days, is_active, auto_generate, start_date, created_by) values
  ('5eed0001-0000-4000-8000-000000000001', :club_id, 'Membership fee',        100.00, 'monthly',   3, true, true,  date '2026-01-01', :'owner_id'),
  ('5eed0001-0000-4000-8000-000000000002', :club_id, 'Tournament fee',        500.00, 'one_time',  0, true, false, null,              :'owner_id'),
  ('5eed0001-0000-4000-8000-000000000003', :club_id, 'Quarterly maintenance', 300.00, 'quarterly', 5, true, false, date '2026-01-01', :'owner_id');

insert into public.dues_cycles (id, club_id, dues_plan_id, cycle_label, due_date) values
  ('5eed0002-0000-4000-8000-000000000001', :club_id, '5eed0001-0000-4000-8000-000000000001', '2026-05',      date '2026-05-05'),
  ('5eed0002-0000-4000-8000-000000000002', :club_id, '5eed0001-0000-4000-8000-000000000001', '2026-06',      date '2026-06-05'),
  ('5eed0002-0000-4000-8000-000000000003', :club_id, '5eed0001-0000-4000-8000-000000000002', '2026 Summer',  date '2026-06-20'),
  ('5eed0002-0000-4000-8000-000000000004', :club_id, '5eed0001-0000-4000-8000-000000000003', '2026-Q2',      date '2026-06-10');

-- ---------------------------------------------------------------------------
-- Member dues (mixed: paid / pending / overdue / waived / partial).
-- ---------------------------------------------------------------------------
-- May membership: everyone paid.
insert into public.member_dues (club_id, member_id, dues_cycle_id, amount_due, amount_paid, status, paid_at)
select :club_id, m.id, '5eed0002-0000-4000-8000-000000000001', 100.00, 100.00, 'paid', timestamptz '2026-05-03 10:00+00'
from public.members m
where m.club_id = :club_id
  and (m.role = 'owner' or m.email in ('kavya@seed.test','rohan@seed.test','ananya@seed.test','vikram@seed.test','meera@seed.test','karthik@seed.test'));

-- June membership: mixed states.
insert into public.member_dues (club_id, member_id, dues_cycle_id, amount_due, amount_paid, status, paid_at) values
  (:club_id, :'owner_id',                              '5eed0002-0000-4000-8000-000000000002', 100.00, 100.00, 'paid',    now() - interval '4 days'),
  (:club_id, '5eed0000-0000-4000-8000-000000000003',   '5eed0002-0000-4000-8000-000000000002', 100.00, 100.00, 'paid',    now() - interval '2 days'),
  (:club_id, '5eed0000-0000-4000-8000-000000000004',   '5eed0002-0000-4000-8000-000000000002', 100.00,   0.00, 'overdue', null),
  (:club_id, '5eed0000-0000-4000-8000-000000000005',   '5eed0002-0000-4000-8000-000000000002', 100.00,   0.00, 'pending', null),
  (:club_id, '5eed0000-0000-4000-8000-000000000006',   '5eed0002-0000-4000-8000-000000000002', 100.00,   0.00, 'overdue', null),
  (:club_id, '5eed0000-0000-4000-8000-000000000007',   '5eed0002-0000-4000-8000-000000000002', 100.00,   0.00, 'waived',  null),
  (:club_id, '5eed0000-0000-4000-8000-000000000008',   '5eed0002-0000-4000-8000-000000000002', 100.00,  50.00, 'pending', null);

-- Tournament one-time fee.
insert into public.member_dues (club_id, member_id, dues_cycle_id, amount_due, amount_paid, status, paid_at) values
  (:club_id, '5eed0000-0000-4000-8000-000000000003', '5eed0002-0000-4000-8000-000000000003', 500.00,   0.00, 'pending', null),
  (:club_id, '5eed0000-0000-4000-8000-000000000004', '5eed0002-0000-4000-8000-000000000003', 500.00, 500.00, 'paid',    now() - interval '6 days'),
  (:club_id, '5eed0000-0000-4000-8000-000000000005', '5eed0002-0000-4000-8000-000000000003', 500.00,   0.00, 'overdue', null);

-- Quarterly maintenance.
insert into public.member_dues (club_id, member_id, dues_cycle_id, amount_due, amount_paid, status, paid_at) values
  (:club_id, :'owner_id',                            '5eed0002-0000-4000-8000-000000000004', 300.00, 300.00, 'paid',    now() - interval '8 days'),
  (:club_id, '5eed0000-0000-4000-8000-000000000003', '5eed0002-0000-4000-8000-000000000004', 300.00,   0.00, 'pending', null),
  (:club_id, '5eed0000-0000-4000-8000-000000000006', '5eed0002-0000-4000-8000-000000000004', 300.00,   0.00, 'overdue', null);

-- ---------------------------------------------------------------------------
-- Ledger transactions (income + expense).
-- ---------------------------------------------------------------------------
insert into public.transactions (id, club_id, member_id, recorded_by, type, amount, category, payment_method, status, description, source) values
  ('5eed0006-0000-4000-8000-000000000001', :club_id, '5eed0000-0000-4000-8000-000000000003', :'owner_id', 'income',  100.00, 'Dues',        'UPI',  'completed', 'June membership - Kavya', 'manual'),
  ('5eed0006-0000-4000-8000-000000000002', :club_id, :'owner_id',                            :'owner_id', 'income',  100.00, 'Dues',        'UPI',  'completed', 'June membership - owner', 'manual'),
  ('5eed0006-0000-4000-8000-000000000003', :club_id, '5eed0000-0000-4000-8000-000000000004', :'owner_id', 'income',  500.00, 'Dues',        'stripe','completed', 'Tournament fee - Rohan',  'gateway'),
  ('5eed0006-0000-4000-8000-000000000004', :club_id, null,                                   :'owner_id', 'income', 5000.00, 'Sponsorship', 'Bank', 'completed', 'Season sponsor - AceSports', 'manual'),
  ('5eed0006-0000-4000-8000-000000000005', :club_id, null,                                   :'owner_id', 'income', 1500.00, 'Donation',    'UPI',  'completed', 'Anonymous donation',      'manual'),
  ('5eed0006-0000-4000-8000-000000000006', :club_id, null,                                   :'owner_id', 'expense',2000.00, 'Ground',      'UPI',  'completed', 'Ground booking - June',   'manual'),
  ('5eed0006-0000-4000-8000-000000000007', :club_id, null,                                   :'owner_id', 'expense',3500.00, 'Equipment',   'Bank', 'completed', 'New practice kit',        'manual'),
  ('5eed0006-0000-4000-8000-000000000008', :club_id, null,                                   :'owner_id', 'expense', 800.00, 'Refreshments','Cash', 'completed', 'Match-day refreshments',  'manual'),
  ('5eed0006-0000-4000-8000-000000000009', :club_id, null,                                   :'owner_id', 'expense',1200.00, 'Awards',      'UPI',  'completed', 'Winner trophies',         'manual'),
  ('5eed0006-0000-4000-8000-00000000000a', :club_id, null,                                   :'owner_id', 'expense', 450.00, 'Misc',        'Cash', 'completed', 'Stationery & printing',   'manual');

-- ---------------------------------------------------------------------------
-- Meetings (upcoming scheduled + past completed/cancelled).
-- ---------------------------------------------------------------------------
insert into public.club_meetings (id, club_id, title, description, location, scheduled_at, status, created_by) values
  ('5eed0003-0000-4000-8000-000000000001', :club_id, 'Monthly strategy meet', 'Plan the upcoming month and review goals.',    'Club House',       now() + interval '1 day',  'scheduled', :'owner_id'),
  ('5eed0003-0000-4000-8000-000000000002', :club_id, 'Tournament prep',       'Finalise squad and logistics for the cup.',     'Ground 2',         now() + interval '3 days', 'scheduled', :'owner_id'),
  ('5eed0003-0000-4000-8000-000000000003', :club_id, 'Budget review',         'Treasurer walks through Q2 finances.',          'Online - Meet',    now() + interval '7 days', 'scheduled', :'owner_id'),
  ('5eed0003-0000-4000-8000-000000000004', :club_id, 'Season kickoff',        'Welcome meet for the new season.',              'Club House',       now() - interval '20 days','completed', :'owner_id'),
  ('5eed0003-0000-4000-8000-000000000005', :club_id, 'Ground inspection',     'Cancelled due to rain.',                        'Ground 1',         now() - interval '10 days','cancelled', :'owner_id'),
  ('5eed0003-0000-4000-8000-000000000006', :club_id, 'AGM 2026',              'Annual general meeting and elections.',         'Community Hall',   now() - interval '45 days','completed', :'owner_id');

-- Meeting RSVPs (yes / no / maybe) for the upcoming meetings.
insert into public.meeting_rsvps (club_id, meeting_id, member_id, response) values
  (:club_id, '5eed0003-0000-4000-8000-000000000001', :'owner_id',                            'yes'),
  (:club_id, '5eed0003-0000-4000-8000-000000000001', '5eed0000-0000-4000-8000-000000000003', 'yes'),
  (:club_id, '5eed0003-0000-4000-8000-000000000001', '5eed0000-0000-4000-8000-000000000004', 'no'),
  (:club_id, '5eed0003-0000-4000-8000-000000000001', '5eed0000-0000-4000-8000-000000000005', 'maybe'),
  (:club_id, '5eed0003-0000-4000-8000-000000000001', '5eed0000-0000-4000-8000-000000000006', 'yes'),
  (:club_id, '5eed0003-0000-4000-8000-000000000002', '5eed0000-0000-4000-8000-000000000003', 'maybe'),
  (:club_id, '5eed0003-0000-4000-8000-000000000002', '5eed0000-0000-4000-8000-000000000007', 'yes'),
  (:club_id, '5eed0003-0000-4000-8000-000000000002', '5eed0000-0000-4000-8000-000000000008', 'no'),
  (:club_id, '5eed0003-0000-4000-8000-000000000003', '5eed0000-0000-4000-8000-000000000004', 'yes'),
  (:club_id, '5eed0003-0000-4000-8000-000000000003', '5eed0000-0000-4000-8000-000000000005', 'yes');

-- ---------------------------------------------------------------------------
-- Polls (open with votes + closed with results).
-- ---------------------------------------------------------------------------
insert into public.club_polls (id, club_id, question, options, status, closes_at, created_by) values
  ('5eed0004-0000-4000-8000-000000000001', :club_id, 'Which day works best for practice?', '["Monday","Wednesday","Friday","Sunday"]'::jsonb, 'open',   now() + interval '5 days', :'owner_id'),
  ('5eed0004-0000-4000-8000-000000000002', :club_id, 'New jersey colour?',                 '["Blue","Red","Black"]'::jsonb,                   'open',   now() + interval '2 days', :'owner_id'),
  ('5eed0004-0000-4000-8000-000000000003', :club_id, 'Venue for annual dinner?',           '["Hotel A","Hotel B","Club House"]'::jsonb,       'closed', now() - interval '3 days', :'owner_id'),
  ('5eed0004-0000-4000-8000-000000000004', :club_id, 'Tournament format?',                 '["Knockout","League"]'::jsonb,                    'closed', now() - interval '8 days', :'owner_id');

-- Poll votes.
insert into public.poll_votes (club_id, poll_id, member_id, option_index) values
  -- Practice day (Wednesday leads).
  (:club_id, '5eed0004-0000-4000-8000-000000000001', :'owner_id',                            1),
  (:club_id, '5eed0004-0000-4000-8000-000000000001', '5eed0000-0000-4000-8000-000000000003', 1),
  (:club_id, '5eed0004-0000-4000-8000-000000000001', '5eed0000-0000-4000-8000-000000000004', 2),
  (:club_id, '5eed0004-0000-4000-8000-000000000001', '5eed0000-0000-4000-8000-000000000005', 1),
  (:club_id, '5eed0004-0000-4000-8000-000000000001', '5eed0000-0000-4000-8000-000000000006', 3),
  (:club_id, '5eed0004-0000-4000-8000-000000000001', '5eed0000-0000-4000-8000-000000000007', 0),
  (:club_id, '5eed0004-0000-4000-8000-000000000001', '5eed0000-0000-4000-8000-000000000008', 1),
  -- Jersey colour (Blue leads).
  (:club_id, '5eed0004-0000-4000-8000-000000000002', :'owner_id',                            0),
  (:club_id, '5eed0004-0000-4000-8000-000000000002', '5eed0000-0000-4000-8000-000000000003', 2),
  (:club_id, '5eed0004-0000-4000-8000-000000000002', '5eed0000-0000-4000-8000-000000000004', 0),
  (:club_id, '5eed0004-0000-4000-8000-000000000002', '5eed0000-0000-4000-8000-000000000005', 0),
  (:club_id, '5eed0004-0000-4000-8000-000000000002', '5eed0000-0000-4000-8000-000000000006', 1),
  -- Annual dinner venue (Club House won).
  (:club_id, '5eed0004-0000-4000-8000-000000000003', :'owner_id',                            2),
  (:club_id, '5eed0004-0000-4000-8000-000000000003', '5eed0000-0000-4000-8000-000000000003', 2),
  (:club_id, '5eed0004-0000-4000-8000-000000000003', '5eed0000-0000-4000-8000-000000000004', 2),
  (:club_id, '5eed0004-0000-4000-8000-000000000003', '5eed0000-0000-4000-8000-000000000005', 2),
  (:club_id, '5eed0004-0000-4000-8000-000000000003', '5eed0000-0000-4000-8000-000000000006', 0),
  -- Tournament format (Knockout won).
  (:club_id, '5eed0004-0000-4000-8000-000000000004', :'owner_id',                            0),
  (:club_id, '5eed0004-0000-4000-8000-000000000004', '5eed0000-0000-4000-8000-000000000003', 0),
  (:club_id, '5eed0004-0000-4000-8000-000000000004', '5eed0000-0000-4000-8000-000000000004', 1),
  (:club_id, '5eed0004-0000-4000-8000-000000000004', '5eed0000-0000-4000-8000-000000000005', 0);

-- ---------------------------------------------------------------------------
-- Announcements (+ read receipts for the owner on the first two).
-- ---------------------------------------------------------------------------
insert into public.club_announcements (id, club_id, title, body, created_by, created_at) values
  ('5eed0005-0000-4000-8000-000000000001', :club_id, 'Welcome to the new season!', 'Thrilled to kick off another season together. Practices resume next week - check the polls for the preferred day.', :'owner_id', now() - interval '6 days'),
  ('5eed0005-0000-4000-8000-000000000002', :club_id, 'June dues reminder',          'A gentle reminder that June membership dues are now due. Please clear pending amounts via the Pay now button.', :'owner_id', now() - interval '4 days'),
  ('5eed0005-0000-4000-8000-000000000003', :club_id, 'Tournament schedule released','The fixtures for the summer cup are out. Tournament prep meeting is scheduled - RSVP if you can attend.', :'owner_id', now() - interval '2 days'),
  ('5eed0005-0000-4000-8000-000000000004', :club_id, 'Ground maintenance Saturday', 'Ground 1 will be closed this Saturday for maintenance. Please use Ground 2 for any practice sessions.', :'owner_id', now() - interval '1 day');

insert into public.announcement_reads (announcement_id, member_id, club_id) values
  ('5eed0005-0000-4000-8000-000000000001', :'owner_id', :club_id),
  ('5eed0005-0000-4000-8000-000000000002', :'owner_id', :club_id);

commit;

-- Summary.
select 'members'       as entity, count(*) from public.members        where club_id = :club_id
union all select 'dues_plans',    count(*) from public.dues_plans      where club_id = :club_id
union all select 'dues_cycles',   count(*) from public.dues_cycles     where club_id = :club_id
union all select 'member_dues',   count(*) from public.member_dues     where club_id = :club_id
union all select 'transactions',  count(*) from public.transactions    where club_id = :club_id
union all select 'meetings',      count(*) from public.club_meetings   where club_id = :club_id
union all select 'meeting_rsvps', count(*) from public.meeting_rsvps   where club_id = :club_id
union all select 'polls',         count(*) from public.club_polls      where club_id = :club_id
union all select 'poll_votes',    count(*) from public.poll_votes      where club_id = :club_id
union all select 'announcements', count(*) from public.club_announcements where club_id = :club_id;
