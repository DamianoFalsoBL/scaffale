-- Custom lists ("Da vedere con Anna", "Classici di fantascienza"...). A list holds library
-- entries: a title added to a list from outside the library is added to the library first.
create table public.lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  description text check (description is null or char_length(description) <= 280),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One name per user, ignoring case and outer spaces.
create unique index lists_user_name_key on public.lists (user_id, lower(btrim(name)));

create trigger lists_set_updated_at
before update on public.lists
for each row execute function public.set_updated_at();

create table public.list_items (
  list_id uuid not null references public.lists (id) on delete cascade,
  -- Removing a title from the library also removes it from every list.
  entry_id uuid not null references public.user_entries (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (list_id, entry_id)
);

create index list_items_entry_id_idx on public.list_items (entry_id);
create index list_items_user_id_idx on public.list_items (user_id);

alter table public.lists enable row level security;
alter table public.list_items enable row level security;

create policy "Users can read their own lists"
on public.lists for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can create their own lists"
on public.lists for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their own lists"
on public.lists for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete their own lists"
on public.lists for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can read their own list items"
on public.list_items for select
to authenticated
using ((select auth.uid()) = user_id);

-- Both the list and the entry must be the user's own.
create policy "Users can add their entries to their lists"
on public.list_items for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.lists l
    where l.id = list_id and l.user_id = (select auth.uid())
  )
  and exists (
    select 1 from public.user_entries e
    where e.id = entry_id and e.user_id = (select auth.uid())
  )
);

create policy "Users can remove their own list items"
on public.list_items for delete
to authenticated
using ((select auth.uid()) = user_id);

-- Data API grants: only what each role needs (list items are added or removed, never edited).
revoke all on table public.lists, public.list_items from anon, authenticated;
grant select, insert, update, delete on table public.lists to authenticated;
grant select, insert, delete on table public.list_items to authenticated;
grant all on table public.lists, public.list_items to service_role;
