-- Add link-preview support to Club posts, matching the existing link_url/
-- link_title/link_image/link_domain pattern already used on spur_posts,
-- happenings, open_chat_posts, group_posts, events, and stories.
alter table club_posts add column if not exists link_url text;
alter table club_posts add column if not exists link_title text;
alter table club_posts add column if not exists link_image text;
alter table club_posts add column if not exists link_domain text;

notify pgrst, 'reload schema';
