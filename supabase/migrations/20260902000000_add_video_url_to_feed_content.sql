-- "Live" capture: the feed features below were photo-only. Adding video_url so a
-- clip shot from the new Live tab can be stored alongside photo_url. Media is
-- uploaded to the existing public `story-media` bucket (already video-capable).
-- `stories` already has both photo_url and video_url.

alter table public.happenings       add column if not exists video_url text;
alter table public.events           add column if not exists video_url text;
alter table public.activity_events  add column if not exists video_url text;
alter table public.spur_posts       add column if not exists video_url text;
alter table public.market_listings  add column if not exists video_url text;
