import { supabase } from './supabase';

// Shared venue categories — single source of truth for the Where to Go map and
// the Top Venues list. `types` holds the raw OpenStreetMap amenity/natural values
// that map onto each category; the `all` chip is the unfiltered view.
export const VENUE_CATEGORIES = [
  { id: 'all',     labelKey: 'venues.catAll',     emoji: '✨',  pinColor: '#D4943A', types: [] },
  { id: 'eat',     labelKey: 'venues.catEat',     emoji: '🍽️', pinColor: '#FF8C42', types: ['restaurant', 'cafe', 'fast_food'] },
  { id: 'bars',    labelKey: 'venues.catBars',    emoji: '🍸',  pinColor: '#C47AFF', types: ['bar', 'pub'] },
  { id: 'clubs',   labelKey: 'venues.catClubs',   emoji: '🎶',  pinColor: '#FF4FA8', types: ['nightclub'] },
  { id: 'beaches', labelKey: 'venues.catBeaches', emoji: '🏖️', pinColor: '#00D4E8', types: ['beach', 'beach_resort'] },
  { id: 'coffee',  labelKey: 'venues.catCoffee',  emoji: '☕',  pinColor: '#A0522D', types: ['coffee_shop'] },
];

export const getPinColor = (categoryId) =>
  VENUE_CATEGORIES.find((c) => c.id === categoryId)?.pinColor ?? '#D4943A';

const TYPE_TO_CATEGORY = VENUE_CATEGORIES.reduce((map, cat) => {
  cat.types.forEach((type) => { map[type] = cat.id; });
  return map;
}, {});

// Resolve a raw OSM venue type to one of our category ids (null if uncategorised).
export const categoryOfType = (type) => TYPE_TO_CATEGORY[type] ?? null;

// True when a venue should show under the selected filter chip.
export const matchesCategory = (selectedId, venueCategory) =>
  selectedId === 'all' || selectedId === venueCategory;

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
    .select('id, name, description, address, rank, category')
    .order('rank', { ascending: true });

export const createTopVenue = (payload) =>
  supabase.from('top_venues').insert(payload).select().single();

export const updateTopVenue = (id, payload) =>
  supabase.from('top_venues').update(payload).eq('id', id);

export const deleteTopVenue = (id) =>
  supabase.from('top_venues').delete().eq('id', id);

export const fetchNearbyVenues = async (latitude, longitude, radiusMeters = 1500) => {
  const query = `
    [out:json][timeout:15];
    (
      node["amenity"~"^(bar|restaurant|nightclub|cafe|pub|fast_food)$"]["name"]
        (around:${radiusMeters},${latitude},${longitude});
      node["natural"="beach"]["name"]
        (around:${radiusMeters},${latitude},${longitude});
      node["leisure"="beach_resort"]["name"]
        (around:${radiusMeters},${latitude},${longitude});
    );
    out 60;
  `;
  const res = await fetch(
    `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`
  );
  const json = await res.json();
  return (json.elements ?? []).map((el) => {
    const type = el.tags?.amenity ?? el.tags?.natural ?? el.tags?.leisure ?? 'venue';
    return {
      id: String(el.id),
      name: el.tags?.name ?? 'Venue',
      latitude: el.lat,
      longitude: el.lon,
      type,
      category: categoryOfType(type),
    };
  });
};
