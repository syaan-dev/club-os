-- Member profile enrichment: avatar photo, location and skills on the member
-- row (so the directory can render them — auth user_metadata is private to the
-- owning user and not readable by other club members), plus a public `avatars`
-- storage bucket with owner-scoped write policies.

-- ---------------------------------------------------------------------------
-- Member directory columns
-- ---------------------------------------------------------------------------
alter table public.members
  add column if not exists avatar_url text;
alter table public.members
  add column if not exists location varchar(255);
alter table public.members
  add column if not exists skills text;

-- ---------------------------------------------------------------------------
-- Avatars storage bucket (public read; images only)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = excluded.public;

-- Anyone may read avatars (public bucket so <Image source={{ uri }}> works).
drop policy if exists "avatars_public_read" on storage.objects;
create policy "avatars_public_read"
  on storage.objects for select
  using (bucket_id = 'avatars');

-- A user may only write/replace/delete files inside a folder named after their
-- own auth uid, e.g. `avatars/<uid>/avatar.jpg`.
drop policy if exists "avatars_owner_insert" on storage.objects;
create policy "avatars_owner_insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_owner_update" on storage.objects;
create policy "avatars_owner_update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_owner_delete" on storage.objects;
create policy "avatars_owner_delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
