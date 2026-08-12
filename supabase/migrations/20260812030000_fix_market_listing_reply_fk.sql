-- Same PGRST200 class of bug as story_replies/event_replies (fixed in
-- 20260812010000): market_listing_replies.user_id pointed at auth.users(id)
-- instead of profiles(id), so replies to market listings insert fine but
-- silently fail to read back via the profiles:user_id(...) embed.

alter table market_listing_replies drop constraint market_listing_replies_user_id_fkey;
alter table market_listing_replies add constraint market_listing_replies_user_id_fkey
  foreign key (user_id) references profiles(id) on delete cascade;

notify pgrst, 'reload schema';
