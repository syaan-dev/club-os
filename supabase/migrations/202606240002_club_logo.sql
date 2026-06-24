-- Club logo: a per-club picture shown in the header, club switcher and home
-- list. Stored in the existing public `avatars` storage bucket under the
-- uploader's own uid folder (path `<uid>/club-<clubId>.jpg`), so the existing
-- owner-scoped storage policies already cover writes — only the URL is kept
-- here on the clubs row.
alter table public.clubs
  add column if not exists logo_url text;
