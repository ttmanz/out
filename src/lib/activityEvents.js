import { supabase } from './supabase';

export const getActivityEvents = (category) =>
  supabase
    .from('activity_events')
    .select('id, category, name, venue, event_date, description, photo_url')
    .eq('category', category)
    .eq('active', true)
    .order('event_date', { ascending: true });

// Maps an event_date to the nearest WHEN_OPTIONS key for pre-filling the post form.
// Always resolves to one of the 3 reachable Happening buckets — never falls through
// to null, since CreateHappeningScreen's `prefill.when ?? 'today'` would silently
// dump anything unmatched into Today regardless of how far out the event actually is.
// Compares calendar days (not 24h windows), so an event tomorrow morning viewed
// tonight still counts as 'tomorrow'.
export const deriveWhen = (eventDate) => {
  if (!eventDate) return 'thisWeekend';
  const startOfDay = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round(
    (startOfDay(new Date(eventDate)) - startOfDay(new Date())) / (1000 * 60 * 60 * 24)
  );
  if (diffDays <= 0) return 'today';
  if (diffDays === 1) return 'tomorrow';
  return 'thisWeekend';
};
