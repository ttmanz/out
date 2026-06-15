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
