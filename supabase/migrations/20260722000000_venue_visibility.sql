-- Dedicated privacy control for At Venue, separate from the general
-- search-visibility setting (profiles.visibility) — being discoverable in
-- search and being visible on a live "who's near me" map are different
-- concerns. Defaults to 'everyone' to preserve today's behavior for
-- existing users until they explicitly choose to restrict it.
alter table profiles add column if not exists venue_visibility text not null default 'everyone';

alter table profiles drop constraint if exists profiles_venue_visibility_check;
alter table profiles add constraint profiles_venue_visibility_check
  check (venue_visibility in ('invisible', 'friends', 'friends_of_friends', 'everyone'));

notify pgrst, 'reload schema';
