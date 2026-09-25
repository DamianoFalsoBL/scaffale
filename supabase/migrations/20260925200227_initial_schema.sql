-- Initial schema: shared media catalog + per-user library and episode progress.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.media_type as enum ('movie', 'tv', 'book');
create type public.media_source as enum ('tmdb', 'google_books', 'open_library');
create type public.entry_status as enum ('planned', 'in_progress', 'completed', 'dropped', 'on_hold');

-- ---------------------------------------------------------------------------
-- Shared helpers
-- ---------------------------------------------------------------------------
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- media_items: shared catalog (minimal snapshot of external metadata)
-- Written only server-side with the secret key; readable by signed-in users.
-- ---------------------------------------------------------------------------
create table public.media_items (
  id uuid primary key default gen_random_uuid(),
  media_type public.media_type not null,
  source public.media_source not null,
  external_id text not null,
  title text not null,
  original_title text,
  year int check (year between 1800 and 2200),
  poster_url text,
  overview text,
  genres text[] not null default '{}',
  isbn13 text check (isbn13 ~ '^\d{13}$'),
  extra jsonb not null default '{}',
  last_synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (source, external_id),
  -- ISBNs only make sense for books.
  check (isbn13 is null or media_type = 'book')
);

-- The same book must not enter the catalog twice from different sources.
create unique index media_items_isbn13_key on public.media_items (isbn13) where isbn13 is not null;
-- Metadata refresh cron picks the stalest rows first.
create index media_items_last_synced_at_idx on public.media_items (last_synced_at);

-- ---------------------------------------------------------------------------
-- user_entries: a user's personal record for a media item
-- ---------------------------------------------------------------------------
create table public.user_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  media_item_id uuid not null references public.media_items (id) on delete cascade,
  status public.entry_status not null default 'planned',
  rating smallint check (rating between 1 and 10), -- shown as 0.5–5 stars
  started_at date,
  finished_at date,
  times_completed int not null default 0 check (times_completed >= 0), -- rewatches / rereads
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, media_item_id),
  check (started_at is null or finished_at is null or finished_at >= started_at)
);

create index user_entries_user_status_idx on public.user_entries (user_id, status);
create index user_entries_user_updated_at_idx on public.user_entries (user_id, updated_at desc);
create index user_entries_media_item_id_idx on public.user_entries (media_item_id);

create trigger user_entries_set_updated_at
before update on public.user_entries
for each row execute function public.set_updated_at();

-- Movies have no "in progress" or "on hold" state.
create function public.check_entry_status_for_media_type()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  item_type public.media_type;
begin
  select media_type into item_type from public.media_items where id = new.media_item_id;

  if item_type = 'movie' and new.status in ('in_progress', 'on_hold') then
    raise exception 'Status % is not allowed for movies', new.status
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger user_entries_check_status
before insert or update of status, media_item_id on public.user_entries
for each row execute function public.check_entry_status_for_media_type();

-- ---------------------------------------------------------------------------
-- episode_progress: watched episodes of a TV series (phase 2 feature)
-- ---------------------------------------------------------------------------
create table public.episode_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  media_item_id uuid not null references public.media_items (id) on delete cascade,
  season_number int not null check (season_number >= 0), -- season 0 = specials on TMDB
  episode_number int not null check (episode_number >= 1),
  watched_at timestamptz not null default now(),
  -- Also serves (user_id, media_item_id) lookups for "next episode".
  unique (user_id, media_item_id, season_number, episode_number)
);

create index episode_progress_media_item_id_idx on public.episode_progress (media_item_id);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.media_items enable row level security;
alter table public.user_entries enable row level security;
alter table public.episode_progress enable row level security;

create policy "Signed-in users can read the catalog"
on public.media_items for select
to authenticated
using (true);

create policy "Users can read their own entries"
on public.user_entries for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can create their own entries"
on public.user_entries for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their own entries"
on public.user_entries for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete their own entries"
on public.user_entries for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can read their own episode progress"
on public.episode_progress for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can create their own episode progress"
on public.episode_progress for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their own episode progress"
on public.episode_progress for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete their own episode progress"
on public.episode_progress for delete
to authenticated
using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- Data API grants
-- Tables are not exposed automatically: grant only what each role needs.
-- ---------------------------------------------------------------------------
revoke all on table public.media_items, public.user_entries, public.episode_progress
  from anon, authenticated;

grant select on table public.media_items to authenticated;
grant select, insert, update, delete on table public.user_entries to authenticated;
grant select, insert, update, delete on table public.episode_progress to authenticated;

grant all on table public.media_items, public.user_entries, public.episode_progress
  to service_role;

revoke execute on function public.set_updated_at(), public.check_entry_status_for_media_type()
  from public, anon, authenticated;
