-- Broaden club-management permissions to the leadership roles.
-- Product decision: Club profile, role assignment and billing are editable by
-- Owner (president), Treasurer and Secretary — not plain Members.
--
-- (1) clubs UPDATE was owner-only. Allow owner/treasurer/secretary.
-- (2) members UPDATE (used for role assignment + invite management) was
--     owner/treasurer. Add secretary so they can manage roles too.

drop policy if exists clubs_update_owner_only on public.clubs;
drop policy if exists clubs_update_leadership on public.clubs;
create policy clubs_update_leadership
on public.clubs
for update
using (public.my_member_role(id) in ('owner', 'treasurer', 'secretary'))
with check (public.my_member_role(id) in ('owner', 'treasurer', 'secretary'));

drop policy if exists members_update_owner_or_treasurer on public.members;
drop policy if exists members_update_leadership on public.members;
create policy members_update_leadership
on public.members
for update
using (public.my_member_role(club_id) in ('owner', 'treasurer', 'secretary'))
with check (public.my_member_role(club_id) in ('owner', 'treasurer', 'secretary'));
