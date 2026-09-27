-- Series can wait for a new season ("In attesa"); "on hold" was never used and goes away.
-- Postgres can't drop an enum value: the type is rebuilt with the new list.

-- Nothing should be on hold; if something is, it goes back to "in progress".
update public.user_entries set status = 'in_progress' where status = 'on_hold';

-- The status trigger depends on the column: drop it while the type changes.
drop trigger user_entries_check_status on public.user_entries;

alter type public.entry_status rename to entry_status_old;
create type public.entry_status as enum ('planned', 'in_progress', 'waiting', 'completed', 'dropped');

alter table public.user_entries alter column status drop default;
alter table public.user_entries
  alter column status type public.entry_status using status::text::public.entry_status;
alter table public.user_entries alter column status set default 'planned';

drop type public.entry_status_old;

-- Movies have no "in progress"; only series can wait for a new season.
create or replace function public.check_entry_status_for_media_type()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  item_type public.media_type;
begin
  select media_type into item_type from public.media_items where id = new.media_item_id;

  if (item_type = 'movie' and new.status in ('in_progress', 'waiting'))
    or (item_type = 'book' and new.status = 'waiting') then
    raise exception 'Status % is not allowed for %', new.status, item_type
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger user_entries_check_status
before insert or update of status, media_item_id on public.user_entries
for each row execute function public.check_entry_status_for_media_type();
