-- Track which member has read which announcement so the app can show an
-- unread count. A row existing = the announcement is read by that member;
-- no row = unread. Marking unread simply deletes the row.

create table if not exists public.announcement_reads (
  id uuid primary key default gen_random_uuid(),
  announcement_id uuid not null references public.club_announcements(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  club_id uuid not null references public.clubs(id) on delete cascade,
  read_at timestamptz not null default now(),
  unique (announcement_id, member_id)
);

create index if not exists idx_announcement_reads_member
  on public.announcement_reads(member_id);
create index if not exists idx_announcement_reads_announcement
  on public.announcement_reads(announcement_id);

alter table public.announcement_reads enable row level security;

-- A member may only see and manage their OWN read receipts. member_id must map
-- to an active membership of the caller in the same club.
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
