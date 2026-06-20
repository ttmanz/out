import { supabase } from './supabase';

export const getActivityEvents = (category) =>
  supabase
    .from('activity_events')
    .select('id, category, name, venue, event_date, description, photo_url')
    .eq('category', category)
    .eq('active', true)
    .order('event_date', { ascending: true });

// Maps an event_date to the nearest WHEN_OPTIONS key for pre-filling the post form.
export const deriveWhen = (eventDate) => {
  if (!eventDate) return null;
  const d = new Date(eventDate);
  const now = new Date();
  const diffDays = Math.floor((d - now) / (1000 * 60 * 60 * 24));
  const dow = d.getDay(); // 0 Sun, 6 Sat
  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'tomorrow';
  if (diffDays >= 2 && diffDays <= 7 && (dow === 0 || dow === 6)) return 'thisWeekend';
  return null;
};
