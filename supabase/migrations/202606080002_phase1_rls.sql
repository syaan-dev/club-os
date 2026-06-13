-- Phase 1 indexes and RLS baseline policies

create index if not exists idx_members_club_id on public.members(club_id);
create index if not exists idx_members_user_id on public.members(user_id);
create index if not exists idx_dues_plans_club_id on public.dues_plans(club_id);
create index if not exists idx_dues_cycles_club_id_due_date on public.dues_cycles(club_id, due_date);
create index if not exists idx_member_dues_member_id on public.member_dues(member_id);
create index if not exists idx_member_dues_club_status on public.member_dues(club_id, status);
create index if not exists idx_transactions_club_created_at on public.transactions(club_id, created_at desc);
create index if not exists idx_audit_events_club_created_at on public.audit_events(club_id, created_at desc);

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

grant execute on function public.is_club_member(uuid) to authenticated;
grant execute on function public.my_member_role(uuid) to authenticated;

alter table public.clubs enable row level security;
alter table public.members enable row level security;
alter table public.club_invites enable row level security;
alter table public.dues_plans enable row level security;
alter table public.dues_cycles enable row level security;
alter table public.member_dues enable row level security;
alter table public.transactions enable row level security;
alter table public.audit_events enable row level security;

create policy clubs_select_same_club
on public.clubs
for select
using (public.is_club_member(id));

create policy clubs_insert_creator
on public.clubs
for insert
to authenticated
with check (created_by = auth.uid());

create policy clubs_update_owner_only
on public.clubs
for update
using (public.my_member_role(id) = 'owner')
with check (public.my_member_role(id) = 'owner');

create policy members_select_same_club
on public.members
for select
using (public.is_club_member(club_id));

create policy members_insert_owner_bootstrap
on public.members
for insert
to authenticated
with check (
  (user_id = auth.uid() and role = 'owner')
  or public.my_member_role(club_id) in ('owner','treasurer')
);

create policy members_update_owner_or_treasurer
on public.members
for update
using (public.my_member_role(club_id) in ('owner','treasurer'))
with check (public.my_member_role(club_id) in ('owner','treasurer'));

create policy invites_select_same_club
on public.club_invites
for select
using (public.is_club_member(club_id));

create policy invites_manage_owner_treasurer
on public.club_invites
for all
using (public.my_member_role(club_id) in ('owner','treasurer'))
with check (public.my_member_role(club_id) in ('owner','treasurer'));

create policy dues_plans_select_same_club
on public.dues_plans
for select
using (public.is_club_member(club_id));

create policy dues_plans_manage_owner_treasurer
on public.dues_plans
for all
using (public.my_member_role(club_id) in ('owner','treasurer'))
with check (public.my_member_role(club_id) in ('owner','treasurer'));

create policy dues_cycles_select_same_club
on public.dues_cycles
for select
using (public.is_club_member(club_id));

create policy dues_cycles_manage_owner_treasurer
on public.dues_cycles
for all
using (public.my_member_role(club_id) in ('owner','treasurer'))
with check (public.my_member_role(club_id) in ('owner','treasurer'));

create policy member_dues_select_same_club
on public.member_dues
for select
using (public.is_club_member(club_id));

create policy member_dues_manage_owner_treasurer
on public.member_dues
for all
using (public.my_member_role(club_id) in ('owner','treasurer'))
with check (public.my_member_role(club_id) in ('owner','treasurer'));

create policy transactions_select_same_club
on public.transactions
for select
using (public.is_club_member(club_id));

create policy transactions_manage_owner_treasurer
on public.transactions
for all
using (public.my_member_role(club_id) in ('owner','treasurer'))
with check (public.my_member_role(club_id) in ('owner','treasurer'));

create policy audit_events_select_same_club
on public.audit_events
for select
using (public.is_club_member(club_id));

create policy audit_events_insert_same_club
on public.audit_events
for insert
to authenticated
with check (public.is_club_member(club_id));
