-- Fix bootstrap flow: allow club creator to read their own club rows
-- so insert+select (return=representation) works before member row exists.

drop policy if exists clubs_select_same_club on public.clubs;

create policy clubs_select_same_club
on public.clubs
for select
using (
  public.is_club_member(id)
  or created_by = auth.uid()
);
