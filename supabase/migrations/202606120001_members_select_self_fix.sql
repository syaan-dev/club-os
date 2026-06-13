-- Fix: creating a club failed with
--   "new row violates row-level security policy for table members"
-- whenever the owner-bootstrap INSERT returned the new row (INSERT ... RETURNING,
-- i.e. a Supabase .insert(...).select()).
--
-- Root cause: Postgres applies the table's SELECT policies to the row produced by
-- an INSERT ... RETURNING. The only SELECT policy that could match an owner's own
-- membership row was members_select_same_club = is_club_member(club_id), which
-- requires an ALREADY-active membership. For the very first (owner) row of a brand
-- new club that membership does not exist yet within the same statement, so the
-- returned row was invisible and Postgres reported an RLS violation. There was no
-- policy letting a user read their OWN membership row.
--
-- Fix: add a self SELECT policy keyed on user_id = auth.uid(). A user may always
-- read their own membership rows, which also removes the chicken-and-egg gap for
-- the owner-bootstrap insert. This is strictly additive (permissive) and does not
-- widen visibility of other members' rows.

drop policy if exists members_select_self on public.members;
create policy members_select_self
  on public.members
  for select
  to authenticated
  using (user_id = auth.uid());
