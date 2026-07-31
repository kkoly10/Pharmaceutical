-- Initial schema for the outfit-matching app.
-- Enum-like values are enforced with check constraints instead of Postgres
-- enum types so the allowed lists stay easy to extend with a plain migration
-- (add a value, no ALTER TYPE ceremony) — but that means the lists below
-- must be kept in sync with lib/outfit-matching/types.ts and lib/outfit-matching/colors.ts
-- by hand. Verify both sides whenever either changes.

create table if not exists closet_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  category text not null check (category in ('top', 'bottom', 'dress', 'outerwear', 'shoes', 'accessory')),
  colors text[] not null check (cardinality(colors) between 1 and 2)
    check (colors <@ array[
      'black','white','gray','navy','beige','brown','cream','denim',
      'red','orange','yellow','green','teal','blue','purple','pink'
    ]::text[]),
  pattern text not null default 'solid' check (pattern in ('solid', 'subtle', 'bold')),
  formality smallint not null check (formality between 1 and 5),
  warmth smallint not null check (warmth between 1 and 3),
  -- Storage object path (e.g. "<user_id>/<uuid>.jpg") in the private
  -- closet-photos bucket, NOT a public URL — resolve with createSignedUrl.
  photo_path text,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists closet_items_user_id_idx on closet_items (user_id, archived);

alter table closet_items enable row level security;

create policy "select own closet items" on closet_items
  for select using (user_id = auth.uid());
create policy "insert own closet items" on closet_items
  for insert with check (user_id = auth.uid());
create policy "update own closet items" on closet_items
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "delete own closet items" on closet_items
  for delete using (user_id = auth.uid());

create table if not exists outfits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  occasion text not null check (occasion in ('work', 'casual', 'date_night', 'formal', 'workout', 'travel')),
  created_at timestamptz not null default now()
);

create index if not exists outfits_user_id_idx on outfits (user_id);

alter table outfits enable row level security;

create policy "select own outfits" on outfits
  for select using (user_id = auth.uid());
create policy "insert own outfits" on outfits
  for insert with check (user_id = auth.uid());
create policy "update own outfits" on outfits
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "delete own outfits" on outfits
  for delete using (user_id = auth.uid());

-- user_id is denormalized onto the two child tables below so their RLS
-- policies can check auth.uid() directly instead of joining back to outfits.
create table if not exists outfit_items (
  outfit_id uuid not null references outfits(id) on delete cascade,
  closet_item_id uuid not null references closet_items(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  primary key (outfit_id, closet_item_id)
);

create index if not exists outfit_items_closet_item_id_idx on outfit_items (closet_item_id);

alter table outfit_items enable row level security;

create policy "select own outfit items" on outfit_items
  for select using (user_id = auth.uid());
create policy "insert own outfit items" on outfit_items
  for insert with check (user_id = auth.uid());
create policy "delete own outfit items" on outfit_items
  for delete using (user_id = auth.uid());

create table if not exists outfit_wears (
  id uuid primary key default gen_random_uuid(),
  outfit_id uuid not null references outfits(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  worn_on date not null default current_date,
  created_at timestamptz not null default now()
);

create index if not exists outfit_wears_user_worn_on_idx on outfit_wears (user_id, worn_on desc);

alter table outfit_wears enable row level security;

create policy "select own outfit wears" on outfit_wears
  for select using (user_id = auth.uid());
create policy "insert own outfit wears" on outfit_wears
  for insert with check (user_id = auth.uid());
create policy "delete own outfit wears" on outfit_wears
  for delete using (user_id = auth.uid());

-- Closet photos: private bucket, one folder per user (storage path is
-- always `<user_id>/<filename>`), enforced by policy below rather than by
-- convention alone.
insert into storage.buckets (id, name, public)
values ('closet-photos', 'closet-photos', false)
on conflict (id) do nothing;

create policy "select own closet photos" on storage.objects
  for select using (
    bucket_id = 'closet-photos' and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "insert own closet photos" on storage.objects
  for insert with check (
    bucket_id = 'closet-photos' and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "update own closet photos" on storage.objects
  for update using (
    bucket_id = 'closet-photos' and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "delete own closet photos" on storage.objects
  for delete using (
    bucket_id = 'closet-photos' and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Marking a suggestion "worn" persists it in one atomic step: create the
-- outfit, link its items, and log the wear. security invoker (the default,
-- stated explicitly here) means this still runs as the calling user, so the
-- table RLS policies above apply to every insert below.
create or replace function mark_outfit_worn(
  p_occasion text,
  p_item_ids uuid[],
  p_worn_on date default current_date
) returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_outfit_id uuid;
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- closet_items has no per-row ownership check at the FK level, so without
  -- this, a caller could link another user's item into their own outfit.
  if exists (
    select 1 from unnest(p_item_ids) as item_id
    where not exists (
      select 1 from closet_items c where c.id = item_id and c.user_id = v_user_id
    )
  ) then
    raise exception 'One or more items do not belong to the current user';
  end if;

  insert into outfits (user_id, occasion) values (v_user_id, p_occasion)
  returning id into v_outfit_id;

  insert into outfit_items (outfit_id, closet_item_id, user_id)
  select v_outfit_id, item_id, v_user_id
  from unnest(p_item_ids) as item_id;

  insert into outfit_wears (outfit_id, user_id, worn_on)
  values (v_outfit_id, v_user_id, p_worn_on);

  return v_outfit_id;
end;
$$;

grant execute on function mark_outfit_worn(text, uuid[], date) to authenticated;
