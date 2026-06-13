-- Fix: invitees could not accept or decline invitations.
--
-- Postgres requires that the row resulting from an UPDATE remain visible to the
-- caller under the table's SELECT policies. The invitee self-service SELECT
-- policies were scoped to a single status:
--   * club_invites: status = 'pending'
--   * members:      membership_status = 'invited'
-- When the invitee accepted (status -> 'accepted'), declined an invite
-- (status -> 'revoked') or declined membership (membership_status -> 'left'),
-- the post-update row no longer matched the SELECT policy, so Postgres raised
-- "new row violates row-level security policy".
--
-- Fix: let invitees SELECT their own invite/member rows regardless of the
-- resulting status, keyed only on phone ownership (and, for members, the
-- unclaimed user_id IS NULL scope). Claimed/active members remain covered by
-- the existing is_club_member-based SELECT policies.

drop policy if exists invites_select_invited_self_by_phone on public.club_invites;
create policy invites_select_invited_self_by_phone
  on public.club_invites
  for select
  to authenticated
  using (
    invited_phone is not null
    and invited_phone = public.auth_user_phone()
  );

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
