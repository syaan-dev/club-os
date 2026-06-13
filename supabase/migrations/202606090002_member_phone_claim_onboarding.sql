-- Allow invited members to self-claim onboarding using phone-authenticated identity.

create or replace function public.auth_user_phone()
returns text
language sql
stable
security definer
set search_path = public, auth
as $$
  select phone
  from auth.users
  where id = auth.uid()
  limit 1;
$$;

grant execute on function public.auth_user_phone() to authenticated;

create policy members_select_invited_self_by_phone
on public.members
for select
using (
  user_id is null
  and membership_status = 'invited'
  and phone is not null
  and phone = public.auth_user_phone()
);

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

create policy clubs_select_invited_self_by_phone
on public.clubs
for select
using (
  exists (
    select 1
    from public.members m
    where m.club_id = id
      and m.user_id is null
      and m.membership_status = 'invited'
      and m.phone = public.auth_user_phone()
  )
);
