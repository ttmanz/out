-- Add reply/comment capability to Market listings, mirroring story_replies'
-- exact shape and RLS (open read, insert only your own rows).
create table if not exists market_listing_replies (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references market_listings(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  message text not null,
  created_at timestamptz not null default now()
);

alter table market_listing_replies enable row level security;
create policy "read market listing replies" on market_listing_replies for select using (true);
create policy "insert own market listing replies" on market_listing_replies for insert with check (user_id = auth.uid());

notify pgrst, 'reload schema';
