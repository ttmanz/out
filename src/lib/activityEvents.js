import { supabase } from './supabase';

// Only current/upcoming events — a past event would otherwise derive to the
// 'today' bucket when someone taps "I'm Going" on it.
export const getActivityEvents = (category) => {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  return supabase
    .from('activity_events')
    .select('id, category, name, venue, event_date, description, photo_url')
    .eq('category', category)
    .eq('active', true)
    .or(`event_date.is.null,event_date.gte.${startOfToday.toISOString()}`)
    .order('event_date', { ascending: true });
};

// Member-posted event — created_by is trigger-forced to auth.uid() server-side
export const createActivityEvent = ({ category, name, venue, event_date, description, photo_url = null }) =>
  supabase
    .from('activity_events')
    .insert({ category, name, venue, event_date, description, photo_url, active: true });

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
