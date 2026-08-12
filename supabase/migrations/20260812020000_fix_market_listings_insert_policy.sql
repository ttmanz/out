-- market_listings_insert required is_staff or a non-expired subscription_expires_at,
-- but subscription_settings.mode is 'free' and feature_access.market.is_paid is
-- false, so the client-side canAccessFeature('market') gate lets every user
-- through — they'd then hit this RLS check and get rejected with a generic
-- "Could not post your listing" error. No other post-creation table (e.g.
-- happenings_insert) has a staff/subscription requirement; this one was out
-- of sync with the rest of the app's free-access model. Match the same
-- auth.uid() = user_id check used everywhere else.

drop policy if exists market_listings_insert on market_listings;
create policy market_listings_insert on market_listings
  for insert to authenticated
  with check (auth.uid() = user_id);
