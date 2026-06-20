-- Add a category column to top_venues so the Top Venues list can be filtered
-- by the same categories used on the Where to Go map.
-- Allowed values mirror the VENUE_CATEGORIES ids in src/lib/venues.js
-- ('all' is the unfiltered view, so it is not stored). NULL = uncategorised.
alter table public.top_venues
  add column if not exists category text
    check (category is null or category in ('eat', 'bars', 'clubs', 'beaches'));
