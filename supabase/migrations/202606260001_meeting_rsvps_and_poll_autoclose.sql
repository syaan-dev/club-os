-- Club OS — meeting RSVPs + poll auto-close.
--
--   (1) meeting_rsvps: one row per member per meeting recording whether they
--       are going (yes/no/maybe). Mirrors the poll_votes pattern: members read
--       all RSVPs for live attendance tallies and write only their own, only
--       while the meeting is still scheduled (upcoming).
--   (2) A fan-out trigger that notifies the meeting organiser when a member
--       RSVPs, so they can watch attendance build without polling.
--   (3) close_expired_polls(): flips open polls past their closes_at to
--       'closed', scheduled hourly via pg_cron when available. This makes the
--       "closes in N days" countdown trustworthy — a poll actually closes on
--       schedule instead of lingering open forever.

-- ---------------------------------------------------------------------------
-- meeting_rsvps
-- ---------------------------------------------------------------------------

create table if not exists public.meeting_rsvps (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  meeting_id uuid not null references public.club_meetings(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  response varchar(10) not null check (response in ('yes','no','maybe')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (meeting_id, member_id)
);

create index if not exists idx_meeting_rsvps_meeting on public.meeting_rsvps(meeting_id);
create index if not exists idx_meeting_rsvps_member on public.meeting_rsvps(member_id);

drop trigger if exists trg_meeting_rsvps_updated_at on public.meeting_rsvps;
create trigger trg_meeting_rsvps_updated_at
before update on public.meeting_rsvps
for each row execute function public.set_updated_at();

-- Cross-club guard: the member and meeting must belong to the RSVP's club.
create or replace function public.check_meeting_rsvp_cross_club()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_member_in_club(new.member_id, new.club_id);
  if not exists (
    select 1 from public.club_meetings cm
    where cm.id = new.meeting_id and cm.club_id = new.club_id
  ) then
    raise exception 'cross-club reference: meeting % is not in club %', new.meeting_id, new.club_id
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_meeting_rsvp_cross_club on public.meeting_rsvps;
create trigger trg_meeting_rsvp_cross_club
before insert or update on public.meeting_rsvps
for each row execute function public.check_meeting_rsvp_cross_club();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.meeting_rsvps enable row level security;

-- Every member of the club can read RSVPs (for attendance tallies).
drop policy if exists meeting_rsvps_select_same_club on public.meeting_rsvps;
create policy meeting_rsvps_select_same_club
on public.meeting_rsvps
for select
using (public.is_club_member(club_id));

-- A member may record their own RSVP, only while the meeting is scheduled.
drop policy if exists meeting_rsvps_insert_self on public.meeting_rsvps;
create policy meeting_rsvps_insert_self
on public.meeting_rsvps
for insert
to authenticated
with check (
  public.is_club_member(club_id)
  and exists (
    select 1
    from public.members m
    where m.id = meeting_rsvps.member_id
      and m.user_id = auth.uid()
      and m.club_id = meeting_rsvps.club_id
      and m.membership_status = 'active'
      and m.is_active = true
  )
  and exists (
    select 1
    from public.club_meetings cm
    where cm.id = meeting_rsvps.meeting_id
      and cm.club_id = meeting_rsvps.club_id
      and cm.status = 'scheduled'
  )
);

-- A member may change their own RSVP while the meeting is still scheduled.
drop policy if exists meeting_rsvps_update_self on public.meeting_rsvps;
create policy meeting_rsvps_update_self
on public.meeting_rsvps
for update
using (
  exists (
    select 1
    from public.members m
    where m.id = meeting_rsvps.member_id
      and m.user_id = auth.uid()
      and m.club_id = meeting_rsvps.club_id
      and m.membership_status = 'active'
      and m.is_active = true
  )
)
with check (
  public.is_club_member(club_id)
  and exists (
    select 1
    from public.members m
    where m.id = meeting_rsvps.member_id
      and m.user_id = auth.uid()
      and m.club_id = meeting_rsvps.club_id
      and m.membership_status = 'active'
      and m.is_active = true
  )
  and exists (
    select 1
    from public.club_meetings cm
    where cm.id = meeting_rsvps.meeting_id
      and cm.club_id = meeting_rsvps.club_id
      and cm.status = 'scheduled'
  )
);

-- A member may withdraw (delete) their own RSVP.
drop policy if exists meeting_rsvps_delete_self on public.meeting_rsvps;
create policy meeting_rsvps_delete_self
on public.meeting_rsvps
for delete
to authenticated
using (
  exists (
    select 1
    from public.members m
    where m.id = meeting_rsvps.member_id
      and m.user_id = auth.uid()
      and m.club_id = meeting_rsvps.club_id
      and m.membership_status = 'active'
      and m.is_active = true
  )
);

-- ---------------------------------------------------------------------------
-- Fan-out: notify the meeting organiser when a member RSVPs
-- ---------------------------------------------------------------------------

create or replace function public.on_meeting_rsvp()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _meeting public.club_meetings%rowtype;
  _member_name text;
  _verb text;
begin
  select * into _meeting from public.club_meetings where id = new.meeting_id;
  if _meeting.id is null then
    return new;
  end if;

  -- Don't notify the organiser about their own RSVP, and skip unchanged updates.
  if _meeting.created_by = new.member_id then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.response is not distinct from new.response then
    return new;
  end if;

  select m.name into _member_name from public.members m where m.id = new.member_id;

  _verb := case new.response
    when 'yes' then 'is going to'
    when 'no' then 'can''t make'
    else 'might come to'
  end;

  perform public.notify_member(
    new.club_id,
    _meeting.created_by,
    'meeting_rsvp',
    'New RSVP',
    coalesce(_member_name, 'A member') || ' ' || _verb || ' "' || _meeting.title || '".',
    jsonb_build_object('meetingId', new.meeting_id, 'response', new.response)
  );
  return new;
end;
$$;

drop trigger if exists trg_meeting_rsvp on public.meeting_rsvps;
create trigger trg_meeting_rsvp
after insert or update on public.meeting_rsvps
for each row execute function public.on_meeting_rsvp();

-- ---------------------------------------------------------------------------
-- Poll auto-close
-- ---------------------------------------------------------------------------

-- Closes every open poll whose closes_at has passed. SECURITY DEFINER so the
-- scheduled job (which runs without a club role) can flip the status. Returns
-- the number of polls closed. Safe to run repeatedly / from anywhere.
create or replace function public.close_expired_polls()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  _closed integer;
begin
  with updated as (
    update public.club_polls
    set status = 'closed'
    where status = 'open'
      and closes_at is not null
      and closes_at <= now()
    returning 1
  )
  select count(*) into _closed from updated;
  return _closed;
end;
$$;

revoke all on function public.close_expired_polls() from public;

-- ---------------------------------------------------------------------------
-- Poll results: notify the club when a poll closes
-- ---------------------------------------------------------------------------

-- Fires whenever a poll transitions open -> closed (via close_expired_polls()
-- above OR a manual leadership close), so every member learns the outcome
-- without re-opening the app. Tallies poll_votes to announce the winning
-- option, a tie, or that no votes were cast. SECURITY DEFINER so it can read
-- votes and fan out regardless of who triggered the close.
create or replace function public.on_poll_closed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _total bigint;
  _top_index int;
  _top_votes bigint;
  _is_tie boolean;
  _winner text;
  _body text;
begin
  -- Only when the status actually flips from open to closed.
  if not (old.status = 'open' and new.status = 'closed') then
    return new;
  end if;

  with tally as (
    select option_index, count(*) as votes
    from public.poll_votes
    where poll_id = new.id
    group by option_index
  ),
  ranked as (
    select option_index, votes, rank() over (order by votes desc) as rnk
    from tally
  )
  select
    coalesce((select sum(votes) from tally), 0),
    (select option_index from ranked where rnk = 1 order by option_index limit 1),
    (select votes from ranked where rnk = 1 limit 1),
    (select count(*) > 1 from ranked where rnk = 1)
  into _total, _top_index, _top_votes, _is_tie;

  if _total = 0 then
    _body := 'Poll closed with no votes: "' || new.question || '".';
  elsif _is_tie then
    _body := '"' || new.question || '" closed in a tie ('
      || _total::text || ' vote' || case when _total = 1 then '' else 's' end || ').';
  else
    _winner := new.options ->> _top_index;
    _body := '"' || coalesce(_winner, 'An option') || '" won "' || new.question
      || '" with ' || _top_votes::text || ' of ' || _total::text || ' votes.';
  end if;

  perform public.notify_club_members(
    new.club_id,
    'poll_closed',
    'Poll results',
    _body,
    jsonb_build_object('pollId', new.id)
  );
  return new;
end;
$$;

drop trigger if exists trg_poll_closed on public.club_polls;
create trigger trg_poll_closed
after update on public.club_polls
for each row execute function public.on_poll_closed();

-- Schedule hourly via pg_cron when the extension is available. Hosted Supabase
-- ships pg_cron but it must be enabled (Dashboard → Database → Extensions);
-- guard creation so this migration still applies cleanly where it's absent
-- (local stack / SQL test harness), in which case auto-close is a no-op until
-- enabled. Re-running is idempotent (unschedule before schedule).
do $$
begin
  create extension if not exists pg_cron;
  perform cron.unschedule('close-expired-polls');
exception
  when others then
    null;
end;
$$;

do $$
begin
  perform cron.schedule(
    'close-expired-polls',
    '0 * * * *',
    $cron$select public.close_expired_polls();$cron$
  );
exception
  when others then
    raise notice 'pg_cron unavailable; poll auto-close will be a no-op until enabled';
end;
$$;
