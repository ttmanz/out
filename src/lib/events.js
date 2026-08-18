import { supabase } from './supabase';

// Only current/upcoming events, same convention as getActivityEvents
export const getEvents = (category) => {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  return supabase
    .from('events')
    .select('id, category, name, venue, event_date, description, photo_url, link_url, link_title, link_image, link_domain, created_at, created_by, event_likes(count)')
    .eq('category', category)
    .eq('active', true)
    .or(`event_date.is.null,event_date.gte.${startOfToday.toISOString()}`)
    .order('event_date', { ascending: true });
};

// created_by is trigger-forced to auth.uid() server-side
export const createEvent = ({ category, name, venue, event_date, description, photo_url = null, link_url = null, link_title = null, link_image = null, link_domain = null }) =>
  supabase
    .from('events')
    .insert({ category, name, venue, event_date, description, photo_url, link_url, link_title, link_image, link_domain, active: true });

export const getEventReplies = (eventId) =>
  supabase
    .from('event_replies')
    .select('*, profiles:user_id(full_name)')
    .eq('event_id', eventId)
    .order('created_at', { ascending: true });

export const createEventReply = (userId, eventId, message) =>
  supabase.from('event_replies').insert({ event_id: eventId, user_id: userId, message });

// Admin-only: RLS restricts this to profiles.is_admin = true
export const adminDeleteEvent = (id) =>
  supabase.from('events').delete().eq('id', id);

export const deleteEvent = (id, userId) =>
  supabase.from('events').delete().eq('id', id).eq('created_by', userId);

export const getMyEventLikes = (userId, eventIds) =>
  supabase.from('event_likes').select('event_id').eq('user_id', userId).in('event_id', eventIds);

export const getMyEventSaves = (userId, eventIds) =>
  supabase.from('event_saves').select('event_id').eq('user_id', userId).in('event_id', eventIds);

export const likeEvent = (eventId, userId) =>
  supabase.from('event_likes').insert({ event_id: eventId, user_id: userId });

export const unlikeEvent = (eventId, userId) =>
  supabase.from('event_likes').delete().eq('event_id', eventId).eq('user_id', userId);

export const saveEvent = (eventId, userId) =>
  supabase.from('event_saves').insert({ event_id: eventId, user_id: userId });

export const unsaveEvent = (eventId, userId) =>
  supabase.from('event_saves').delete().eq('event_id', eventId).eq('user_id', userId);

export const getSavedEvents = async (category, userId) => {
  const { data: saves, error: saveErr } = await supabase
    .from('event_saves')
    .select('event_id')
    .eq('user_id', userId);
  if (saveErr) return { data: [], error: saveErr };
  const ids = (saves ?? []).map((s) => s.event_id);
  if (!ids.length) return { data: [], error: null };
  return supabase
    .from('events')
    .select('id, category, name, venue, event_date, description, photo_url, link_url, link_title, link_image, link_domain, created_at, created_by, event_likes(count)')
    .eq('category', category)
    .in('id', ids)
    .order('event_date', { ascending: true });
};
