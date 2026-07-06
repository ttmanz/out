-- ============================================================================
-- RUN THIS ONCE in Supabase Dashboard → SQL Editor (project mwvtciffmvxjvdphezka)
--
-- It consolidates every migration in supabase/migrations/ dated 2026-07-03
-- onwards, none of which were ever applied to the live database (confirmed by
-- the in-app error "Could not find the function public.whoami"). This is why:
--   • people search in Friends returns nothing (missing execute grant on the
--     search RPC),
--   • posting a Night Out plan fails with a row-level-security error,
--   • Spur / Open Chat / Club feeds fail to load.
--
-- Every statement is idempotent — safe to re-run if it was partially applied.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. Storage buckets + upload policies (20260703000000)
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true), ('post-photos', 'post-photos', true), ('story-media', 'story-media', true)
on conflict (id) do update set public = true;

drop policy if exists "users upload to own folder (avatars)" on storage.objects;
create policy "users upload to own folder (avatars)"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "users update own folder (avatars)" on storage.objects;
create policy "users update own folder (avatars)"
  on storage.objects for update
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "users delete own folder (avatars)" on storage.objects;
create policy "users delete own folder (avatars)"
  on storage.objects for delete
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "users select own folder (avatars)" on storage.objects;
create policy "users select own folder (avatars)"
  on storage.objects for select
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "users upload to own folder (post-photos)" on storage.objects;
create policy "users upload to own folder (post-photos)"
  on storage.objects for insert
  with check (bucket_id = 'post-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "users upload to own folder (story-media)" on storage.objects;
create policy "users upload to own folder (story-media)"
  on storage.objects for insert
  with check (bucket_id = 'story-media' and (storage.foldername(name))[1] = auth.uid()::text);


-- ----------------------------------------------------------------------------
-- 2. Club posts + join-request notifications (20260705000000)
-- ----------------------------------------------------------------------------
create table if not exists club_posts (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references clubs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  text text,
  photo_url text,
  created_at timestamptz not null default now()
);

alter table club_posts enable row level security;

drop policy if exists "approved members read club posts" on club_posts;
create policy "approved members read club posts"
  on club_posts for select
  using (
    exists (
      select 1 from club_members
      where club_members.club_id = club_posts.club_id
        and club_members.user_id = auth.uid()
        and club_members.status = 'approved'
    )
    or exists (
      select 1 from clubs where clubs.id = club_posts.club_id and clubs.admin_id = auth.uid()
    )
  );

create or replace function notify_club_admin_on_join_request()
returns trigger
security definer
set search_path = public
language plpgsql
as $$
begin
  if new.status = 'pending' then
    insert into notifications (user_id, type, actor_id, reference_id, reference_type, reference_text, read, created_at)
    select clubs.admin_id, 'club_join_request', new.user_id, new.club_id, 'club', clubs.name, false, now()
    from clubs
    where clubs.id = new.club_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notify_club_admin_on_join_request on club_members;
create trigger trg_notify_club_admin_on_join_request
  after insert on club_members
  for each row execute function notify_club_admin_on_join_request();


-- ----------------------------------------------------------------------------
-- 3. People search: prefix match + execute grant (20260705010000)
--    FIXES: searching for people in Friends returning nothing
-- ----------------------------------------------------------------------------
create or replace function public.search_visible_users(search_query text, current_user_id uuid)
returns table(id uuid, full_name text, photo_url text, visibility text, allow_friend_requests boolean, interests text[])
language sql
security definer
as $function$
  select p.id, p.full_name, p.photo_url, p.visibility, p.allow_friend_requests, p.interests
  from profiles p
  where p.id != current_user_id
    and p.full_name ilike search_query || '%'
    and (
      p.visibility = 'everyone'
      or (p.visibility = 'friends' and exists (
        select 1 from friendships f
        where f.status = 'accepted'
          and ((f.requester_id = current_user_id and f.addressee_id = p.id)
            or (f.addressee_id = current_user_id and f.requester_id = p.id))
      ))
      or (p.visibility = 'close_friends' and exists (
        select 1 from close_friends cf where cf.user_id = p.id and cf.friend_id = current_user_id
      ))
    )
    and not exists (
      select 1 from member_blocks mb
      where (mb.blocker_id = current_user_id and mb.blocked_id = p.id)
         or (mb.blocker_id = p.id and mb.blocked_id = current_user_id)
    )
  limit 50;
$function$;

grant execute on function public.search_visible_users(text, uuid) to authenticated;


-- ----------------------------------------------------------------------------
-- 4. Split Spur / Open Chat out of happenings (20260706000000)
-- ----------------------------------------------------------------------------
create table if not exists spur_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  venue text,
  photo_url text,
  link_url text,
  link_title text,
  link_image text,
  link_domain text,
  created_at timestamptz not null default now()
);

