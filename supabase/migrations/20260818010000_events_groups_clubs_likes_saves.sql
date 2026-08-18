-- Same like/save pattern as story_likes/story_saves, extended to Events,
-- Open Group posts, and Club posts.

create table event_likes (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (event_id, user_id)
);

create table event_saves (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (event_id, user_id)
);

create table group_post_likes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references group_posts(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (post_id, user_id)
);

create table group_post_saves (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references group_posts(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (post_id, user_id)
);

create table club_post_likes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references club_posts(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (post_id, user_id)
);

create table club_post_saves (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references club_posts(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (post_id, user_id)
);

alter table event_likes enable row level security;
alter table event_saves enable row level security;
alter table group_post_likes enable row level security;
alter table group_post_saves enable row level security;
alter table club_post_likes enable row level security;
alter table club_post_saves enable row level security;

create policy "read event likes" on event_likes for select using (true);
create policy "insert own event likes" on event_likes for insert with check (user_id = auth.uid());
create policy "delete own event likes" on event_likes for delete using (user_id = auth.uid());

create policy "read event saves" on event_saves for select using (true);
create policy "insert own event saves" on event_saves for insert with check (user_id = auth.uid());
create policy "delete own event saves" on event_saves for delete using (user_id = auth.uid());

create policy "read group post likes" on group_post_likes for select using (true);
create policy "insert own group post likes" on group_post_likes for insert with check (user_id = auth.uid());
create policy "delete own group post likes" on group_post_likes for delete using (user_id = auth.uid());

create policy "read group post saves" on group_post_saves for select using (true);
create policy "insert own group post saves" on group_post_saves for insert with check (user_id = auth.uid());
create policy "delete own group post saves" on group_post_saves for delete using (user_id = auth.uid());

create policy "read club post likes" on club_post_likes for select using (true);
create policy "insert own club post likes" on club_post_likes for insert with check (user_id = auth.uid());
create policy "delete own club post likes" on club_post_likes for delete using (user_id = auth.uid());

create policy "read club post saves" on club_post_saves for select using (true);
create policy "insert own club post saves" on club_post_saves for insert with check (user_id = auth.uid());
create policy "delete own club post saves" on club_post_saves for delete using (user_id = auth.uid());

create index event_likes_event_id_idx on event_likes(event_id);
create index event_saves_user_id_idx on event_saves(user_id);
create index group_post_likes_post_id_idx on group_post_likes(post_id);
create index group_post_saves_user_id_idx on group_post_saves(user_id);
create index club_post_likes_post_id_idx on club_post_likes(post_id);
create index club_post_saves_user_id_idx on club_post_saves(user_id);

notify pgrst, 'reload schema';
