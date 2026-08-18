-- 20260812000000_push_notifications.sql wired notify_post_owner_of_reply
-- triggers for 6 reply tables (spur, happening, open_chat, group_post,
-- story, market_listing) but missed 3 reply tables that also exist:
-- activity_event_replies, event_replies, and club_post_replies (the last
-- one didn't exist yet at that point, but the other two already did).
-- Post owners on Activity Events, Events, and Club posts have silently
-- never been notified of replies. Same notify_post_owner_of_reply() helper
-- as the other 6, just pointed at the right parent table/columns.

-- activity_event_replies -> activity_events
create or replace function notify_on_activity_event_reply()
returns trigger
security definer
set search_path = public
language plpgsql
as $$
declare v_owner uuid; v_name text;
begin
  select created_by, name into v_owner, v_name from activity_events where id = new.event_id;
  perform notify_post_owner_of_reply(v_owner, new.user_id, new.event_id, 'activity_event', v_name);
  return new;
end;
$$;

drop trigger if exists on_activity_event_reply on activity_event_replies;
create trigger on_activity_event_reply
  after insert on activity_event_replies
  for each row execute function notify_on_activity_event_reply();

-- event_replies -> events
create or replace function notify_on_event_reply()
returns trigger
security definer
set search_path = public
language plpgsql
as $$
declare v_owner uuid; v_name text;
begin
  select created_by, name into v_owner, v_name from events where id = new.event_id;
  perform notify_post_owner_of_reply(v_owner, new.user_id, new.event_id, 'event', v_name);
  return new;
end;
$$;

drop trigger if exists on_event_reply on event_replies;
create trigger on_event_reply
  after insert on event_replies
  for each row execute function notify_on_event_reply();

-- club_post_replies -> club_posts
create or replace function notify_on_club_post_reply()
returns trigger
security definer
set search_path = public
language plpgsql
as $$
declare v_owner uuid; v_text text;
begin
  select user_id, text into v_owner, v_text from club_posts where id = new.post_id;
  perform notify_post_owner_of_reply(v_owner, new.user_id, new.post_id, 'club_post', v_text);
  return new;
end;
$$;

drop trigger if exists on_club_post_reply on club_post_replies;
create trigger on_club_post_reply
  after insert on club_post_replies
  for each row execute function notify_on_club_post_reply();

notify pgrst, 'reload schema';