create table if not exists open_chat_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  venue text,
  photo_url text,
  link_url text,
  link_title text,
  link_image text,
  link_domain text,
  created_at timestamptz not null default now()
);

create table if not exists happening_replies (
  id uuid primary key default gen_random_uuid(),
  happening_id uuid not null references happenings(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  message text not null,
  created_at timestamptz not null default now()
);

create table if not exists open_chat_replies (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references open_chat_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  message text not null,
  created_at timestamptz not null default now()
);

insert into spur_posts (id, user_id, title, venue, photo_url, link_url, link_title, link_image, link_domain, created_at)
select id, user_id, title, venue, photo_url, link_url, link_title, link_image, link_domain, created_at
from happenings where happening_at = 'spur'
on conflict (id) do nothing;

insert into open_chat_posts (id, user_id, title, venue, photo_url, link_url, link_title, link_image, link_domain, created_at)
select id, user_id, title, venue, photo_url, link_url, link_title, link_image, link_domain, created_at
from happenings where happening_at = 'open_chat'
on conflict (id) do nothing;

insert into open_chat_replies (id, post_id, user_id, message, created_at)
select sr.id, sr.spur_id, sr.user_id, sr.message, sr.created_at
from spur_replies sr
where sr.spur_id in (select id from open_chat_posts)
on conflict (id) do nothing;

delete from spur_replies where spur_id in (select id from open_chat_posts);

insert into happening_replies (id, happening_id, user_id, message, created_at)
select sr.id, sr.spur_id, sr.user_id, sr.message, sr.created_at
from spur_replies sr
where sr.spur_id in (select id from happenings where happening_at not in ('spur', 'open_chat'))
on conflict (id) do nothing;

delete from spur_replies where spur_id in (select id from happenings where happening_at not in ('spur', 'open_chat'));

delete from happenings where happening_at in ('spur', 'open_chat');

alter table spur_posts enable row level security;
drop policy if exists "read spur posts" on spur_posts;
create policy "read spur posts" on spur_posts for select using (true);

alter table open_chat_posts enable row level security;
drop policy if exists "read open chat posts" on open_chat_posts;
create policy "read open chat posts" on open_chat_posts for select using (true);

alter table happening_replies enable row level security;
drop policy if exists "read happening replies" on happening_replies;
create policy "read happening replies" on happening_replies for select using (true);

alter table open_chat_replies enable row level security;
drop policy if exists "read open chat replies" on open_chat_replies;
create policy "read open chat replies" on open_chat_replies for select using (true);


-- ----------------------------------------------------------------------------
-- 5. Force owner columns via trigger + relax INSERT policies (20260707000000)
--    FIXES: "new row violates row-level security policy for table night_outs"
-- ----------------------------------------------------------------------------
create or replace function set_owner_to_current_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_ARGV[0] = 'organizer_id' then
    new.organizer_id := auth.uid();
  elsif TG_ARGV[0] = 'user_id' then
    new.user_id := auth.uid();
  end if;
  return new;
end;
$$;

-- night_outs (organizer_id)
drop trigger if exists trg_force_organizer_id on night_outs;
create trigger trg_force_organizer_id
  before insert on night_outs
  for each row execute function set_owner_to_current_user('organizer_id');

drop policy if exists night_out_insert on night_outs;
create policy night_out_insert
  on night_outs for insert
  with check (auth.uid() is not null);

-- spur_posts (user_id)
drop trigger if exists trg_force_user_id on spur_posts;
create trigger trg_force_user_id
  before insert on spur_posts
  for each row execute function set_owner_to_current_user('user_id');

drop policy if exists "insert own spur posts" on spur_posts;
create policy "insert own spur posts"
  on spur_posts for insert
  with check (auth.uid() is not null);

-- open_chat_posts (user_id)
drop trigger if exists trg_force_user_id on open_chat_posts;
create trigger trg_force_user_id
  before insert on open_chat_posts
  for each row execute function set_owner_to_current_user('user_id');

drop policy if exists "insert own open chat posts" on open_chat_posts;
create policy "insert own open chat posts"
  on open_chat_posts for insert
  with check (auth.uid() is not null);

-- club_posts (user_id) — keep the membership/admin check, owner column trigger-forced
drop trigger if exists trg_force_user_id on club_posts;
create trigger trg_force_user_id
  before insert on club_posts
  for each row execute function set_owner_to_current_user('user_id');

drop policy if exists "approved members create club posts" on club_posts;
create policy "approved members create club posts"
  on club_posts for insert
  with check (
    auth.uid() is not null
    and (
      exists (
        select 1 from club_members
        where club_members.club_id = club_posts.club_id
          and club_members.user_id = auth.uid()
          and club_members.status = 'approved'
      )
      or exists (
        select 1 from clubs where clubs.id = club_posts.club_id and clubs.admin_id = auth.uid()
      )
    )
  );

-- happening_replies (user_id)
drop trigger if exists trg_force_user_id on happening_replies;
create trigger trg_force_user_id
  before insert on happening_replies
  for each row execute function set_owner_to_current_user('user_id');

drop policy if exists "insert own happening replies" on happening_replies;
create policy "insert own happening replies"
  on happening_replies for insert
  with check (auth.uid() is not null);

-- open_chat_replies (user_id)
drop trigger if exists trg_force_user_id on open_chat_replies;
create trigger trg_force_user_id
  before insert on open_chat_replies
  for each row execute function set_owner_to_current_user('user_id');

drop policy if exists "insert own open chat replies" on open_chat_replies;
create policy "insert own open chat replies"
  on open_chat_replies for insert
  with check (auth.uid() is not null);


-- ----------------------------------------------------------------------------
-- 6. Re-point user_id FKs at profiles so PostgREST can embed poster names
--    (20260707010000) — FIXES: club/spur/open-chat feeds failing with PGRST200
-- ----------------------------------------------------------------------------
alter table spur_posts drop constraint if exists spur_posts_user_id_fkey;
alter table spur_posts add constraint spur_posts_user_id_fkey
  foreign key (user_id) references profiles(id) on delete cascade;

alter table open_chat_posts drop constraint if exists open_chat_posts_user_id_fkey;
alter table open_chat_posts add constraint open_chat_posts_user_id_fkey
  foreign key (user_id) references profiles(id) on delete cascade;

alter table club_posts drop constraint if exists club_posts_user_id_fkey;
alter table club_posts add constraint club_posts_user_id_fkey
  foreign key (user_id) references profiles(id) on delete cascade;

alter table happening_replies drop constraint if exists happening_replies_user_id_fkey;
alter table happening_replies add constraint happening_replies_user_id_fkey
  foreign key (user_id) references profiles(id) on delete cascade;

alter table open_chat_replies drop constraint if exists open_chat_replies_user_id_fkey;
alter table open_chat_replies add constraint open_chat_replies_user_id_fkey
  foreign key (user_id) references profiles(id) on delete cascade;

-- stories predates the migrations folder — find and re-point whatever its FK is called
do $$
declare
  fk_name text;
begin
  select tc.constraint_name into fk_name
  from information_schema.table_constraints tc
  join information_schema.key_column_usage kcu
    on tc.constraint_name = kcu.constraint_name
   and tc.table_schema = kcu.table_schema
  where tc.table_name = 'stories'
    and tc.constraint_type = 'FOREIGN KEY'
    and kcu.column_name = 'user_id';

  if fk_name is not null then
    execute format('alter table stories drop constraint %I', fk_name);
  end if;

  alter table stories add constraint stories_user_id_fkey
    foreign key (user_id) references profiles(id) on delete cascade;
end $$;


-- ----------------------------------------------------------------------------
-- 7. Allow the Coffee category on top_venues (20260708000000)
--    FIXES: admin can't save Coffee venues / Coffee filter chip empty
-- ----------------------------------------------------------------------------
alter table public.top_venues
  drop constraint if exists top_venues_category_check;

alter table public.top_venues
  add constraint top_venues_category_check
    check (category is null or category in ('eat', 'bars', 'clubs', 'beaches', 'coffee'));


-- ----------------------------------------------------------------------------
-- 8. Cleanup: remove the temporary whoami() debug RPC if it ever existed
-- ----------------------------------------------------------------------------
drop function if exists public.whoami();


-- Make PostgREST pick up all new tables/functions/relationships immediately
notify pgrst, 'reload schema';
