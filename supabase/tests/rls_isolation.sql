-- RLS isolation test. Runs in a single transaction and always rolls back,
-- so it leaves no data behind. Any failed check raises an exception.
-- Run it from the Supabase SQL editor (or the Supabase MCP `execute_sql`).

begin;

-- Two throwaway users and one catalog item, created as the table owner.
insert into auth.users (id, aud, role, email)
values
  ('00000000-0000-4000-a000-00000000000a', 'authenticated', 'authenticated', 'rls-a@example.test'),
  ('00000000-0000-4000-a000-00000000000b', 'authenticated', 'authenticated', 'rls-b@example.test');

insert into public.media_items (id, media_type, source, external_id, title)
values
  ('00000000-0000-4000-b000-000000000001', 'tv', 'tmdb', 'rls-test-tv', 'RLS test series'),
  ('00000000-0000-4000-b000-000000000002', 'movie', 'tmdb', 'rls-test-movie', 'RLS test movie');

-- User A: writes their own data.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-a000-00000000000a","role":"authenticated"}', true);

insert into public.user_entries (media_item_id, status)
values ('00000000-0000-4000-b000-000000000001', 'in_progress');

insert into public.episode_progress (media_item_id, season_number, episode_number)
values ('00000000-0000-4000-b000-000000000001', 1, 1);

do $$
begin
  if (select count(*) from public.user_entries) <> 1 then
    raise exception 'FAIL: user A should see exactly 1 entry';
  end if;
  if (select count(*) from public.media_items) <> 2 then
    raise exception 'FAIL: signed-in users should read the whole catalog';
  end if;
end $$;

-- Movies cannot be "in progress".
do $$
begin
  insert into public.user_entries (media_item_id, status)
  values ('00000000-0000-4000-b000-000000000002', 'in_progress');
  raise exception 'FAIL: in_progress accepted for a movie';
exception
  when check_violation then null;
end $$;

-- Catalog is read-only for users.
do $$
begin
  update public.media_items set title = 'hacked';
  raise exception 'FAIL: user updated media_items';
exception
  when insufficient_privilege then null;
end $$;

-- User B: must not see or touch A's data.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-a000-00000000000b","role":"authenticated"}', true);

do $$
declare
  affected int;
begin
  if (select count(*) from public.user_entries) <> 0 then
    raise exception 'FAIL: user B can read user A entries';
  end if;
  if (select count(*) from public.episode_progress) <> 0 then
    raise exception 'FAIL: user B can read user A episode progress';
  end if;

  update public.user_entries set notes = 'hacked';
  get diagnostics affected = row_count;
  if affected <> 0 then
    raise exception 'FAIL: user B updated user A entries';
  end if;

  delete from public.episode_progress;
  get diagnostics affected = row_count;
  if affected <> 0 then
    raise exception 'FAIL: user B deleted user A episode progress';
  end if;
end $$;

-- B cannot insert rows on behalf of A.
do $$
begin
  insert into public.user_entries (user_id, media_item_id)
  values ('00000000-0000-4000-a000-00000000000a', '00000000-0000-4000-b000-000000000002');
  raise exception 'FAIL: user B inserted an entry for user A';
exception
  when insufficient_privilege then null; -- RLS violation (42501)
end $$;

-- Anonymous clients get nothing at all.
reset role;
set local role anon;

do $$
begin
  perform 1 from public.media_items;
  raise exception 'FAIL: anon can read media_items';
exception
  when insufficient_privilege then null;
end $$;

do $$
begin
  perform 1 from public.user_entries;
  raise exception 'FAIL: anon can read user_entries';
exception
  when insufficient_privilege then null;
end $$;

reset role;

select 'RLS isolation: all checks passed' as result;

rollback;
