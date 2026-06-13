-- Fix phone-claim RLS mismatch.
-- Supabase stores auth.users.phone WITHOUT a leading '+' (e.g. '919876543211'),
-- while the app normalizes club_invites.invited_phone and members.phone to E.164
-- WITH a leading '+' (e.g. '+919876543211'). The previous auth_user_phone()
-- returned the raw value, so every phone-based RLS policy failed to match and
-- invited users could not see their own invites/members/clubs. Normalize the
-- helper to return E.164 with a leading '+' so comparisons line up.

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

grant execute on function public.auth_user_phone() to authenticated;

-- Fix correlated-subquery column shadowing in the invited-club select policy.
-- The previous policy used `m.club_id = id`, but `id` resolved to members.id
-- (the inner table shadows the outer reference) instead of clubs.id, so the
-- EXISTS clause was never true and invited users could not read their club.
-- Qualify the outer reference explicitly as clubs.id.

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
