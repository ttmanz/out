-- Push notifications: device token storage, a universal push-on-notification-insert
-- trigger, and new/fixed notification sources (messages, post replies, friend posts).
-- ----------------------------------------------------------------------------

-- 1. Device push tokens (multiple per user; upsert-by-token from the client)
create table if not exists push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  token text not null unique,
  platform text not null check (platform in ('ios', 'android')),
  updated_at timestamptz not null default now()
);

alter table push_tokens enable row level security;

create policy "own push tokens" on push_tokens
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- 2. Universal trigger: every notifications insert fires a push via the
--    send-push edge function, mirroring the net.http_post pattern already
--    used by the cleanup-old-posts pg_cron job.
-- ----------------------------------------------------------------------------
create or replace function push_on_notification_insert()
returns trigger
security definer
set search_path = public
language plpgsql
as $$
begin
  perform net.http_post(
    url := 'https://mwvtciffmvxjvdphezka.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13dnRjaWZmbXZ4anZkcGhlemthIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0MzQ2NTIsImV4cCI6MjA5NzAxMDY1Mn0.3v93k36--BMYUxxsN_DKOf4nLFw28XX2FCAtLv55xc0',
      'x-cron-secret', '873105f7842e4a2d9c656b5a1a9536c2b03ceba058b04b84aff9a849dd4fae26'
    ),
    body := jsonb_build_object('notification_id', new.id)
  );
  return new;
end;
$$;

drop trigger if exists trg_push_on_notification_insert on notifications;
create trigger trg_push_on_notification_insert
  after insert on notifications
  for each row execute function push_on_notification_insert();

-- ----------------------------------------------------------------------------
-- 3. Fix notify_on_reply() (was querying `happenings` for a spur_posts id,
--    a leftover from before spur/open_chat were split out of happenings —
--    meant post_owner was always NULL and spur replies never notified)
--    and extend the same shape to every reply table.
-- ----------------------------------------------------------------------------
create or replace function notify_post_owner_of_reply(
  p_owner uuid, p_replier uuid, p_post_id uuid, p_ref_type text, p_excerpt text
) returns void
security definer
set search_path = public
language plpgsql
as $$
begin
  if p_owner is not null and p_owner <> p_replier then
    insert into notifications (user_id, type, actor_id, reference_id, reference_type, reference_text, read, created_at)
    values (p_owner, 'reply', p_replier, p_post_id, p_ref_type, left(p_excerpt, 140), false, now());
  end if;
end;
$$;

-- spur_replies (fixed: now reads from spur_posts, not happenings)
create or replace function notify_on_spur_reply()
returns trigger
security definer
set search_path = public
language plpgsql
as $$
declare v_owner uuid; v_title text;
begin
  select user_id, title into v_owner, v_title from spur_posts where id = new.spur_id;
  perform notify_post_owner_of_reply(v_owner, new.user_id, new.spur_id, 'spur', v_title);
  return new;
end;
$$;

drop trigger if exists on_spur_reply on spur_replies;
create trigger on_spur_reply
  after insert on spur_replies
  for each row execute function notify_on_spur_reply();

-- happening_replies -> happenings
create or replace function notify_on_happening_reply()
returns trigger
security definer
set search_path = public
language plpgsql
as $$
declare v_owner uuid; v_title text;
begin
  select user_id, title into v_owner, v_title from happenings where id = new.happening_id;
  perform notify_post_owner_of_reply(v_owner, new.user_id, new.happening_id, 'happening', v_title);
  return new;
end;
$$;

drop trigger if exists on_happening_reply on happening_replies;
create trigger on_happening_reply
  after insert on happening_replies
  for each row execute function notify_on_happening_reply();

-- open_chat_replies -> open_chat_posts
create or replace function notify_on_open_chat_reply()
returns trigger
security definer
set search_path = public
language plpgsql
as $$
declare v_owner uuid; v_title text;
begin
  select user_id, title into v_owner, v_title from open_chat_posts where id = new.post_id;
  perform notify_post_owner_of_reply(v_owner, new.user_id, new.post_id, 'open_chat', v_title);
  return new;
end;
$$;

drop trigger if exists on_open_chat_reply on open_chat_replies;
create trigger on_open_chat_reply
  after insert on open_chat_replies
  for each row execute function notify_on_open_chat_reply();

-- group_post_replies -> group_posts
create or replace function notify_on_group_post_reply()
returns trigger
security definer
set search_path = public
language plpgsql
as $$
declare v_owner uuid; v_text text;
begin
  select user_id, text into v_owner, v_text from group_posts where id = new.post_id;
  perform notify_post_owner_of_reply(v_owner, new.user_id, new.post_id, 'group_post', v_text);
  return new;
end;
$$;

drop trigger if exists on_group_post_reply on group_post_replies;
create trigger on_group_post_reply
  after insert on group_post_replies
  for each row execute function notify_on_group_post_reply();

