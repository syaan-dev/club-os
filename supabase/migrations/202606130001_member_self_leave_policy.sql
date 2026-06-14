-- Allow an active member to leave their own club (self-service).
-- The existing members UPDATE policies cover: owner/treasurer managing members,
-- and invited (unclaimed) users declining. There was NO policy letting an ACTIVE
-- claimed member set their own row to 'left'. Without it, a plain member tapping
-- "Leave club" hits a row-level security violation.
--
-- Post-update visibility: after leaving, is_club_member(club_id) is false, but
-- members_select_self (user_id = auth.uid(), migration 202606120001) keeps the
-- row visible so the UPDATE...RETURNING does not violate SELECT policies.

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
