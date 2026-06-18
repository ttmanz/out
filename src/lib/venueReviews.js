import { supabase } from './supabase';

const REVIEW_FIELDS = 'id, venue_name, body, rating, created_at, user_id, author:profiles!venue_reviews_user_id_fkey(full_name)';

export const getVenueReviews = () =>
  supabase.from('venue_reviews').select(REVIEW_FIELDS).order('created_at', { ascending: false }).limit(100);

export const createVenueReview = (userId, venueName, body, rating) =>
  supabase.from('venue_reviews').insert({ user_id: userId, venue_name: venueName.trim(), body: body.trim(), rating });

export const deleteVenueReview = (id, userId) =>
  supabase.from('venue_reviews').delete().eq('id', id).eq('user_id', userId);
