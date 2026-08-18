-- activity_events was the only post table missing link preview support
-- (theaters/movies/concerts/kids under What's Happening -> Nearby), which
-- happenings/spur_posts/open_chat_posts/stories/group_posts/club_posts/
-- events already have.

alter table activity_events
  add column if not exists link_url text,
  add column if not exists link_title text,
  add column if not exists link_image text,
  add column if not exists link_domain text;

notify pgrst, 'reload schema';
