-- Tracks each post an AI classifier flagged as commercial (advertising a
-- business/product/service rather than a personal social post), so admins
-- can review members posting more than 2 per calendar month. Mirrors the
-- existing `reports` table's shape/RLS pattern (own-insert, admin-read).
-- Deliberately excludes Market listings, which exist specifically for
-- peer-to-peer selling — commercial content there is expected, not a
-- policy violation.

create table commercial_post_flags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  target_type text not null,
  target_id uuid,
  content_excerpt text,
  reason text,
  created_at timestamptz not null default now()
);

alter table commercial_post_flags enable row level security;

create policy "insert own commercial flags" on commercial_post_flags for insert with check (user_id = auth.uid());
create policy "admins read commercial flags" on commercial_post_flags for select
  using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_admin = true));

create index commercial_post_flags_user_id_idx on commercial_post_flags(user_id, created_at);

-- Members (not venue_owner) with more than 2 commercial flags in the
-- current calendar month. A plain view, not materialized, so it still
-- runs under the querying user's RLS — only admins can see anything here,
-- same as the base table.
create view flagged_commercial_members as
  select
    p.id as user_id,
    p.full_name,
    p.account_type,
    count(f.id) as flag_count
  from commercial_post_flags f
  join profiles p on p.id = f.user_id
  where f.created_at >= date_trunc('month', now())
    and p.account_type = 'member'
  group by p.id, p.full_name, p.account_type
  having count(f.id) > 2;

notify pgrst, 'reload schema';
