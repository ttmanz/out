-- Club posts were the one post type in the app with no reply feature at
-- all. Mirrors group_post_replies exactly: same shape, same read/insert-only
-- RLS (no delete — parent post cascade-deletes replies, same as every other
-- reply table).

create table club_post_replies (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references club_posts(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  message text not null,
  created_at timestamptz not null default now()
);

alter table club_post_replies enable row level security;

create policy "read club post replies" on club_post_replies for select using (true);
create policy "insert own club post replies" on club_post_replies for insert with check (user_id = auth.uid());

create index club_post_replies_post_id_idx on club_post_replies(post_id);

notify pgrst, 'reload schema';
