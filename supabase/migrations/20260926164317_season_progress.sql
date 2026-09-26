-- Season-level progress for TV series. It replaces the per-episode table from the spec:
-- the user only tracks whole seasons, and episode_progress was never used (it was empty).
drop table public.episode_progress;

create table public.season_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- Tied to the library entry: removing the title from the library clears its progress.
  entry_id uuid not null references public.user_entries (id) on delete cascade,
  season_number int not null check (season_number >= 1), -- season 0 (specials) is not tracked
  watched_on date not null default current_date,
  created_at timestamptz not null default now(),
  unique (entry_id, season_number)
);

create index season_progress_user_id_idx on public.season_progress (user_id);

alter table public.season_progress enable row level security;

create policy "Users can read their own season progress"
on public.season_progress for select
to authenticated
using ((select auth.uid()) = user_id);

-- The entry must belong to the same user, or anyone could attach rows to others' entries.
create policy "Users can create their own season progress"
on public.season_progress for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.user_entries e
    where e.id = entry_id and e.user_id = (select auth.uid())
  )
);

create policy "Users can update their own season progress"
on public.season_progress for update
to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.user_entries e
    where e.id = entry_id and e.user_id = (select auth.uid())
  )
);

create policy "Users can delete their own season progress"
on public.season_progress for delete
to authenticated
using ((select auth.uid()) = user_id);

-- Data API grants: only what each role needs.
revoke all on table public.season_progress from anon, authenticated;
grant select, insert, update, delete on table public.season_progress to authenticated;
grant all on table public.season_progress to service_role;
