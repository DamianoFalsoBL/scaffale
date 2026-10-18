-- Per-user settings: the streaming services the user subscribes to (catalog slugs from
-- src/lib/catalogs.ts, validated by the app), used to show what can be watched right away.
create table public.user_settings (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  streaming_providers text[] not null default '{}' check (cardinality(streaming_providers) <= 20),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger user_settings_set_updated_at
before update on public.user_settings
for each row execute function public.set_updated_at();

alter table public.user_settings enable row level security;

create policy "Users can read their own settings"
on public.user_settings for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can create their own settings"
on public.user_settings for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their own settings"
on public.user_settings for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

-- "Prossimi": planned titles the user wants to watch or read next, ordered by when they
-- were picked. Only planned titles can be up next.
alter table public.user_entries add column up_next_at timestamptz;

create index user_entries_user_up_next_idx on public.user_entries (user_id, up_next_at)
  where up_next_at is not null;

-- A title that stops being planned (seen, started, dropped...) leaves the queue by itself.
create function public.clear_up_next_when_not_planned()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status <> 'planned' then
    new.up_next_at := null;
  end if;
  return new;
end;
$$;

create trigger user_entries_clear_up_next
before insert or update of status, up_next_at on public.user_entries
for each row execute function public.clear_up_next_when_not_planned();

-- Data API grants: settings are created once and then updated, never deleted by the user.
revoke all on table public.user_settings from anon, authenticated;
grant select, insert, update on table public.user_settings to authenticated;
grant all on table public.user_settings to service_role;

revoke execute on function public.clear_up_next_when_not_planned()
  from public, anon, authenticated;
