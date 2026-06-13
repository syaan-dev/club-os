-- Allow invited users to view and respond to their own membership requests by phone.

drop policy if exists invites_select_invited_self_by_phone on public.club_invites;
create policy invites_select_invited_self_by_phone
on public.club_invites
for select
using (
  invited_phone is not null
  and invited_phone = public.auth_user_phone()
  and status = 'pending'
);

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
