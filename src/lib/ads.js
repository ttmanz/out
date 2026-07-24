import { supabase } from './supabase';

export const getAdsForPage = (page) =>
  supabase
    .from('ads')
    .select('id, image_url, link_url, media_type, position')
    .eq('page', page)
    .eq('active', true)
    .order('position', { ascending: true })
    .limit(2);

// Admin-only: RLS restricts writes to profiles.is_admin = true
export const getAllAds = () =>
  supabase.from('ads').select('*').order('page').order('position');

export const createAd = (payload) =>
  supabase.from('ads').insert(payload);

export const updateAd = (id, payload) =>
  supabase.from('ads').update(payload).eq('id', id);

export const deleteAd = (id) =>
  supabase.from('ads').delete().eq('id', id);
