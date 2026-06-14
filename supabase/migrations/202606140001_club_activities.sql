-- Club activities: meetings, polls/voting and announcements.
--
-- Product decision (PRA Section 5.2 role matrix):
--   * Secretary owns meetings, minutes, action tracking and polls.
--   * Owner/President retains full control, Treasurer is included in the
--     leadership set for operational continuity.
--   * Every active member can read all activities and cast a vote in an open
--     poll (one vote per member, changeable while the poll is open).
--
-- Leadership = owner | treasurer | secretary, mirroring the
-- 202606130002_leadership_club_management.sql decision.

create table if not exists public.club_meetings (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  title varchar(150) not null,
  description text,
  location varchar(200),
  scheduled_at timestamptz not null,
  status varchar(20) not null default 'scheduled'
    check (status in ('scheduled','completed','cancelled')),
  created_by uuid not null references public.members(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.club_polls (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  question varchar(300) not null,
  options jsonb not null,
  status varchar(20) not null default 'open' check (status in ('open','closed')),
  closes_at timestamptz,
  created_by uuid not null references public.members(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint club_polls_options_shape check (
    jsonb_typeof(options) = 'array'
    and jsonb_array_length(options) between 2 and 10
  )
);

create table if not exists public.poll_votes (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  poll_id uuid not null references public.club_polls(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  option_index int not null check (option_index >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (poll_id, member_id)
);

create table if not exists public.club_announcements (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  title varchar(150) not null,
  body text not null,
  created_by uuid not null references public.members(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_club_meetings_club_scheduled
  on public.club_meetings(club_id, scheduled_at desc);
create index if not exists idx_club_polls_club_created
  on public.club_polls(club_id, created_at desc);
create index if not exists idx_poll_votes_poll_id on public.poll_votes(poll_id);
create index if not exists idx_poll_votes_member_id on public.poll_votes(member_id);
create index if not exists idx_club_announcements_club_created
  on public.club_announcements(club_id, created_at desc);

create trigger trg_club_meetings_updated_at
before update on public.club_meetings
for each row execute function public.set_updated_at();

create trigger trg_club_polls_updated_at
before update on public.club_polls
for each row execute function public.set_updated_at();

create trigger trg_poll_votes_updated_at
before update on public.poll_votes
for each row execute function public.set_updated_at();

create trigger trg_club_announcements_updated_at
before update on public.club_announcements
for each row execute function public.set_updated_at();

alter table public.club_meetings enable row level security;
alter table public.club_polls enable row level security;
alter table public.poll_votes enable row level security;
alter table public.club_announcements enable row level security;

-- Meetings: members read, leadership manages.
create policy club_meetings_select_same_club
on public.club_meetings
for select
using (public.is_club_member(club_id));

create policy club_meetings_manage_leadership
on public.club_meetings
for all
using (public.my_member_role(club_id) in ('owner','treasurer','secretary'))
with check (public.my_member_role(club_id) in ('owner','treasurer','secretary'));

-- Polls: members read, leadership manages.
create policy club_polls_select_same_club
on public.club_polls
for select
using (public.is_club_member(club_id));

create policy club_polls_manage_leadership
on public.club_polls
for all
using (public.my_member_role(club_id) in ('owner','treasurer','secretary'))
with check (public.my_member_role(club_id) in ('owner','treasurer','secretary'));

-- Poll votes: members read every vote (for live tallies) and cast/update only
-- their own vote, only while the poll is open.
create policy poll_votes_select_same_club
on public.poll_votes
for select
using (public.is_club_member(club_id));

create policy poll_votes_insert_self
on public.poll_votes
for insert
to authenticated
with check (
  public.is_club_member(club_id)
  and exists (
    select 1
    from public.members m
    where m.id = poll_votes.member_id
      and m.user_id = auth.uid()
      and m.club_id = poll_votes.club_id
      and m.membership_status = 'active'
      and m.is_active = true
  )
  and exists (
    select 1
    from public.club_polls p
    where p.id = poll_votes.poll_id
      and p.club_id = poll_votes.club_id
      and p.status = 'open'
  )
);

create policy poll_votes_update_self
on public.poll_votes
for update
using (
  exists (
    select 1
    from public.members m
    where m.id = poll_votes.member_id
      and m.user_id = auth.uid()
      and m.club_id = poll_votes.club_id
      and m.membership_status = 'active'
      and m.is_active = true
  )
)
with check (
  public.is_club_member(club_id)
  and exists (
    select 1
    from public.members m
    where m.id = poll_votes.member_id
      and m.user_id = auth.uid()
      and m.club_id = poll_votes.club_id
      and m.membership_status = 'active'
      and m.is_active = true
  )
  and exists (
    select 1
    from public.club_polls p
    where p.id = poll_votes.poll_id
      and p.club_id = poll_votes.club_id
      and p.status = 'open'
  )
);

-- Announcements: members read, leadership manages.
create policy club_announcements_select_same_club
on public.club_announcements
for select
using (public.is_club_member(club_id));

create policy club_announcements_manage_leadership
on public.club_announcements
for all
using (public.my_member_role(club_id) in ('owner','treasurer','secretary'))
with check (public.my_member_role(club_id) in ('owner','treasurer','secretary'));
