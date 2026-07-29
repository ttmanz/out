-- Add link-preview support to My Story, matching the existing link_url/
-- link_title/link_image/link_domain pattern already used on spur_posts,
-- happenings, open_chat_posts, group_posts, and events.
alter table stories add column if not exists link_url text;
alter table stories add column if not exists link_title text;
alter table stories add column if not exists link_image text;
alter table stories add column if not exists link_domain text;

notify pgrst, 'reload schema';
