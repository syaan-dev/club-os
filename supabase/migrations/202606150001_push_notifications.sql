-- Club OS push + in-app notifications.
--   (1) notifications: persistent per-member inbox (source of truth for the
--       in-app notification centre AND the payload pushed to devices).
--   (2) device_push_tokens: Expo push tokens registered per auth user/device.
--   (3) Fan-out triggers that create notification rows when meetings/polls/
--       announcements are created or member dues are assigned / go overdue.
--   (4) A dispatch trigger that, when configured, POSTs each new notification
--       to the `send-push` Edge Function via pg_net so Expo can deliver it
--       while the app is backgrounded/closed.
--
-- RLS: a member reads/updates only their OWN notifications; a user manages
-- only their OWN device tokens. Notification rows are written exclusively by
-- the SECURITY DEFINER fan-out functions below (no client INSERT policy).

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  recipient_member_id uuid not null references public.members(id) on delete cascade,
  type varchar(50) not null,
  title varchar(150) not null,
  body text not null,
  data jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_recipient_created
  on public.notifications(recipient_member_id, created_at desc);
create index if not exists idx_notifications_club_created
  on public.notifications(club_id, created_at desc);

create table if not exists public.device_push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null unique,
  platform varchar(10) not null default 'unknown'
    check (platform in ('ios','android','web','unknown')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_device_push_tokens_user on public.device_push_tokens(user_id);

create trigger trg_device_push_tokens_updated_at
before update on public.device_push_tokens
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.notifications enable row level security;
alter table public.device_push_tokens enable row level security;

-- A member reads only the notifications addressed to them.
create policy notifications_select_self
on public.notifications
for select
to authenticated
using (
  exists (
    select 1
    from public.members m
    where m.id = notifications.recipient_member_id
      and m.user_id = auth.uid()
      and m.club_id = notifications.club_id
  )
);

-- A member may mark their own notifications read (the only field they change).
create policy notifications_update_self
on public.notifications
for update
to authenticated
using (
  exists (
    select 1
    from public.members m
    where m.id = notifications.recipient_member_id
      and m.user_id = auth.uid()
      and m.club_id = notifications.club_id
  )
)
with check (
  exists (
    select 1
    from public.members m
    where m.id = notifications.recipient_member_id
      and m.user_id = auth.uid()
      and m.club_id = notifications.club_id
  )
);

-- A user fully manages only their own device tokens.
create policy device_push_tokens_select_self
on public.device_push_tokens
for select
to authenticated
using (user_id = auth.uid());

create policy device_push_tokens_insert_self
on public.device_push_tokens
for insert
to authenticated
with check (user_id = auth.uid());

create policy device_push_tokens_update_self
on public.device_push_tokens
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy device_push_tokens_delete_self
on public.device_push_tokens
for delete
to authenticated
using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Fan-out helpers (SECURITY DEFINER: bypass RLS to write recipient rows)
-- ---------------------------------------------------------------------------

create or replace function public.notify_club_members(
  _club_id uuid,
  _type text,
  _title text,
  _body text,
  _data jsonb default '{}'::jsonb,
  _exclude_member_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (club_id, recipient_member_id, type, title, body, data)
  select _club_id, m.id, _type, _title, _body, coalesce(_data, '{}'::jsonb)
  from public.members m
  where m.club_id = _club_id
    and m.membership_status = 'active'
    and m.is_active = true
    and (_exclude_member_id is null or m.id <> _exclude_member_id);
end;
$$;

create or replace function public.notify_member(
  _club_id uuid,
  _recipient_member_id uuid,
  _type text,
  _title text,
  _body text,
  _data jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if _recipient_member_id is null then
    return;
  end if;
  insert into public.notifications (club_id, recipient_member_id, type, title, body, data)
  values (_club_id, _recipient_member_id, _type, _title, _body, coalesce(_data, '{}'::jsonb));
end;
$$;

-- ---------------------------------------------------------------------------
-- Event triggers -> notification rows
-- ---------------------------------------------------------------------------

create or replace function public.on_meeting_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.notify_club_members(
    new.club_id,
    'meeting_scheduled',
    'New meeting scheduled',
    new.title,
    jsonb_build_object('meetingId', new.id, 'scheduledAt', new.scheduled_at),
    new.created_by
  );
  return new;
end;
$$;

create or replace function public.on_poll_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.notify_club_members(
    new.club_id,
    'poll_created',
    'New poll to vote on',
    new.question,
    jsonb_build_object('pollId', new.id),
    new.created_by
  );
  return new;
end;
$$;

create or replace function public.on_announcement_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.notify_club_members(
    new.club_id,
    'announcement',
    new.title,
    new.body,
    jsonb_build_object('announcementId', new.id),
    new.created_by
  );
  return new;
end;
$$;

create or replace function public.on_member_due_changed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _cycle_label text;
begin
  -- Newly assigned dues.
  if tg_op = 'INSERT' then
    select dc.cycle_label into _cycle_label
    from public.dues_cycles dc where dc.id = new.dues_cycle_id;
    perform public.notify_member(
      new.club_id,
      new.member_id,
      'dues_assigned',
      'Dues assigned',
      'You have new dues of ' || new.amount_due::text
        || coalesce(' for ' || _cycle_label, '') || '.',
      jsonb_build_object('dueId', new.id, 'amountDue', new.amount_due)
    );
    return new;
  end if;

  -- Dues just became overdue.
  if tg_op = 'UPDATE'
     and new.status = 'overdue'
     and old.status is distinct from 'overdue' then
    perform public.notify_member(
      new.club_id,
      new.member_id,
      'dues_overdue',
      'Dues overdue',
      'Your dues of ' || new.amount_due::text || ' are now overdue.',
      jsonb_build_object('dueId', new.id, 'amountDue', new.amount_due)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_meeting_created on public.club_meetings;
create trigger trg_meeting_created
after insert on public.club_meetings
for each row execute function public.on_meeting_created();

drop trigger if exists trg_poll_created on public.club_polls;
create trigger trg_poll_created
after insert on public.club_polls
for each row execute function public.on_poll_created();

drop trigger if exists trg_announcement_created on public.club_announcements;
create trigger trg_announcement_created
after insert on public.club_announcements
for each row execute function public.on_announcement_created();

drop trigger if exists trg_member_due_changed on public.member_dues;
create trigger trg_member_due_changed
after insert or update on public.member_dues
for each row execute function public.on_member_due_changed();

-- ---------------------------------------------------------------------------
-- Push dispatch (notification row -> send-push Edge Function via pg_net)
-- ---------------------------------------------------------------------------
-- pg_net ships with Supabase. Guard creation so environments without it (or
-- the SQL test harness) still apply this migration cleanly; the dispatch
-- trigger then simply no-ops.
do $$
begin
  create extension if not exists pg_net;
exception
  when others then
    raise notice 'pg_net unavailable; push dispatch will be a no-op until installed';
end;
$$;

-- Configure these (once) so the trigger can reach the Edge Function:
--   alter database postgres set app.settings.edge_url = 'https://<ref>.supabase.co';
--   alter database postgres set app.settings.push_webhook_secret = '<PUSH_WEBHOOK_SECRET>';
-- The same secret must be set as the PUSH_WEBHOOK_SECRET env var on the
-- send-push function. When edge_url is unset (local/test), dispatch no-ops.
create or replace function public.dispatch_push_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _edge_url text := current_setting('app.settings.edge_url', true);
  _secret text := current_setting('app.settings.push_webhook_secret', true);
begin
  if _edge_url is null or _edge_url = '' then
    return new; -- dispatch not configured; in-app notification still stored
  end if;

  perform net.http_post(
    url := _edge_url || '/functions/v1/send-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || coalesce(_secret, '')
    ),
    body := jsonb_build_object('record', to_jsonb(new))
  );
  return new;
exception
  when others then
    -- Never let a delivery problem roll back the notification insert.
    return new;
end;
$$;

drop trigger if exists trg_dispatch_push_notification on public.notifications;
create trigger trg_dispatch_push_notification
after insert on public.notifications
for each row execute function public.dispatch_push_notification();
