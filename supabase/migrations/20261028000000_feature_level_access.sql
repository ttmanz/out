-- Membership levels now limit FEATURE ACCESS instead of the number of posts per day.
--
-- Each feature (feature_access row) gets a minimum level (min_tier: free / silver / gold /
-- platinum). Under the 'levels' subscription mode a member below that level can't use the
-- feature: the app shows it with a lock, and the database refuses to create content in it
-- (posts, listings, clubs, events, clips, giveaways) so it can't be bypassed by calling the
-- API directly. Admins and staff are never limited. In every other subscription mode
-- (Find-Mee's free / free_until / free_except / free_except_venue / venue_plan) nothing changes.
--
-- The daily post limit is retired: the triggers are removed and every level's limit is cleared.
-- (The old enforce_daily_post_limit() function and daily_post_counts table are left in place,
-- unused, so this is easy to reverse.)

-- 1. Minimum level per feature --------------------------------------------------------

alter table public.feature_access
  add column if not exists min_tier text not null default 'free'
  references public.membership_tiers(tier_key);

-- Clip of the Day had no feature_access row yet (the app treated a missing row as enabled).
insert into public.feature_access (feature_key, label) values ('clip_of_day', 'Clip of the Day')
  on conflict (feature_key) do nothing;

-- Starting matrix (an admin can change it under Admin -> Access Control):
--   free     : Friends, Messages, Where to Go, Venues, At Venue, Open Chat, My Story,
--              What's Happening, Let's Go Now
--   silver   : + The Market, Club Groups, Open Groups
--   gold     : + Events, Clip of the Day, Give Away
--   platinum : everything
update public.feature_access set min_tier = 'silver'
  where feature_key in ('market', 'club_groups', 'open_groups');
update public.feature_access set min_tier = 'gold'
  where feature_key in ('events', 'clip_of_day', 'giveaways');

-- 2. Helpers --------------------------------------------------------------------------

create or replace function public.tier_rank(p_tier text)
returns integer
language sql
stable
security definer
set search_path to 'public'
as $$
  select coalesce((select sort_order from membership_tiers where tier_key = p_tier), 0);
$$;

-- A member's current level: the tier of their active plan, 'free' with no active plan.
-- An active plan with no tier (Find-Mee's original monthly / 6-month / yearly member plans)
-- counts as the top level, so existing paying members never lose access.
create or replace function public.member_tier(p_user uuid)
returns text
language sql
stable
security definer
set search_path to 'public'
as $$
  select coalesce(
    (
      select case
        when sp.tier_key is not null then sp.tier_key
        when sp.audience = 'member' then (select tier_key from membership_tiers order by sort_order desc limit 1)
        else 'free'
      end
      from profiles p
      join subscription_plans sp on sp.id = p.subscription_plan
      where p.id = p_user and p.subscription_expires_at > now()
    ),
    'free'
  );
$$;

-- May this member use this feature? Always true outside 'levels' mode, for admins/staff, and
-- for a feature that has no feature_access row.
create or replace function public.feature_allowed(p_user uuid, p_feature text)
returns boolean
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  v_bypass boolean;
  v_min text;
begin
  if coalesce((select mode from subscription_settings where id = 'global'), 'free') <> 'levels' then
    return true;
  end if;

  select (is_admin or is_staff) into v_bypass from profiles where id = p_user;
  if coalesce(v_bypass, false) then
    return true;
  end if;

  select min_tier into v_min from feature_access where feature_key = p_feature;
  if not found then
    return true;
  end if;

  return tier_rank(member_tier(p_user)) >= tier_rank(v_min);
end;
$$;

revoke all on function public.tier_rank(text), public.member_tier(uuid), public.feature_allowed(uuid, text) from public, anon;
grant execute on function public.tier_rank(text), public.member_tier(uuid), public.feature_allowed(uuid, text) to authenticated;

-- 3. Enforcement on every content-creation table ---------------------------------------

-- TG_ARGV[0] = the column holding the author's user id, TG_ARGV[1] = the feature key.
create or replace function public.enforce_feature_level()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_author uuid;
begin
  v_author := (to_jsonb(new) ->> TG_ARGV[0])::uuid;
  if not feature_allowed(v_author, TG_ARGV[1]) then
    raise exception 'This feature needs the % level or higher',
      (select min_tier from feature_access where feature_key = TG_ARGV[1])
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

-- Retire the daily post limit
drop trigger if exists enforce_post_limit on public.stories;
drop trigger if exists enforce_post_limit on public.happenings;
drop trigger if exists enforce_post_limit on public.spur_posts;
drop trigger if exists enforce_post_limit on public.open_chat_posts;
drop trigger if exists enforce_post_limit on public.club_posts;
drop trigger if exists enforce_post_limit on public.group_posts;
drop trigger if exists enforce_post_limit on public.market_listings;
drop trigger if exists enforce_post_limit on public.daily_clips;
drop trigger if exists enforce_post_limit on public.events;
drop trigger if exists enforce_post_limit on public.activity_events;
update public.membership_tiers set daily_post_limit = null;

-- Attach the level check
drop trigger if exists enforce_feature_level on public.stories;
create trigger enforce_feature_level before insert on public.stories
  for each row execute function public.enforce_feature_level('user_id', 'my_story');
drop trigger if exists enforce_feature_level on public.happenings;
create trigger enforce_feature_level before insert on public.happenings
  for each row execute function public.enforce_feature_level('user_id', 'whats_happening');
drop trigger if exists enforce_feature_level on public.spur_posts;
create trigger enforce_feature_level before insert on public.spur_posts
  for each row execute function public.enforce_feature_level('user_id', 'spur_of_moment');
drop trigger if exists enforce_feature_level on public.open_chat_posts;
create trigger enforce_feature_level before insert on public.open_chat_posts
  for each row execute function public.enforce_feature_level('user_id', 'open_chat');
drop trigger if exists enforce_feature_level on public.club_posts;
create trigger enforce_feature_level before insert on public.club_posts
  for each row execute function public.enforce_feature_level('user_id', 'club_groups');
drop trigger if exists enforce_feature_level on public.clubs;
create trigger enforce_feature_level before insert on public.clubs
  for each row execute function public.enforce_feature_level('admin_id', 'club_groups');
drop trigger if exists enforce_feature_level on public.group_posts;
create trigger enforce_feature_level before insert on public.group_posts
  for each row execute function public.enforce_feature_level('user_id', 'open_groups');
drop trigger if exists enforce_feature_level on public.market_listings;
create trigger enforce_feature_level before insert on public.market_listings
  for each row execute function public.enforce_feature_level('user_id', 'market');
drop trigger if exists enforce_feature_level on public.daily_clips;
create trigger enforce_feature_level before insert on public.daily_clips
  for each row execute function public.enforce_feature_level('user_id', 'clip_of_day');
drop trigger if exists enforce_feature_level on public.events;
create trigger enforce_feature_level before insert on public.events
  for each row execute function public.enforce_feature_level('created_by', 'events');
-- Activities are posted from the What's Happening area in the app.
drop trigger if exists enforce_feature_level on public.activity_events;
create trigger enforce_feature_level before insert on public.activity_events
  for each row execute function public.enforce_feature_level('created_by', 'whats_happening');
drop trigger if exists enforce_feature_level on public.giveaways;
create trigger enforce_feature_level before insert on public.giveaways
  for each row execute function public.enforce_feature_level('created_by', 'giveaways');

notify pgrst, 'reload schema';
