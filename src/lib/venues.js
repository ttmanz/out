import { supabase } from './supabase';

export const logVenueSearch = (userId, venueName) =>
  supabase.from('venue_searches').insert({ user_id: userId, venue_name: venueName.trim() });

export const getRecentVenueSearches = () => {
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  return supabase
    .from('venue_searches')
    .select('venue_name')
    .gte('created_at', cutoff);
};

export const getTopVenues = () =>
  supabase
    .from('top_venues')
    .select('id, name, description, address, rank')
    .order('rank', { ascending: true });

export const fetchNearbyVenues = async (latitude, longitude, radiusMeters = 1500) => {
  const query = `
    [out:json][timeout:15];
    (
      node["amenity"~"^(bar|restaurant|nightclub|cafe|pub|fast_food)$"]["name"]
        (around:${radiusMeters},${latitude},${longitude});
    );
    out 40;
  `;
  const res = await fetch(
    `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`
  );
  const json = await res.json();
  return (json.elements ?? []).map((el) => ({
    id: String(el.id),
    name: el.tags?.name ?? 'Venue',
    latitude: el.lat,
    longitude: el.lon,
    type: el.tags?.amenity ?? 'venue',
  }));
};
