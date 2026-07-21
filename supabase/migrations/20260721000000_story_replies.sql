-- Add reply/comment capability to Stories, mirroring happening_replies'
-- exact shape and RLS (open read, insert only your own rows).
create table if not exists story_replies (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references stories(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  message text not null,
  created_at timestamptz not null default now()
);

alter table story_replies enable row level security;
create policy "read story replies" on story_replies for select using (true);
create policy "insert own story replies" on story_replies for insert with check (user_id = auth.uid());

notify pgrst, 'reload schema';
