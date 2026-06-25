-- Club OS row level security (consolidated, final state).
-- Helper functions + RLS policies for every table. Reflects the final policy
-- set after onboarding/invite fixes and the leadership (owner/treasurer/
-- secretary) permission model.

-- ---------------------------------------------------------------------------
-- Helper functions
-- ---------------------------------------------------------------------------

create or replace function public.is_club_member(_club_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.members m
    where m.club_id = _club_id
      and m.user_id = auth.uid()
      and m.membership_status = 'active'
      and m.is_active = true
  );
$$;

create or replace function public.my_member_role(_club_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select m.role
  from public.members m
  where m.club_id = _club_id
    and m.user_id = auth.uid()
    and m.membership_status = 'active'
    and m.is_active = true
  limit 1;
$$;

-- Supabase stores auth.users.phone WITHOUT a leading '+' (e.g. '919876543211'),
-- while the app normalizes member/invite phones to E.164 WITH a leading '+'.
-- Return E.164 with '+' so phone-based policies compare correctly.
create or replace function public.auth_user_phone()
returns text
language sql
stable
security definer
set search_path = public, auth
as $$
  select case
    when phone is null or phone = '' then null
    when left(phone, 1) = '+' then phone
    else '+' || phone
  end
  from auth.users
  where id = auth.uid()
  limit 1;
$$;

grant execute on function public.is_club_member(uuid) to authenticated;
grant execute on function public.my_member_role(uuid) to authenticated;
grant execute on function public.auth_user_phone() to authenticated;

-- ---------------------------------------------------------------------------
-- Enable RLS
-- ---------------------------------------------------------------------------

alter table public.clubs enable row level security;
alter table public.members enable row level security;
alter table public.club_invites enable row level security;
alter table public.dues_plans enable row level security;
alter table public.dues_cycles enable row level security;
alter table public.member_dues enable row level security;
alter table public.transactions enable row level security;
alter table public.audit_events enable row level security;
alter table public.club_meetings enable row level security;
alter table public.club_polls enable row level security;
alter table public.poll_votes enable row level security;
alter table public.club_announcements enable row level security;
alter table public.announcement_reads enable row level security;

-- ---------------------------------------------------------------------------
-- clubs
-- ---------------------------------------------------------------------------

-- Members read their club; the creator can also read it during bootstrap
-- (insert ... returning) before their member row exists.
drop policy if exists clubs_select_same_club on public.clubs;
create policy clubs_select_same_club
on public.clubs
for select
using (
  public.is_club_member(id)
  or created_by = auth.uid()
);

-- Invited (unclaimed) users may read a club they have a pending invite to.
drop policy if exists clubs_select_invited_self_by_phone on public.clubs;
create policy clubs_select_invited_self_by_phone
on public.clubs
for select
using (
  exists (
    select 1
    from public.members m
    where m.club_id = clubs.id
      and m.user_id is null
      and m.membership_status = 'invited'
      and m.phone = public.auth_user_phone()
  )
);

drop policy if exists clubs_insert_creator on public.clubs;
create policy clubs_insert_creator
on public.clubs
for insert
to authenticated
with check (created_by = auth.uid());

-- Club profile editable by leadership (owner/treasurer/secretary).
drop policy if exists clubs_update_leadership on public.clubs;
create policy clubs_update_leadership
on public.clubs
for update
using (public.my_member_role(id) in ('owner', 'treasurer', 'secretary'))
with check (public.my_member_role(id) in ('owner', 'treasurer', 'secretary'));

-- ---------------------------------------------------------------------------
-- members
-- ---------------------------------------------------------------------------

drop policy if exists members_select_same_club on public.members;
create policy members_select_same_club
on public.members
for select
using (public.is_club_member(club_id));

-- A user may always read their own membership rows. Also closes the
-- chicken-and-egg gap for the owner-bootstrap insert ... returning.
drop policy if exists members_select_self on public.members;
create policy members_select_self
on public.members
for select
to authenticated
using (user_id = auth.uid());

-- Invited (unclaimed) user may read their own member row by phone, regardless
-- of resulting status (so accept/decline updates stay visible).
drop policy if exists members_select_invited_self_by_phone on public.members;
create policy members_select_invited_self_by_phone
on public.members
for select
to authenticated
using (
  user_id is null
  and phone is not null
  and phone = public.auth_user_phone()
);

drop policy if exists members_insert_owner_bootstrap on public.members;
create policy members_insert_owner_bootstrap
on public.members
for insert
to authenticated
with check (
  (user_id = auth.uid() and role = 'owner')
  or public.my_member_role(club_id) in ('owner','treasurer')
);

-- Role assignment + invite management by leadership.
drop policy if exists members_update_leadership on public.members;
create policy members_update_leadership
on public.members
for update
using (public.my_member_role(club_id) in ('owner', 'treasurer', 'secretary'))
with check (public.my_member_role(club_id) in ('owner', 'treasurer', 'secretary'));

-- Invited user claims their seat: invited (user_id null) -> active (self).
drop policy if exists members_update_invited_self_claim on public.members;
create policy members_update_invited_self_claim
on public.members
for update
to authenticated
using (
  user_id is null
  and membership_status = 'invited'
  and phone is not null
  and phone = public.auth_user_phone()
)
with check (
  user_id = auth.uid()
  and membership_status = 'active'
);

-- Invited user declines: invited (user_id null) -> left.
drop policy if exists members_update_invited_self_decline on public.members;
create policy members_update_invited_self_decline
on public.members
for update
to authenticated
using (
  user_id is null
  and membership_status = 'invited'
  and phone is not null
  and phone = public.auth_user_phone()
)
with check (
  user_id is null
  and membership_status = 'left'
);

-- Active member leaves their own club: active (self) -> left.
drop policy if exists members_update_self_leave on public.members;
create policy members_update_self_leave
on public.members
for update
to authenticated
using (
  user_id = auth.uid()
  and membership_status = 'active'
)
with check (
  user_id = auth.uid()
  and membership_status = 'left'
);

-- ---------------------------------------------------------------------------
-- club_invites
-- ---------------------------------------------------------------------------

drop policy if exists invites_select_same_club on public.club_invites;
create policy invites_select_same_club
on public.club_invites
for select
using (public.is_club_member(club_id));

drop policy if exists invites_manage_owner_treasurer on public.club_invites;
create policy invites_manage_owner_treasurer
on public.club_invites
for all
using (public.my_member_role(club_id) in ('owner','treasurer'))
with check (public.my_member_role(club_id) in ('owner','treasurer'));

-- Invited user reads their own invite by phone, regardless of resulting status.
drop policy if exists invites_select_invited_self_by_phone on public.club_invites;
create policy invites_select_invited_self_by_phone
on public.club_invites
for select
to authenticated
using (
  invited_phone is not null
  and invited_phone = public.auth_user_phone()
);

-- Invited user responds to their own pending invite (accept/revoke).
drop policy if exists invites_update_invited_self_response on public.club_invites;
create policy invites_update_invited_self_response
on public.club_invites
for update
to authenticated
using (
  invited_phone is not null
  and invited_phone = public.auth_user_phone()
  and status = 'pending'
)
with check (
  invited_phone = public.auth_user_phone()
  and status in ('accepted', 'revoked')
);

-- ---------------------------------------------------------------------------
-- dues_plans / dues_cycles / member_dues
-- ---------------------------------------------------------------------------

drop policy if exists dues_plans_select_same_club on public.dues_plans;
create policy dues_plans_select_same_club
on public.dues_plans
for select
using (public.is_club_member(club_id));

drop policy if exists dues_plans_manage_owner_treasurer on public.dues_plans;
create policy dues_plans_manage_owner_treasurer
on public.dues_plans
for all
using (public.my_member_role(club_id) in ('owner','treasurer'))
with check (public.my_member_role(club_id) in ('owner','treasurer'));

drop policy if exists dues_cycles_select_same_club on public.dues_cycles;
create policy dues_cycles_select_same_club
on public.dues_cycles
for select
using (public.is_club_member(club_id));

drop policy if exists dues_cycles_manage_owner_treasurer on public.dues_cycles;
create policy dues_cycles_manage_owner_treasurer
on public.dues_cycles
for all
using (public.my_member_role(club_id) in ('owner','treasurer'))
with check (public.my_member_role(club_id) in ('owner','treasurer'));

drop policy if exists member_dues_select_same_club on public.member_dues;
create policy member_dues_select_same_club
on public.member_dues
for select
using (public.is_club_member(club_id));

drop policy if exists member_dues_manage_owner_treasurer on public.member_dues;
create policy member_dues_manage_owner_treasurer
on public.member_dues
for all
using (public.my_member_role(club_id) in ('owner','treasurer'))
with check (public.my_member_role(club_id) in ('owner','treasurer'));

-- ---------------------------------------------------------------------------
-- transactions / audit_events
-- ---------------------------------------------------------------------------

drop policy if exists transactions_select_same_club on public.transactions;
create policy transactions_select_same_club
on public.transactions
for select
using (public.is_club_member(club_id));

drop policy if exists transactions_manage_owner_treasurer on public.transactions;
create policy transactions_manage_owner_treasurer
on public.transactions
for all
using (public.my_member_role(club_id) in ('owner','treasurer'))
with check (public.my_member_role(club_id) in ('owner','treasurer'));

drop policy if exists audit_events_select_same_club on public.audit_events;
create policy audit_events_select_same_club
on public.audit_events
for select
using (public.is_club_member(club_id));

drop policy if exists audit_events_insert_same_club on public.audit_events;
create policy audit_events_insert_same_club
on public.audit_events
for insert
to authenticated
with check (public.is_club_member(club_id));

-- ---------------------------------------------------------------------------
-- club_meetings / club_polls / poll_votes / club_announcements
-- Members read, leadership (owner/treasurer/secretary) manages.
-- ---------------------------------------------------------------------------

drop policy if exists club_meetings_select_same_club on public.club_meetings;
create policy club_meetings_select_same_club
on public.club_meetings
for select
using (public.is_club_member(club_id));

drop policy if exists club_meetings_manage_leadership on public.club_meetings;
create policy club_meetings_manage_leadership
on public.club_meetings
for all
using (public.my_member_role(club_id) in ('owner','treasurer','secretary'))
with check (public.my_member_role(club_id) in ('owner','treasurer','secretary'));

drop policy if exists club_polls_select_same_club on public.club_polls;
create policy club_polls_select_same_club
on public.club_polls
for select
using (public.is_club_member(club_id));

drop policy if exists club_polls_manage_leadership on public.club_polls;
create policy club_polls_manage_leadership
on public.club_polls
for all
using (public.my_member_role(club_id) in ('owner','treasurer','secretary'))
with check (public.my_member_role(club_id) in ('owner','treasurer','secretary'));

-- Members read every vote (for live tallies) and cast/update only their own
-- vote, only while the poll is open.
drop policy if exists poll_votes_select_same_club on public.poll_votes;
create policy poll_votes_select_same_club
on public.poll_votes
for select
using (public.is_club_member(club_id));

drop policy if exists poll_votes_insert_self on public.poll_votes;
create policy poll_votes_insert_self
on public.poll_votes
for insert
to authenticated
with check (
  public.is_club_member(club_id)
  and exists (
    select 1
    from public.members m
    where m.id = poll_votes.member_id
      and m.user_id = auth.uid()
      and m.club_id = poll_votes.club_id
      and m.membership_status = 'active'
      and m.is_active = true
  )
  and exists (
    select 1
    from public.club_polls p
    where p.id = poll_votes.poll_id
      and p.club_id = poll_votes.club_id
      and p.status = 'open'
  )
);

drop policy if exists poll_votes_update_self on public.poll_votes;
create policy poll_votes_update_self
on public.poll_votes
for update
using (
  exists (
    select 1
    from public.members m
    where m.id = poll_votes.member_id
      and m.user_id = auth.uid()
      and m.club_id = poll_votes.club_id
      and m.membership_status = 'active'
      and m.is_active = true
  )
)
with check (
  public.is_club_member(club_id)
  and exists (
    select 1
    from public.members m
    where m.id = poll_votes.member_id
      and m.user_id = auth.uid()
      and m.club_id = poll_votes.club_id
      and m.membership_status = 'active'
      and m.is_active = true
  )
  and exists (
    select 1
    from public.club_polls p
    where p.id = poll_votes.poll_id
      and p.club_id = poll_votes.club_id
      and p.status = 'open'
  )
);

drop policy if exists club_announcements_select_same_club on public.club_announcements;
create policy club_announcements_select_same_club
on public.club_announcements
for select
using (public.is_club_member(club_id));

drop policy if exists club_announcements_manage_leadership on public.club_announcements;
create policy club_announcements_manage_leadership
on public.club_announcements
for all
using (public.my_member_role(club_id) in ('owner','treasurer','secretary'))
with check (public.my_member_role(club_id) in ('owner','treasurer','secretary'));

-- ---------------------------------------------------------------------------
-- announcement_reads (a member manages only their OWN read receipts)
-- ---------------------------------------------------------------------------

drop policy if exists announcement_reads_select_self on public.announcement_reads;
create policy announcement_reads_select_self
on public.announcement_reads
for select
to authenticated
using (
  exists (
    select 1
    from public.members m
    where m.id = announcement_reads.member_id
      and m.user_id = auth.uid()
      and m.club_id = announcement_reads.club_id
  )
);

drop policy if exists announcement_reads_insert_self on public.announcement_reads;
create policy announcement_reads_insert_self
on public.announcement_reads
for insert
to authenticated
with check (
  public.is_club_member(club_id)
  and exists (
    select 1
    from public.members m
    where m.id = announcement_reads.member_id
      and m.user_id = auth.uid()
      and m.club_id = announcement_reads.club_id
      and m.membership_status = 'active'
      and m.is_active = true
  )
  and exists (
    select 1
    from public.club_announcements a
    where a.id = announcement_reads.announcement_id
      and a.club_id = announcement_reads.club_id
  )
);

drop policy if exists announcement_reads_delete_self on public.announcement_reads;
create policy announcement_reads_delete_self
on public.announcement_reads
for delete
to authenticated
using (
  exists (
    select 1
    from public.members m
    where m.id = announcement_reads.member_id
      and m.user_id = auth.uid()
      and m.club_id = announcement_reads.club_id
  )
);
