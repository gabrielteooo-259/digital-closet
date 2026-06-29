-- Run this in the Supabase SQL Editor (Dashboard → SQL → New query)

create extension if not exists "pgcrypto";

-- Households (shared closet for you + partner)
create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Our Closet',
  invite_code text unique not null,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  household_id uuid not null references public.households (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.wardrobes (
  id text not null,
  household_id uuid not null references public.households (id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  primary key (household_id, id)
);

create table if not exists public.clothing_items (
  id text primary key,
  household_id uuid not null references public.households (id) on delete cascade,
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
  household_id uuid not null references public.households (id) on delete cascade,
  name text not null,
  created_at bigint not null
);

create table if not exists public.outfits (
  id text primary key,
  household_id uuid not null references public.households (id) on delete cascade,
  folder_id text not null references public.outfit_folders (id) on delete cascade,
  name text not null,
  item_ids text[] not null default '{}',
  sort_order int not null,
  created_at bigint not null
);

alter table public.households enable row level security;
alter table public.profiles enable row level security;
alter table public.wardrobes enable row level security;
alter table public.clothing_items enable row level security;
alter table public.outfit_folders enable row level security;
alter table public.outfits enable row level security;

create or replace function public.current_household_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select household_id from public.profiles where id = auth.uid()
$$;

-- Profiles
create policy "Users can read own profile"
  on public.profiles for select
  using (id = auth.uid());

create policy "Users can update own profile"
  on public.profiles for update
  using (id = auth.uid());

-- Households
create policy "Members can read their household"
  on public.households for select
  using (id = public.current_household_id());

-- Wardrobes
create policy "Members can manage wardrobes"
  on public.wardrobes for all
  using (household_id = public.current_household_id())
  with check (household_id = public.current_household_id());

-- Clothing items
create policy "Members can manage clothing items"
  on public.clothing_items for all
  using (household_id = public.current_household_id())
  with check (household_id = public.current_household_id());

-- Outfit folders
create policy "Members can manage outfit folders"
  on public.outfit_folders for all
  using (household_id = public.current_household_id())
  with check (household_id = public.current_household_id());

-- Outfits
create policy "Members can manage outfits"
  on public.outfits for all
  using (household_id = public.current_household_id())
  with check (household_id = public.current_household_id());

-- Create a new household (sign up flow)
create or replace function public.create_household(household_name text default 'Our Closet')
returns table (household_id uuid, invite_code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
  new_code text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if exists (select 1 from public.profiles where id = auth.uid()) then
    raise exception 'Profile already exists';
  end if;

  new_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

  insert into public.households (name, invite_code)
  values (coalesce(nullif(trim(household_name), ''), 'Our Closet'), new_code)
  returning id, households.invite_code into new_id, new_code;

  insert into public.profiles (id, household_id)
  values (auth.uid(), new_id);

  insert into public.wardrobes (id, household_id, name, sort_order) values
    ('wardrobe-1', new_id, 'Me', 0),
    ('wardrobe-2', new_id, 'Partner', 1);

  return query select new_id, new_code;
end;
$$;

-- Join an existing household with invite code
create or replace function public.join_household(code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_id uuid;
  normalized text := upper(trim(code));
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if exists (select 1 from public.profiles where id = auth.uid()) then
    raise exception 'Profile already exists';
  end if;

  select id into target_id
  from public.households
  where invite_code = normalized;

  if target_id is null then
    raise exception 'Invalid invite code';
  end if;

  insert into public.profiles (id, household_id)
  values (auth.uid(), target_id);

  return target_id;
end;
$$;

grant execute on function public.create_household(text) to authenticated;
grant execute on function public.join_household(text) to authenticated;

-- Storage bucket (create in Dashboard → Storage → New bucket named "photos", set to Public)
-- Then run these policies:

-- insert into storage.buckets (id, name, public) values ('photos', 'photos', true)
-- on conflict do nothing;

create policy "Members can read household photos"
  on storage.objects for select
  using (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = public.current_household_id()::text
  );

create policy "Members can upload household photos"
  on storage.objects for insert
  with check (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = public.current_household_id()::text
  );

create policy "Members can update household photos"
  on storage.objects for update
  using (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = public.current_household_id()::text
  );

create policy "Members can delete household photos"
  on storage.objects for delete
  using (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = public.current_household_id()::text
  );
