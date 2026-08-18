-- Likes and saves for My Story posts, next to the existing reply feature.
-- Mirrors story_replies' shape (story_id/user_id -> stories/profiles, cascade
-- delete) but adds an owner-scoped delete policy too, since unliking/
-- unsaving is a normal action here (unlike replies, which are permanent).

create table story_likes (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references stories(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (story_id, user_id)
);

create table story_saves (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references stories(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (story_id, user_id)
);

alter table story_likes enable row level security;
alter table story_saves enable row level security;

create policy "read story likes" on story_likes for select using (true);
create policy "insert own story likes" on story_likes for insert with check (user_id = auth.uid());
create policy "delete own story likes" on story_likes for delete using (user_id = auth.uid());

create policy "read story saves" on story_saves for select using (true);
create policy "insert own story saves" on story_saves for insert with check (user_id = auth.uid());
create policy "delete own story saves" on story_saves for delete using (user_id = auth.uid());

create index story_likes_story_id_idx on story_likes(story_id);
create index story_saves_user_id_idx on story_saves(user_id);

notify pgrst, 'reload schema';