-- story_replies -> stories
create or replace function notify_on_story_reply()
returns trigger
security definer
set search_path = public
language plpgsql
as $$
declare v_owner uuid; v_text text;
begin
  select user_id, text into v_owner, v_text from stories where id = new.story_id;
  perform notify_post_owner_of_reply(v_owner, new.user_id, new.story_id, 'story', v_text);
  return new;
end;
$$;

drop trigger if exists on_story_reply on story_replies;
create trigger on_story_reply
  after insert on story_replies
  for each row execute function notify_on_story_reply();

-- market_listing_replies -> market_listings
create or replace function notify_on_market_listing_reply()
returns trigger
security definer
set search_path = public
language plpgsql
as $$
declare v_owner uuid; v_desc text;
begin
  select user_id, description into v_owner, v_desc from market_listings where id = new.listing_id;
  perform notify_post_owner_of_reply(v_owner, new.user_id, new.listing_id, 'market_listing', v_desc);
  return new;
end;
$$;

drop trigger if exists on_market_listing_reply on market_listing_replies;
create trigger on_market_listing_reply
  after insert on market_listing_replies
  for each row execute function notify_on_market_listing_reply();

-- ----------------------------------------------------------------------------
-- 4. New message notifications — every message currently creates none unless
--    it's an admin's first message in the conversation (notify_on_admin_message).
--    Guarded so that specific case doesn't double-fire both triggers.
-- ----------------------------------------------------------------------------
create or replace function notify_on_message()
returns trigger
security definer
set search_path = public
language plpgsql
as $$
declare
  v_recipient uuid;
  v_sender_is_admin boolean;
  v_is_first boolean;
begin
  select case when c.user1_id = new.sender_id then c.user2_id else c.user1_id end
    into v_recipient
  from conversations c where c.id = new.conversation_id;

  select is_admin into v_sender_is_admin from profiles where id = new.sender_id;

  select not exists (
    select 1 from messages m
    where m.conversation_id = new.conversation_id and m.id <> new.id
  ) into v_is_first;

  if v_recipient is not null and not (coalesce(v_sender_is_admin, false) and v_is_first) then
    insert into notifications (user_id, type, actor_id, reference_id, reference_type, reference_text, read, created_at)
    values (v_recipient, 'message', new.sender_id, new.conversation_id, 'conversation', left(new.content, 140), false, now());
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notify_on_message on messages;
create trigger trg_notify_on_message
  after insert on messages
  for each row execute function notify_on_message();

-- ----------------------------------------------------------------------------
-- 5. New posts from friends — scoped to happenings/spur_posts/open_chat_posts
--    only (not group_posts/club_posts, which are membership- not friend-scoped),
--    matching MemberProfileScreen's existing "canonical posts" convention.
-- ----------------------------------------------------------------------------
create or replace function notify_friends_of_new_post(
  p_poster uuid, p_post_id uuid, p_ref_type text, p_title text
) returns void
security definer
set search_path = public
language plpgsql
as $$
begin
  insert into notifications (user_id, type, actor_id, reference_id, reference_type, reference_text, read, created_at)
  select
    case when f.requester_id = p_poster then f.addressee_id else f.requester_id end,
    'new_post', p_poster, p_post_id, p_ref_type, left(p_title, 140), false, now()
  from friendships f
  where f.status = 'accepted'
    and (f.requester_id = p_poster or f.addressee_id = p_poster);
end;
$$;

create or replace function notify_friends_on_happening()
returns trigger
security definer
set search_path = public
language plpgsql
as $$
begin
  perform notify_friends_of_new_post(new.user_id, new.id, 'happening', new.title);
  return new;
end;
$$;

drop trigger if exists trg_notify_friends_on_happening on happenings;
create trigger trg_notify_friends_on_happening
  after insert on happenings
  for each row execute function notify_friends_on_happening();

create or replace function notify_friends_on_spur()
returns trigger
security definer
set search_path = public
language plpgsql
as $$
begin
  perform notify_friends_of_new_post(new.user_id, new.id, 'spur', new.title);
  return new;
end;
$$;

drop trigger if exists trg_notify_friends_on_spur on spur_posts;
create trigger trg_notify_friends_on_spur
  after insert on spur_posts
  for each row execute function notify_friends_on_spur();

create or replace function notify_friends_on_open_chat()
returns trigger
security definer
set search_path = public
language plpgsql
as $$
begin
  perform notify_friends_of_new_post(new.user_id, new.id, 'open_chat', new.title);
  return new;
end;
$$;

drop trigger if exists trg_notify_friends_on_open_chat on open_chat_posts;
create trigger trg_notify_friends_on_open_chat
  after insert on open_chat_posts
  for each row execute function notify_friends_on_open_chat();
