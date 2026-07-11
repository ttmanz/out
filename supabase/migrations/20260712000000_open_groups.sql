-- Open Groups: admin-created dynamic groups (e.g. "Single Parents") that any
-- signed-in member can post into, no join/approval step. Follows the same
-- conventions as every other content table this session: FK straight to
-- profiles (not auth.users) so PostgREST can embed it, owner column
-- force-set via the shared set_owner_to_current_user() trigger function.

create table if not exists open_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  photo_url text,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table open_groups enable row level security;

drop policy if exists "read open groups" on open_groups;
create policy "read open groups" on open_groups for select using (true);

drop policy if exists "admins manage open groups" on open_groups;
create policy "admins manage open groups" on open_groups for all
  using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_admin = true))
  with check (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_admin = true));

create table if not exists group_posts (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references open_groups(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  text text,
  photo_url text,
  link_url text,
  link_title text,
  link_image text,
  link_domain text,
  created_at timestamptz not null default now()
);
alter table group_posts enable row level security;

drop policy if exists "read group posts" on group_posts;
create policy "read group posts" on group_posts for select using (true);

drop trigger if exists trg_force_user_id on group_posts;
create trigger trg_force_user_id
  before insert on group_posts
  for each row execute function set_owner_to_current_user('user_id');

drop policy if exists "insert own group posts" on group_posts;
create policy "insert own group posts" on group_posts for insert
  with check (auth.uid() is not null);

create table if not exists group_post_replies (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references group_posts(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  message text not null,
  created_at timestamptz not null default now()
);
alter table group_post_replies enable row level security;

drop policy if exists "read group post replies" on group_post_replies;
create policy "read group post replies" on group_post_replies for select using (true);

drop trigger if exists trg_force_user_id on group_post_replies;
create trigger trg_force_user_id
  before insert on group_post_replies
  for each row execute function set_owner_to_current_user('user_id');

drop policy if exists "insert own group post replies" on group_post_replies;
create policy "insert own group post replies" on group_post_replies for insert
  with check (auth.uid() is not null);

notify pgrst, 'reload schema';
