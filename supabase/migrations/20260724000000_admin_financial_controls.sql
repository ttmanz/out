-- Ads table has RLS enabled but had zero policies (predates tracked
-- migrations) — every read/write was silently denied by default, which is
-- part of why the feature looked "gone" even though it's fully wired.
drop policy if exists "read active ads" on ads;
create policy "read active ads" on ads for select using (active = true);

drop policy if exists "admins manage ads" on ads;
create policy "admins manage ads" on ads for all
  using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_admin = true))
  with check (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_admin = true));

-- Global subscription mode: 'free' (everyone has full access, today's
-- behavior), 'free_until' (free for everyone until a date, then falls back
-- to the feature_access paid list below), or 'free_except' (the paid list
-- applies immediately). Single settings row.
create table if not exists subscription_settings (
  id text primary key default 'global',
  mode text not null default 'free' check (mode in ('free', 'free_until', 'free_except')),
  free_until timestamptz,
  updated_at timestamptz not null default now()
);
insert into subscription_settings (id) values ('global') on conflict (id) do nothing;
alter table subscription_settings enable row level security;

create policy "read subscription settings" on subscription_settings for select using (true);
create policy "admins update subscription settings" on subscription_settings for update
  using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_admin = true))
  with check (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_admin = true));

-- Per-feature paid gating. When is_paid, posting there costs one_off_price
-- (e.g. €5 to post one Event) unless the member has an active subscription
-- plan, which always bypasses the per-post fee. stripe_price_id is a
-- placeholder for when Stripe is wired up.
create table if not exists feature_access (
  feature_key text primary key,
  label text not null,
  is_paid boolean not null default false,
  one_off_price numeric(10,2),
  stripe_price_id text,
  updated_at timestamptz not null default now()
);
insert into feature_access (feature_key, label) values
  ('friends', 'Friends'),
  ('my_story', 'My Story'),
  ('whats_happening', 'What''s Happening'),
  ('where_to_go', 'Where to Go'),
  ('spur_of_moment', 'Spur of the Moment'),
  ('open_chat', 'Open Chat'),
  ('at_venue', 'At Venue'),
  ('club_groups', 'Club Groups'),
  ('open_groups', 'Open Groups'),
  ('venue_hub', 'Venues'),
  ('market', 'The Market'),
  ('events', 'Events'),
  ('messages', 'Messages')
on conflict (feature_key) do nothing;
alter table feature_access enable row level security;

create policy "read feature access" on feature_access for select using (true);
create policy "admins update feature access" on feature_access for all
  using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_admin = true))
  with check (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_admin = true));

-- Placeholder for future Stripe linkage on each recurring plan (Monthly/
-- 6-Month/Yearly already exist in subscription_plans).
alter table subscription_plans add column if not exists stripe_price_id text;

notify pgrst, 'reload schema';
