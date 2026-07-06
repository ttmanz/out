-- The admin Top Venues form offers a Coffee category chip, but the original
-- check constraint predates it — saving a coffee venue fails. Recreate the
-- constraint with the full VENUE_CATEGORIES id list from src/lib/venues.js.
-- The 20260618 add-category migration turned out never to have been applied
-- to the live DB either, so create the column itself here as well.
alter table public.top_venues
  add column if not exists category text;

alter table public.top_venues
  drop constraint if exists top_venues_category_check;

alter table public.top_venues
  add constraint top_venues_category_check
    check (category is null or category in ('eat', 'bars', 'clubs', 'beaches', 'coffee'));
