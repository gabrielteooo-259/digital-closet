-- Run in Supabase SQL Editor (Dashboard → SQL → New query)
-- WARNING: The migration block drops existing cloud data when upgrading from the household model.

-- ── Migration from household model (skip on fresh install if tables don't exist) ──
drop policy if exists "Members can read household photos" on storage.objects;
drop policy if exists "Members can upload household photos" on storage.objects;
drop policy if exists "Members can update household photos" on storage.objects;
drop policy if exists "Members can delete household photos" on storage.objects;

drop policy if exists "Users can read own photos" on storage.objects;
drop policy if exists "Users can upload own photos" on storage.objects;
drop policy if exists "Users can update own photos" on storage.objects;
drop policy if exists "Users can delete own photos" on storage.objects;

drop table if exists public.outfits cascade;
drop table if exists public.outfit_folders cascade;
drop table if exists public.clothing_items cascade;
drop table if exists public.wardrobes cascade;
drop table if exists public.profiles cascade;
drop table if exists public.households cascade;

drop function if exists public.create_household(text);
drop function if exists public.join_household(text);
drop function if exists public.current_household_id();

-- ── Account-scoped schema (one closet per signed-in user) ──

create table if not exists public.wardrobes (
  id text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  primary key (user_id, id)
);

create table if not exists public.clothing_items (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  wardrobe_id text not null,
  photo_id text not null,
  name text not null default '',
  brand text not null default '',
  category text not null,
  season text[] not null default '{}',
  tags text[] not null default '{}',
  color text,
  sort_order bigint not null,
  created_at bigint not null
);

create table if not exists public.outfit_folders (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  created_at bigint not null
);

create table if not exists public.outfits (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  folder_id text not null references public.outfit_folders (id) on delete cascade,
  name text not null,
  item_ids text[] not null default '{}',
  sort_order int not null,
  created_at bigint not null
);

alter table public.wardrobes enable row level security;
alter table public.clothing_items enable row level security;
alter table public.outfit_folders enable row level security;
alter table public.outfits enable row level security;

-- Wardrobes
create policy "Users manage own wardrobes"
  on public.wardrobes for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Clothing items
create policy "Users manage own clothing items"
  on public.clothing_items for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Outfit folders
create policy "Users manage own outfit folders"
  on public.outfit_folders for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Outfits
create policy "Users manage own outfits"
  on public.outfits for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Storage bucket: create in Dashboard → Storage → New bucket named "photos" (public)
-- Photo paths: {user_id}/{photo_id}.webp

create policy "Users can read own photos"
  on storage.objects for select
  using (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can upload own photos"
  on storage.objects for insert
  with check (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can update own photos"
  on storage.objects for update
  using (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete own photos"
  on storage.objects for delete
  using (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
