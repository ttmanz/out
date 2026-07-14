import { supabase } from './supabase';

export const getMarketListings = () =>
  supabase
    .from('market_listings')
    .select('id, description, photo_url, created_at, user_id, profiles(full_name)')
    .order('created_at', { ascending: false });

export const createMarketListing = (userId, description, photoUrl) =>
  supabase
    .from('market_listings')
    .insert({ user_id: userId, description, photo_url: photoUrl ?? null })
    .select()
    .single();

export const deleteMarketListing = (id, userId) =>
  supabase.from('market_listings').delete().eq('id', id).eq('user_id', userId);

// Admin-only: RLS restricts this to profiles.is_admin = true
export const adminDeleteListing = (id) =>
  supabase.from('market_listings').delete().eq('id', id);
